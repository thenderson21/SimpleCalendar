export function toLocalISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function deriveType(hasVendor, hasPerformer) {
  if (hasVendor && hasPerformer) return "both";
  if (hasVendor) return "vendor";
  if (hasPerformer) return "performer";
  return "vendor";
}
