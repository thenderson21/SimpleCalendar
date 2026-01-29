import { STORAGE_KEY, BLACKOUT_KEY, SETTINGS_KEY } from "./constants.js";

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

  const dateEntries = [];
  if (date && /\d{4}-\d{2}-\d{2}/.test(date)) {
    dateEntries.push({
      date,
      type,
      statusVendor,
      statusPerformer,
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
    dateEntries.push({
      date: entryDate,
      type: entryType,
      statusVendor: entryStatusVendor,
      statusPerformer: entryStatusPerformer,
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
      .map((item) => normalizeEvent(item))
      .filter(Boolean);
  } catch (error) {
    console.warn("Failed to load events", error);
    return [];
  }
}

export function saveEvents(events) {
  const cleaned = Array.isArray(events)
    ? events.map((event) => ({
        ...event,
        dates: Array.isArray(event?.dates)
          ? event.dates.map(({ color, ...rest }) => rest)
          : [],
      }))
    : [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
}

export function loadBlackouts() {
  try {
    const raw = localStorage.getItem(BLACKOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    if (parsed.length > 0 && typeof parsed[0] === "string") {
      const dates = parsed.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
      return dates.length
        ? [
            {
              id: crypto.randomUUID(),
              title: "Blackouts",
              notes: "",
              dates,
            },
          ]
        : [];
    }
    return parsed
      .map((item) => normalizeBlackoutGroup(item))
      .filter(Boolean);
  } catch (error) {
    console.warn("Failed to load blackouts", error);
    return [];
  }
}

export function saveBlackouts(blackouts) {
  const cleaned = Array.isArray(blackouts)
    ? blackouts
        .map((group) => normalizeBlackoutGroup(group))
        .filter(Boolean)
    : [];
  localStorage.setItem(BLACKOUT_KEY, JSON.stringify(cleaned));
}

export function normalizeBlackoutGroup(input) {
  if (!input || typeof input !== "object") return null;
  const title = String(input.title || "").trim();
  const notes = String(input.notes || "").trim();
  const dates = Array.isArray(input.dates) ? input.dates : [];
  const cleanedDates = dates
    .map((date) => String(date).slice(0, 10))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
  if (cleanedDates.length === 0) return null;
  return {
    id: input.id || crypto.randomUUID(),
    title,
    notes,
    dates: Array.from(new Set(cleanedDates)).sort(),
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("Failed to load settings", error);
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
