#!/usr/bin/env bash
# Usage: scripts/publish-all.sh [--no-open-transporter]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_CSPROJ="$ROOT_DIR/MauiApp/SimpleEventsCalenderApp.csproj"
TVOS_PLIST="$ROOT_DIR/SimpleEventsCalenderTvOS/Info.plist"
MAC_INSTALLER_CERT="${MAC_INSTALLER_CERT:-3rd Party Mac Developer Installer: Todd Henderson (Y374749ARM)}"
OPEN_TRANSPORTER=true

for arg in "$@"; do
  case "$arg" in
    --no-open-transporter)
      OPEN_TRANSPORTER=false
      ;;
  esac
done

read_csproj_value() {
  python3 - "$APP_CSPROJ" "$1" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
tag = sys.argv[2]
text = path.read_text(encoding='utf-8')
match = re.search(rf"<{tag}>(.*?)</{tag}>", text)
if not match:
    raise SystemExit(f"Missing <{tag}> in {path}")
print(match.group(1).strip())
PY
}

read_plist_value() {
  python3 - "$TVOS_PLIST" "$1" <<'PY'
import plistlib
import sys
from pathlib import Path

path = Path(sys.argv[1])
key = sys.argv[2]
with path.open('rb') as f:
    data = plistlib.load(f)
value = data.get(key)
if value is None:
    raise SystemExit(f"Missing {key} in {path}")
print(value)
PY
}

bump_version() {
  python3 - "$1" <<'PY'
import sys
value = sys.argv[1]
parts = value.split('.')
if not all(p.isdigit() for p in parts):
    raise SystemExit(f"Build number must be numeric or dot-delimited: {value}")
parts[-1] = str(int(parts[-1]) + 1)
print('.'.join(parts))
PY
}

replace_csproj_value() {
  python3 - "$APP_CSPROJ" "$1" "$2" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
tag = sys.argv[2]
value = sys.argv[3]
text = path.read_text(encoding='utf-8')
pattern = rf"(<{tag}>)(.*?)(</{tag}>)"
new_text, count = re.subn(pattern, rf"\\1{value}\\3", text)
if count != 1:
    raise SystemExit(f"Expected single <{tag}> in {path}, found {count}")
path.write_text(new_text, encoding='utf-8')
PY
}

DISPLAY_VERSION="$(read_csproj_value ApplicationDisplayVersion)"
BUILD_VERSION="$(read_csproj_value ApplicationVersion)"
TVOS_SHORT_VERSION="$(read_plist_value CFBundleShortVersionString)"

if [[ "$DISPLAY_VERSION" != "$TVOS_SHORT_VERSION" ]]; then
  echo "Warning: App version ($DISPLAY_VERSION) and tvOS short version ($TVOS_SHORT_VERSION) differ." >&2
fi

RELEASE_DIR="$ROOT_DIR/releases/${DISPLAY_VERSION}-${BUILD_VERSION}"
mkdir -p "$RELEASE_DIR"

echo "Publishing Android..."
dotnet publish "$APP_CSPROJ" -c Release -f net10.0-android -o "$RELEASE_DIR/android"

echo "Publishing iOS..."
dotnet publish "$APP_CSPROJ" -c Release -f net10.0-ios -o "$RELEASE_DIR/ios"

echo "Publishing Mac Catalyst..."
dotnet publish "$APP_CSPROJ" -c Release -f net10.0-maccatalyst -o "$RELEASE_DIR/maccatalyst"

MAC_PKG="$(ls "$RELEASE_DIR/maccatalyst"/*.pkg 2>/dev/null | head -n 1 || true)"
if [[ -n "$MAC_PKG" ]]; then
  if ! command -v productsign >/dev/null 2>&1; then
    echo "productsign not found; cannot sign Mac Catalyst package." >&2
    exit 1
  fi

  SIGNED_PKG="$MAC_PKG.signed"
  echo "Signing Mac Catalyst package with: $MAC_INSTALLER_CERT"
  productsign --sign "$MAC_INSTALLER_CERT" "$MAC_PKG" "$SIGNED_PKG"
  mv -f "$SIGNED_PKG" "$MAC_PKG"
fi

echo "Publishing tvOS..."
dotnet publish "$ROOT_DIR/SimpleEventsCalenderTvOS/SimpleEventsCalenderTvOS.csproj" -c Release -f net10.0-tvos -o "$RELEASE_DIR/tvos"

NEXT_BUILD="$(bump_version "$BUILD_VERSION")"

#replace_csproj_value ApplicationVersion "$NEXT_BUILD"
#replace_plist_value CFBundleVersion "$NEXT_BUILD"

echo "Published to $RELEASE_DIR"
#echo "Bumped build number to $NEXT_BUILD"

if [[ "$OPEN_TRANSPORTER" == "true" ]]; then
  if ! command -v open >/dev/null 2>&1; then
    echo "open not found; cannot launch Transporter." >&2
    exit 1
  fi

  if ! open -Ra "Transporter" >/dev/null 2>&1; then
    echo "Transporter app not found; skipping open." >&2
    exit 1
  fi

  UPLOAD_FILES=()
  while IFS= read -r file; do
    UPLOAD_FILES+=("$file")
  done < <(find "$RELEASE_DIR" -type f \( -name "*.ipa" -o -name "*.pkg" \) | sort)

  if [[ "${#UPLOAD_FILES[@]}" -eq 0 ]]; then
    echo "No .ipa or .pkg files found for Transporter." >&2
    exit 1
  fi

  echo "Opening Transporter with:"
  for file in "${UPLOAD_FILES[@]}"; do
    echo "  - $file"
  done

  open -a "Transporter" "${UPLOAD_FILES[@]}"
fi
