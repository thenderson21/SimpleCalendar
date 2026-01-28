import { STORAGE_KEY, BLACKOUT_KEY } from "./constants.js";

export function normalizeEvent(input) {
  if (!input || typeof input !== "object") return null;
  const title = String(input.title || "Untitled").trim();
  const date = input.date ? String(input.date).slice(0, 10) : null;
  const dates = Array.isArray(input.dates) ? input.dates : [];
  const type = ["vendor", "performer", "both"].includes(input.type)
    ? input.type
    : input.type === "none"
      ? "vendor"
      : "vendor";
  const statusOptions = [
    "contacted",
    "submitted",
    "pending",
    "confirmed",
    "rejected",
  ];
  const fallbackStatus = statusOptions.includes(input.status)
    ? input.status
    : "pending";
  const statusVendor = statusOptions.includes(input.statusVendor)
    ? input.statusVendor
    : fallbackStatus;
  const statusPerformer = statusOptions.includes(input.statusPerformer)
    ? input.statusPerformer
    : fallbackStatus;
  const color = typeof input.color === "string" ? input.color : "";

  const dateEntries = [];
  if (date && /\d{4}-\d{2}-\d{2}/.test(date)) {
    dateEntries.push({
      date,
      type,
      statusVendor,
      statusPerformer,
      color,
    });
  }

  dates.forEach((entry) => {
    const entryDate = String(entry?.date || "").slice(0, 10);
    if (!/\d{4}-\d{2}-\d{2}/.test(entryDate)) return;
    const entryType = ["vendor", "performer", "both"].includes(entry.type)
      ? entry.type
      : "vendor";
    const entryFallback = statusOptions.includes(entry.status)
      ? entry.status
      : "pending";
    const entryStatusVendor = statusOptions.includes(entry.statusVendor)
      ? entry.statusVendor
      : entryFallback;
    const entryStatusPerformer = statusOptions.includes(entry.statusPerformer)
      ? entry.statusPerformer
      : entryFallback;
    const entryColor = typeof entry.color === "string" ? entry.color : color;

    dateEntries.push({
      date: entryDate,
      type: entryType,
      statusVendor: entryStatusVendor,
      statusPerformer: entryStatusPerformer,
      color: entryColor,
    });
  });

  if (dateEntries.length === 0) return null;

  return {
    id: input.id || crypto.randomUUID(),
    title,
    dates: dateEntries,
  };
}

export function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (Array.isArray(item?.dates)) return item;
        return normalizeEvent(item);
      })
      .filter(Boolean);
  } catch (error) {
    console.warn("Failed to load events", error);
    return [];
  }
}

export function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function loadBlackouts() {
  try {
    const raw = localStorage.getItem(BLACKOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to load blackouts", error);
    return [];
  }
}

export function saveBlackouts(blackouts) {
  localStorage.setItem(BLACKOUT_KEY, JSON.stringify(blackouts));
}
