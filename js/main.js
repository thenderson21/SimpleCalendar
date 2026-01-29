import { weekdayLabels, monthLabels } from "./constants.js";
import { toLocalISO, deriveType } from "./dateUtils.js";
import {
  loadEvents,
  saveEvents,
  normalizeEvent,
  loadBlackouts,
  saveBlackouts,
  normalizeBlackoutGroup,
  loadSettings,
  saveSettings,
} from "./storage.js";

const calendarEl = document.getElementById("calendar");
const yearLabel = document.getElementById("yearLabel");
const prevYearBtn = document.getElementById("prevYear");
const nextYearBtn = document.getElementById("nextYear");
const todayBtn = document.getElementById("todayBtn");
const eventForm = document.getElementById("eventForm");
const addBtn = document.getElementById("addBtn");
const eventModal = document.getElementById("eventModal");
const closeModal = document.getElementById("closeModal");
const eventIdInput = document.getElementById("eventId");
const dateInput = document.getElementById("dateInput");
const multiDateGrid = document.getElementById("multiDateGrid");
const monthLabel = document.getElementById("monthLabel");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const selectedDatesLabel = document.getElementById("selectedDatesLabel");
const clearDatesBtn = document.getElementById("clearDates");
const titleInput = document.getElementById("titleInput");
const vendorCheck = document.getElementById("vendorCheck");
const performerCheck = document.getElementById("performerCheck");
const statusVendorInput = document.getElementById("statusVendorInput");
const statusPerformerInput = document.getElementById("statusPerformerInput");
const deleteEventBtn = document.getElementById("deleteEvent");
const importInput = document.getElementById("importInput");
const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const exportBox = document.getElementById("exportBox");
const exportText = document.getElementById("exportText");
const copyExportBtn = document.getElementById("copyExport");
const openImportModalBtn = document.getElementById("openImportModal");
const importModal = document.getElementById("importModal");
const closeImportModal = document.getElementById("closeImportModal");
const createModal = document.getElementById("createModal");
const closeCreateModal = document.getElementById("closeCreateModal");
const createEventBtn = document.getElementById("createEvent");
const createBlackoutBtn = document.getElementById("createBlackout");
const blackoutModal = document.getElementById("blackoutModal");
const closeBlackoutModal = document.getElementById("closeBlackoutModal");
const blackoutPrevMonthBtn = document.getElementById("blackoutPrevMonth");
const blackoutNextMonthBtn = document.getElementById("blackoutNextMonth");
const blackoutMonthLabel = document.getElementById("blackoutMonthLabel");
const blackoutDateGrid = document.getElementById("blackoutDateGrid");
const blackoutSelectedLabel = document.getElementById("blackoutSelectedLabel");
const blackoutClearDatesBtn = document.getElementById("blackoutClearDates");
const blackoutTitleInput = document.getElementById("blackoutTitleInput");
const blackoutNotesInput = document.getElementById("blackoutNotesInput");
const confirmBlackoutBtn = document.getElementById("confirmBlackout");
const dayModal = document.getElementById("dayModal");
const closeDayModal = document.getElementById("closeDayModal");
const dayModalTitle = document.getElementById("dayModalTitle");
const dayModalIso = document.getElementById("dayModalIso");
const dayEventList = document.getElementById("dayEventList");
const toggleBlackoutBtn = document.getElementById("toggleBlackout");
const blackoutPickModal = document.getElementById("blackoutPickModal");
const blackoutPickList = document.getElementById("blackoutPickList");
const closeBlackoutPick = document.getElementById("closeBlackoutPick");
const createNewBlackoutGroupBtn = document.getElementById("createNewBlackoutGroup");
const openSettingsBtn = document.getElementById("openSettings");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsModal = document.getElementById("closeSettingsModal");
const vendorLabelInput = document.getElementById("vendorLabelInput");
const vendorColorInput = document.getElementById("vendorColorInput");
const vendorColorText = document.getElementById("vendorColorText");
const performerLabelInput = document.getElementById("performerLabelInput");
const performerColorInput = document.getElementById("performerColorInput");
const performerColorText = document.getElementById("performerColorText");
const saveSettingsBtn = document.getElementById("saveSettings");

const isHybrid = Boolean(window?.HybridWebView?.InvokeDotNet);

function isDesktopUserAgent() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return /Macintosh|MacIntel|MacPPC|Mac68K/.test(ua) || /Mac/.test(platform);
}

function applyDesktopIdiom(isDesktop, idiomValue = "") {
  document.body?.setAttribute("data-idiom", idiomValue);
  if (!openSettingsBtn) return;
  if (isDesktop) {
    openSettingsBtn.classList.add("hidden");
  } else {
    openSettingsBtn.classList.remove("hidden");
  }
}

if (isHybrid) {
  importInput?.classList.add("hidden");
  if (importBtn) {
    importBtn.textContent = "Choose JSON file";
  }
  window.HybridWebView.InvokeDotNet("GetDeviceIdiom")
    .then((idiom) => {
      const idiomValue = String(idiom).toLowerCase();
      const isDesktop = idiomValue.includes("desktop");
      applyDesktopIdiom(isDesktop, idiomValue);
    })
    .catch(() => {
      const isDesktop = isDesktopUserAgent();
      if (isDesktop) {
        applyDesktopIdiom(true, "desktop");
      }
    });
}

let currentYear = new Date().getFullYear();
let selectedDate = null;
let events = loadEvents();
let blackouts = loadBlackouts();
let settings = loadSettings();
let pickerYear = new Date().getFullYear();
let pickerMonth = new Date().getMonth();
let selectedDates = new Set();
let blackoutPickerYear = new Date().getFullYear();
let blackoutPickerMonth = new Date().getMonth();
let blackoutSelectedDates = new Set();
let editingBlackoutId = null;
let pendingBlackoutDate = null;

applySettings();


function renderAll() {
  renderCalendar();
  renderDayPanel();
}

function applySettings() {
  const vendorLabel = getVendorLabel();
  const performerLabel = getPerformerLabel();
  const vendorColor = getVendorColor();
  const performerColor = getPerformerColor();
  const vendorLabelEls = document.querySelectorAll("[data-label='vendor']");
  const performerLabelEls = document.querySelectorAll("[data-label='performer']");
  vendorLabelEls.forEach((el) => (el.textContent = vendorLabel));
  performerLabelEls.forEach((el) => (el.textContent = performerLabel));
  document.documentElement.style.setProperty("--vendor", vendorColor);
  document.documentElement.style.setProperty("--performer", performerColor);
  const bothColor = blendColors(vendorColor, performerColor);
  document.documentElement.style.setProperty("--both", bothColor);
}

function getVendorLabel() {
  return settings.vendorLabel || "Vendor";
}

function getPerformerLabel() {
  return settings.performerLabel || "Performer";
}

function getVendorColor() {
  return settings.vendorColor || "#2b8cff";
}

function getPerformerColor() {
  return settings.performerColor || "#ff6a88";
}

function normalizeSettings(input) {
  if (!input || typeof input !== "object") return {};
  return {
    vendorLabel: String(input.vendorLabel || "").trim() || "Vendor",
    performerLabel: String(input.performerLabel || "").trim() || "Performer",
    vendorColor: typeof input.vendorColor === "string" ? input.vendorColor : "#2b8cff",
    performerColor:
      typeof input.performerColor === "string" ? input.performerColor : "#ff6a88",
  };
}

function blendColors(a, b) {
  const toRgb = (hex) => {
    const cleaned = hex.replace("#", "");
    if (cleaned.length !== 6) return [0, 0, 0];
    return [
      parseInt(cleaned.slice(0, 2), 16),
      parseInt(cleaned.slice(2, 4), 16),
      parseInt(cleaned.slice(4, 6), 16),
    ];
  };
  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);
  const mix = (x, y) => Math.round((x + y) / 2);
  return `#${[mix(ar, br), mix(ag, bg), mix(ab, bb)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

function cloneEvents() {
  return JSON.parse(JSON.stringify(events));
}


function dateEntriesByDate() {
  return events.reduce((acc, event) => {
    event.dates.forEach((entry) => {
      acc[entry.date] ||= [];
      acc[entry.date].push({ event, entry });
    });
    return acc;
  }, {});
}

function setPickerMonth(dateString) {
  const [year, month] = String(dateString).split("-");
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (!parsedYear || !parsedMonth) return;
  pickerYear = parsedYear;
  pickerMonth = parsedMonth - 1;
}

function updateSelectedDatesLabel() {
  if (!selectedDatesLabel) return;
  if (selectedDates.size === 0) {
    selectedDatesLabel.textContent = "No dates selected";
    return;
  }
  const sorted = Array.from(selectedDates).sort();
  selectedDatesLabel.textContent = `${sorted.length} date${
    sorted.length === 1 ? "" : "s"
  } selected`;
}

function setSelectedDates(dates) {
  selectedDates = new Set(dates);
  updateSelectedDatesLabel();
  renderMultiDatePicker();
}

function toggleDateSelection(dateString) {
  if (selectedDates.has(dateString)) {
    selectedDates.delete(dateString);
  } else {
    selectedDates.add(dateString);
  }
  updateSelectedDatesLabel();
  renderMultiDatePicker();
}

function getBlackoutDateSet() {
  const set = new Set();
  blackouts.forEach((group) => {
    group.dates.forEach((date) => set.add(date));
  });
  return set;
}

function getBlackoutGroupsForDate(date) {
  return blackouts.filter((group) => group.dates.includes(date));
}

function setBlackoutPickerMonth(dateString) {
  const [year, month] = String(dateString).split("-");
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (!parsedYear || !parsedMonth) return;
  blackoutPickerYear = parsedYear;
  blackoutPickerMonth = parsedMonth - 1;
}

function updateBlackoutSelectedLabel() {
  if (!blackoutSelectedLabel) return;
  if (blackoutSelectedDates.size === 0) {
    blackoutSelectedLabel.textContent = "No dates selected";
    return;
  }
  const sorted = Array.from(blackoutSelectedDates).sort();
  blackoutSelectedLabel.textContent = `${sorted.length} date${
    sorted.length === 1 ? "" : "s"
  } selected`;
}

function setBlackoutSelectedDates(dates) {
  blackoutSelectedDates = new Set(dates);
  updateBlackoutSelectedLabel();
  renderBlackoutDatePicker();
}

function toggleBlackoutDateSelection(dateString) {
  if (blackoutSelectedDates.has(dateString)) {
    blackoutSelectedDates.delete(dateString);
  } else {
    blackoutSelectedDates.add(dateString);
  }
  updateBlackoutSelectedLabel();
  renderBlackoutDatePicker();
}

function renderMultiDatePicker() {
  if (!multiDateGrid || !monthLabel) return;
  multiDateGrid.innerHTML = "";
  const firstDay = new Date(pickerYear, pickerMonth, 1);
  const totalDays = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const offset = firstDay.getDay();
  const blackoutSet = getBlackoutDateSet();

  monthLabel.textContent = `${monthLabels[pickerMonth]} ${pickerYear}`;

  for (let i = 0; i < offset; i += 1) {
    const filler = document.createElement("div");
    filler.className = "multi-date__day outside";
    multiDateGrid.appendChild(filler);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(pickerYear, pickerMonth, day);
    const iso = toLocalISO(date);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "multi-date__day";
    cell.textContent = day;
    if (blackoutSet.has(iso)) {
      cell.classList.add("blackout");
    }
    if (selectedDates.has(iso)) {
      cell.classList.add("selected");
    }
    cell.addEventListener("click", () => toggleDateSelection(iso));
    multiDateGrid.appendChild(cell);
  }
}

function renderBlackoutDatePicker() {
  if (!blackoutDateGrid || !blackoutMonthLabel) return;
  blackoutDateGrid.innerHTML = "";
  const firstDay = new Date(blackoutPickerYear, blackoutPickerMonth, 1);
  const totalDays = new Date(blackoutPickerYear, blackoutPickerMonth + 1, 0).getDate();
  const offset = firstDay.getDay();

  blackoutMonthLabel.textContent = `${monthLabels[blackoutPickerMonth]} ${blackoutPickerYear}`;

  for (let i = 0; i < offset; i += 1) {
    const filler = document.createElement("div");
    filler.className = "multi-date__day outside";
    blackoutDateGrid.appendChild(filler);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(blackoutPickerYear, blackoutPickerMonth, day);
    const iso = toLocalISO(date);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "multi-date__day";
    cell.textContent = day;
    if (blackoutSelectedDates.has(iso)) {
      cell.classList.add("selected");
    }
    cell.addEventListener("click", () => toggleBlackoutDateSelection(iso));
    blackoutDateGrid.appendChild(cell);
  }
}

function markerStyleForEntry(entry) {
  if (!entry) return null;

  const hasVendor = entry.type === "vendor" || entry.type === "both";
  const hasPerformer = entry.type === "performer" || entry.type === "both";
  if (!hasVendor && !hasPerformer) return null;

  const vendorPending = entry.statusVendor !== "confirmed";
  const performerPending = entry.statusPerformer !== "confirmed";

  const vendorColor = "var(--vendor)";
  const performerColor = "var(--performer)";
  const pendingColor = "var(--pending)";

  let topLeft = vendorColor;
  let topRight = performerColor;
  let bottomLeft = vendorColor;
  let bottomRight = performerColor;

  if (hasVendor && hasPerformer) {
    topLeft = vendorColor;
    topRight = performerColor;
    bottomLeft = vendorPending ? pendingColor : vendorColor;
    bottomRight = performerPending ? pendingColor : performerColor;
  } else if (hasVendor) {
    topLeft = vendorColor;
    topRight = vendorColor;
    bottomLeft = vendorPending ? pendingColor : vendorColor;
    bottomRight = vendorPending ? pendingColor : vendorColor;
  } else if (hasPerformer) {
    topLeft = performerColor;
    topRight = performerColor;
    bottomLeft = performerPending ? pendingColor : performerColor;
    bottomRight = performerPending ? pendingColor : performerColor;
  }

  return `conic-gradient(from -90deg, ${topRight} 0 90deg, ${bottomRight} 90deg 180deg, ${bottomLeft} 180deg 270deg, ${topLeft} 270deg 360deg)`;
}

function renderCalendar() {
  calendarEl.innerHTML = "";
  yearLabel.textContent = currentYear;
  const today = new Date();
  const dateMap = dateEntriesByDate();
  const blackoutSet = getBlackoutDateSet();

  monthLabels.forEach((monthName, monthIndex) => {
    const monthEl = document.createElement("div");
    monthEl.className = "month";

    const nameEl = document.createElement("div");
    nameEl.className = "month__name";
    nameEl.textContent = monthName;
    monthEl.appendChild(nameEl);

    const weekdayRow = document.createElement("div");
    weekdayRow.className = "weekdays";
    weekdayLabels.forEach((label) => {
      const day = document.createElement("span");
      day.textContent = label;
      weekdayRow.appendChild(day);
    });
    monthEl.appendChild(weekdayRow);

    const daysGrid = document.createElement("div");
    daysGrid.className = "days";

    const firstDay = new Date(currentYear, monthIndex, 1);
    const totalDays = new Date(currentYear, monthIndex + 1, 0).getDate();
    const offset = firstDay.getDay();

    for (let i = 0; i < offset; i += 1) {
      const filler = document.createElement("div");
      filler.className = "day day--empty";
      filler.style.visibility = "hidden";
      daysGrid.appendChild(filler);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(currentYear, monthIndex, day);
      const iso = toLocalISO(date);
      const dayEl = document.createElement("button");
      dayEl.type = "button";
      dayEl.className = "day";
      dayEl.dataset.date = iso;

      if (blackoutSet.has(iso)) {
        dayEl.classList.add("day--blackout");
      }

      if (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      ) {
        dayEl.classList.add("day--today");
      }

      if (selectedDate === iso) {
        dayEl.classList.add("day--selected");
      }

      if (!blackoutSet.has(iso)) {
        const marker = document.createElement("div");
        marker.className = "day__marker";
        const entries = dateMap[iso] || [];
        const markerEntry =
          entries.find(
            ({ entry }) =>
              entry.statusVendor === "confirmed" ||
              entry.statusPerformer === "confirmed"
          )?.entry || entries[0]?.entry;
        const markerStyle = markerStyleForEntry(markerEntry);
        if (markerStyle) {
          marker.style.background = markerStyle;
          dayEl.appendChild(marker);
        }

        if (entries.length > 1) {
          const count = document.createElement("span");
          count.className = "day__count";
          count.textContent = entries.length;
          dayEl.appendChild(count);
        }
      }

      const numberWrap = document.createElement("div");
      numberWrap.className = "day__number-wrap";

      const number = document.createElement("span");
      number.className = "day__number";
      number.textContent = day;
      numberWrap.appendChild(number);
      dayEl.appendChild(numberWrap);

      dayEl.addEventListener("click", () => {
        selectedDate = iso;
        renderCalendar();
        renderDayPanel();
        openDayModal();
      });

      daysGrid.appendChild(dayEl);
    }

    monthEl.appendChild(daysGrid);
    calendarEl.appendChild(monthEl);
  });
}

function renderDayPanel() {
  return;
}

function renderDayModal() {
  if (!dayModal || !selectedDate) return;
  const readable = new Date(selectedDate).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  if (dayModalTitle) {
    dayModalTitle.textContent = readable;
  }
  if (dayModalIso) {
    dayModalIso.textContent = selectedDate;
  }
  if (toggleBlackoutBtn) {
    const isBlackout = getBlackoutDateSet().has(selectedDate);
    toggleBlackoutBtn.checked = isBlackout;
  }
  if (!dayEventList) return;
  dayEventList.innerHTML = "";
  const blackoutGroups = getBlackoutGroupsForDate(selectedDate);
  if (blackoutGroups.length > 0) {
    const heading = document.createElement("div");
    heading.className = "muted small";
    heading.textContent = "Blackouts";
    dayEventList.appendChild(heading);

    blackoutGroups.forEach((group) => {
      const item = document.createElement("div");
      item.className = "day-item";

      const header = document.createElement("div");
      header.className = "day-item__row";

      const title = document.createElement("strong");
      title.textContent = group.title || "Blackout";
      header.appendChild(title);

      const actions = document.createElement("div");
      actions.className = "day-item__row";

      const editBtn = document.createElement("button");
      editBtn.className = "ghost-btn";
      editBtn.textContent = "✎";
      editBtn.setAttribute("aria-label", "Edit blackout");
      editBtn.title = "Edit blackout";
      editBtn.addEventListener("click", () => {
        closeDayModalUI();
        openBlackoutModal(group);
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "ghost-btn";
      removeBtn.textContent = "🗑";
      removeBtn.setAttribute("aria-label", "Remove blackout date");
      removeBtn.title = "Remove blackout date";
      removeBtn.addEventListener("click", () => {
        removeBlackoutDateFromGroup(group.id, selectedDate);
      });

      actions.appendChild(editBtn);
      actions.appendChild(removeBtn);
      header.appendChild(actions);
      item.appendChild(header);

      if (group.notes) {
        const notes = document.createElement("div");
        notes.className = "muted small";
        notes.textContent = group.notes;
        item.appendChild(notes);
      }

      dayEventList.appendChild(item);
    });
  }

  const dayMatches = dateEntriesByDate()[selectedDate] || [];
  if (dayMatches.length === 0) {
    if (blackoutGroups.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No events yet.";
      dayEventList.appendChild(empty);
    }
    return;
  }

  dayMatches.forEach(({ event, entry }) => {
    const item = document.createElement("div");
    item.className = "day-item";

    const header = document.createElement("div");
    header.className = "day-item__row";

    const title = document.createElement("strong");
    title.textContent = event.title;
    header.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "day-item__row";

    const editBtn = document.createElement("button");
    editBtn.className = "ghost-btn";
    editBtn.textContent = "✎";
    editBtn.setAttribute("aria-label", "Edit event");
    editBtn.title = "Edit event";
    editBtn.addEventListener("click", () => {
      closeDayModalUI();
      openModal(event, entry);
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "ghost-btn";
    removeBtn.textContent = "🗑";
    removeBtn.setAttribute("aria-label", "Remove date");
    removeBtn.title = "Remove date";
    removeBtn.addEventListener("click", () => {
      removeDateEntry(event.id, entry.date);
      renderDayModal();
    });

    actions.appendChild(editBtn);
    actions.appendChild(removeBtn);
    header.appendChild(actions);

    item.appendChild(header);

    const controls = document.createElement("div");
    controls.className = "day-item__controls";

    const vendorEnabled = entry.type === "vendor" || entry.type === "both";
    const performerEnabled = entry.type === "performer" || entry.type === "both";

    const vendorRow = document.createElement("div");
    vendorRow.className = "day-item__row";

    const vendorToggle = document.createElement("button");
    vendorToggle.className = `type-toggle-btn ${vendorEnabled ? "active" : ""}`;
    vendorToggle.dataset.role = "vendor";
    vendorToggle.textContent = getVendorLabel();
    vendorToggle.addEventListener("click", () => {
      const nextVendor = !vendorEnabled;
      const nextPerformer = performerEnabled || !nextVendor;
      if (!nextVendor && !nextPerformer) return;
      updateEntry(event.id, entry.date, (current) => ({
        ...current,
        type: deriveType(nextVendor, nextPerformer),
      }));
    });

    const vendorStatus = document.createElement("select");
    vendorStatus.className = "status-select";
    ["contacted", "submitted", "pending", "confirmed", "rejected"].forEach(
      (status) => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        vendorStatus.appendChild(option);
      }
    );
    vendorStatus.value = entry.statusVendor;
    vendorStatus.disabled = !vendorEnabled;
    vendorStatus.classList.add(entry.statusVendor);
    vendorStatus.addEventListener("change", () => {
      vendorStatus.className = "status-select";
      vendorStatus.classList.add(vendorStatus.value);
      updateEntry(event.id, entry.date, (current) => ({
        ...current,
        statusVendor: vendorStatus.value,
      }));
    });

    vendorRow.appendChild(vendorToggle);
    vendorRow.appendChild(vendorStatus);

    const performerRow = document.createElement("div");
    performerRow.className = "day-item__row";

    const performerToggle = document.createElement("button");
    performerToggle.className = `type-toggle-btn ${
      performerEnabled ? "active" : ""
    }`;
    performerToggle.dataset.role = "performer";
    performerToggle.textContent = getPerformerLabel();
    performerToggle.addEventListener("click", () => {
      const nextPerformer = !performerEnabled;
      const nextVendor = vendorEnabled || !nextPerformer;
      if (!nextVendor && !nextPerformer) return;
      updateEntry(event.id, entry.date, (current) => ({
        ...current,
        type: deriveType(nextVendor, nextPerformer),
      }));
    });

    const performerStatus = document.createElement("select");
    performerStatus.className = "status-select";
    ["contacted", "submitted", "pending", "confirmed", "rejected"].forEach(
      (status) => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        performerStatus.appendChild(option);
      }
    );
    performerStatus.value = entry.statusPerformer;
    performerStatus.disabled = !performerEnabled;
    performerStatus.classList.add(entry.statusPerformer);
    performerStatus.addEventListener("change", () => {
      performerStatus.className = "status-select";
      performerStatus.classList.add(performerStatus.value);
      updateEntry(event.id, entry.date, (current) => ({
        ...current,
        statusPerformer: performerStatus.value,
      }));
    });

    performerRow.appendChild(performerToggle);
    performerRow.appendChild(performerStatus);

    controls.appendChild(vendorRow);
    controls.appendChild(performerRow);

    item.appendChild(controls);
    dayEventList.appendChild(item);
  });
}

function openDayModal() {
  if (!dayModal || !selectedDate) return;
  renderDayModal();
  dayModal.classList.remove("hidden");
  dayModal.setAttribute("aria-hidden", "false");
}

function closeDayModalUI() {
  if (!dayModal) return;
  dayModal.classList.add("hidden");
  dayModal.setAttribute("aria-hidden", "true");
}

function addEvent(event) {
  events = [...events, event];
  saveEvents(events);
  renderCalendar();
  renderDayPanel();
  renderDayModal();
}

function updateEvent(updated) {
  events = events.map((event) => (event.id === updated.id ? updated : event));
  saveEvents(events);
  renderCalendar();
  renderDayPanel();
  renderDayModal();
}

function removeEvent(id) {
  events = events.filter((event) => event.id !== id);
  saveEvents(events);
  renderCalendar();
  renderDayPanel();
  renderDayModal();
}

function clearEvents() {
  events = [];
  saveEvents(events);
  selectedDate = null;
  renderCalendar();
  renderDayPanel();
}

function ensureDefaultBlackoutGroup() {
  if (blackouts.length === 0) {
    const group = {
      id: crypto.randomUUID(),
      title: "",
      notes: "",
      dates: [],
    };
    blackouts = [group];
    return group;
  }
  return blackouts[0];
}

function addBlackoutDate(date) {
  if (!date) return;
  if (!/\d{4}-\d{2}-\d{2}/.test(date)) return;
  const group = ensureDefaultBlackoutGroup();
  addDateToBlackoutGroup(group, date);
}

function removeBlackoutDateFromGroup(groupId, date) {
  if (!groupId || !date) return;
  blackouts = blackouts
    .map((group) => {
      if (group.id !== groupId) return group;
      const nextDates = group.dates.filter((item) => item !== date);
      return { ...group, dates: nextDates };
    })
    .filter((group) => group.dates.length > 0);
  saveBlackouts(blackouts);
  renderCalendar();
  renderDayPanel();
  renderDayModal();
}

function removeBlackoutDate(date) {
  if (!date) return;
  blackouts = blackouts
    .map((group) => ({
      ...group,
      dates: group.dates.filter((item) => item !== date),
    }))
    .filter((group) => group.dates.length > 0);
  saveBlackouts(blackouts);
  renderCalendar();
  renderDayPanel();
  renderDayModal();
}

function promptBlackoutGroupSelection() {
  if (blackouts.length === 0) {
    return { action: "new" };
  }
  const list = blackouts
    .map((group, index) => `${index + 1}) ${group.title || "Untitled"}`)
    .join("\n");
  const choice = prompt(
    `Add blackout to which group?\n\n${list}\n\nType a number or "new":`,
    "new"
  );
  if (!choice) return null;
  if (choice.toLowerCase().startsWith("n")) {
    return { action: "new" };
  }
  const index = Number.parseInt(choice, 10) - 1;
  if (Number.isNaN(index) || index < 0 || index >= blackouts.length) {
    alert("Invalid selection.");
    return null;
  }
  return { action: "existing", group: blackouts[index] };
}

function openBlackoutPickModal(date) {
  if (!blackoutPickModal || !blackoutPickList) return;
  pendingBlackoutDate = date;
  blackoutPickList.innerHTML = "";
  blackouts.forEach((group) => {
    const item = document.createElement("div");
    item.className = "day-item";
    const row = document.createElement("div");
    row.className = "day-item__row";
    const title = document.createElement("strong");
    title.textContent = group.title || "Untitled";
    row.appendChild(title);
    const chooseBtn = document.createElement("button");
    chooseBtn.className = "ghost-btn";
    chooseBtn.textContent = "Select";
    chooseBtn.addEventListener("click", () => {
      addDateToBlackoutGroup(group, pendingBlackoutDate);
      closeBlackoutPickModal();
    });
    row.appendChild(chooseBtn);
    item.appendChild(row);
    if (group.notes) {
      const notes = document.createElement("div");
      notes.className = "muted small";
      notes.textContent = group.notes;
      item.appendChild(notes);
    }
    blackoutPickList.appendChild(item);
  });
  blackoutPickModal.classList.remove("hidden");
  blackoutPickModal.setAttribute("aria-hidden", "false");
}

function closeBlackoutPickModal() {
  if (!blackoutPickModal) return;
  blackoutPickModal.classList.add("hidden");
  blackoutPickModal.setAttribute("aria-hidden", "true");
  pendingBlackoutDate = null;
  if (toggleBlackoutBtn && selectedDate) {
    toggleBlackoutBtn.checked = getBlackoutDateSet().has(selectedDate);
  }
}

function addDateToBlackoutGroup(group, date) {
  if (!group || !date) return;
  if (group.dates.includes(date)) return;
  group.dates = [...group.dates, date].sort();
  saveBlackouts(blackouts);
  renderCalendar();
  renderDayModal();
}

function updateEntry(eventId, date, updater) {
  let updatedEntry = null;
  events = events.map((event) => {
    if (event.id !== eventId) return event;
    const nextDates = event.dates.map((entry) =>
      entry.date === date ? updater(entry) : entry
    );
    updatedEntry = nextDates.find((entry) => entry.date === date) || null;
    return { ...event, dates: nextDates };
  });
  if (
    updatedEntry &&
    (updatedEntry.statusVendor === "confirmed" ||
      updatedEntry.statusPerformer === "confirmed")
  ) {
    enforceSingleConfirmed(date, eventId);
  }
  saveEvents(events);
  renderCalendar();
  renderDayPanel();
  renderDayModal();
}

function removeDateEntry(eventId, date) {
  events = events
    .map((event) => {
      if (event.id !== eventId) return event;
      const nextDates = event.dates.filter((entry) => entry.date !== date);
      return { ...event, dates: nextDates };
    })
    .filter((event) => event.dates.length > 0);
  saveEvents(events);
  renderCalendar();
  renderDayPanel();
  renderDayModal();
}

function enforceSingleConfirmed(date, eventId) {
  events = events.map((event) => {
    const nextDates = event.dates.map((entry) => {
      if (entry.date !== date) return entry;
      if (event.id === eventId) return entry;
      if (
        entry.statusVendor === "confirmed" ||
        entry.statusPerformer === "confirmed"
      ) {
        return {
          ...entry,
          statusVendor:
            entry.statusVendor === "confirmed" ? "pending" : entry.statusVendor,
          statusPerformer:
            entry.statusPerformer === "confirmed"
              ? "pending"
              : entry.statusPerformer,
        };
      }
      return entry;
    });
    return { ...event, dates: nextDates };
  });
}

function openModal(event = null, entry = null) {
  const isEdit = Boolean(event);
  eventModal.classList.remove("hidden");
  eventModal.setAttribute("aria-hidden", "false");
  document.getElementById("modalTitle").textContent = isEdit
    ? "Edit event"
    : "Add event";

  deleteEventBtn.classList.toggle("hidden", !isEdit);
  eventIdInput.value = event?.id || "";
  const initialDates = event?.dates?.map((dateEntry) => dateEntry.date) || [];
  if (!isEdit) {
    const defaultDate = selectedDate || toLocalISO(new Date());
    setSelectedDates([defaultDate]);
    setPickerMonth(defaultDate);
  } else {
    setSelectedDates(initialDates);
    if (entry?.date) {
      setPickerMonth(entry.date);
    } else if (initialDates[0]) {
      setPickerMonth(initialDates[0]);
    }
  }
  dateInput.value = Array.from(selectedDates)[0] || "";
  titleInput.value = event?.title || "";
  vendorCheck.checked = entry
    ? entry.type === "vendor" || entry.type === "both"
    : true;
  performerCheck.checked = entry
    ? entry.type === "performer" || entry.type === "both"
    : false;
  statusVendorInput.value = entry?.statusVendor || "pending";
  statusPerformerInput.value = entry?.statusPerformer || "pending";
  syncStatusInputs();
  renderMultiDatePicker();
}

function closeModalUI() {
  eventModal.classList.add("hidden");
  eventModal.setAttribute("aria-hidden", "true");
  eventForm.reset();
  eventIdInput.value = "";
  selectedDates = new Set();
  updateSelectedDatesLabel();
  deleteEventBtn.classList.add("hidden");
}

function openCreateModal() {
  if (!createModal) return;
  createModal.classList.remove("hidden");
  createModal.setAttribute("aria-hidden", "false");
}

function closeCreateModalUI() {
  if (!createModal) return;
  createModal.classList.add("hidden");
  createModal.setAttribute("aria-hidden", "true");
}

function openBlackoutModal(group = null, date = selectedDate) {
  if (!blackoutModal) return;
  if (group) {
    editingBlackoutId = group.id;
    blackoutTitleInput.value = group.title || "";
    blackoutNotesInput.value = group.notes || "";
    setBlackoutSelectedDates(group.dates || []);
    if (group.dates?.[0]) {
      setBlackoutPickerMonth(group.dates[0]);
    }
  } else {
    editingBlackoutId = null;
    blackoutTitleInput.value = "";
    blackoutNotesInput.value = "";
    const initialDate = date ? [date] : [];
    setBlackoutSelectedDates(initialDate);
    if (date) {
      setBlackoutPickerMonth(date);
    }
  }
  renderBlackoutDatePicker();
  blackoutModal.classList.remove("hidden");
  blackoutModal.setAttribute("aria-hidden", "false");
}

function closeBlackoutModalUI() {
  if (!blackoutModal) return;
  blackoutModal.classList.add("hidden");
  blackoutModal.setAttribute("aria-hidden", "true");
  editingBlackoutId = null;
}

function openImportModal() {
  if (!importModal) return;
  exportBox?.classList.add("hidden");
  importModal.classList.remove("hidden");
  importModal.setAttribute("aria-hidden", "false");
}

function closeImportModalUI() {
  if (!importModal) return;
  importModal.classList.add("hidden");
  importModal.setAttribute("aria-hidden", "true");
}

function openSettingsModal() {
  if (!settingsModal) return;
  vendorLabelInput.value = getVendorLabel();
  performerLabelInput.value = getPerformerLabel();
  vendorColorInput.value = getVendorColor();
  performerColorInput.value = getPerformerColor();
  vendorColorText.value = getVendorColor();
  performerColorText.value = getPerformerColor();
  settingsModal.classList.remove("hidden");
  settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettingsModalUI() {
  if (!settingsModal) return;
  settingsModal.classList.add("hidden");
  settingsModal.setAttribute("aria-hidden", "true");
}

function syncStatusInputs() {
  let vendorEnabled = vendorCheck.checked;
  let performerEnabled = performerCheck.checked;
  if (!vendorEnabled && !performerEnabled) {
    vendorCheck.checked = true;
    vendorEnabled = true;
  }
  statusVendorInput.disabled = !vendorEnabled;
  statusPerformerInput.disabled = !performerEnabled;
}

function handleSubmit(e) {
  e.preventDefault();
  const newEvent = normalizeEvent({
    date: dateInput.value,
    title: titleInput.value,
    type: deriveType(vendorCheck.checked, performerCheck.checked),
    statusVendor: statusVendorInput.value,
    statusPerformer: statusPerformerInput.value,
    id: eventIdInput.value || undefined,
  });

  if (!newEvent) return;
  const blackoutSet = getBlackoutDateSet();
  const targetDates = Array.from(selectedDates);
  const blockedDates = targetDates.filter((date) => blackoutSet.has(date));
  if (targetDates.length === 0) {
    alert("Select at least one date.");
    return;
  }
  if (blockedDates.length > 0) {
    const proceed = confirm(
      `This event includes ${blockedDates.length} blackout date${
        blockedDates.length === 1 ? "" : "s"
      }. Continue?`
    );
    if (!proceed) return;
  }
  const entries = targetDates.map((date) => ({
    date,
    type: newEvent.dates[0].type,
    statusVendor: newEvent.dates[0].statusVendor,
    statusPerformer: newEvent.dates[0].statusPerformer,
  }));

  if (eventIdInput.value) {
    events = events.map((event) => {
      if (event.id !== newEvent.id) return event;
      return {
        ...event,
        title: newEvent.title,
        dates: entries,
      };
    });
  } else {
    events = [
      ...events,
      {
        ...newEvent,
        dates: entries,
      },
    ];
  }
  // Enforce single confirmed per date
  entries.forEach((entry) => {
    if (
      entry.statusVendor === "confirmed" ||
      entry.statusPerformer === "confirmed"
    ) {
      enforceSingleConfirmed(entry.date, newEvent.id);
    }
  });
  saveEvents(events);
  renderCalendar();
  renderDayPanel();
  selectedDate = entries[0].date;
  closeModalUI();
}

function inferType(label = "") {
  const lowered = label.toLowerCase();
  if (lowered.includes("addaf")) return "performer";
  return "vendor";
}

function inferStatus(label = "") {
  const lowered = label.toLowerCase();
  return lowered.includes("unconfirmed") ? "pending" : "confirmed";
}

function mapMarksLegends(parsed) {
  const marks = parsed?.marks;
  const legends = parsed?.legends;
  if (!marks || !legends) return null;

  return Object.entries(marks).map(([date, legendKey]) => {
    const label = legends[String(legendKey)] || legends[legendKey] || "Event";
    return {
      date,
      title: label,
      type: inferType(label),
      status: inferStatus(label),
    };
  });
}

function normalizeBlackouts(list) {
  if (!Array.isArray(list)) return [];
  if (list.length > 0 && typeof list[0] === "string") {
    const dates = list.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
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
  return list.map((item) => normalizeBlackoutGroup(item)).filter(Boolean);
}

function handleImportPayload(rawText, mode = "merge") {
  try {
    const parsed = JSON.parse(rawText);
    let list = Array.isArray(parsed) ? parsed : parsed?.events;
    if (!Array.isArray(list)) {
      list = mapMarksLegends(parsed);
    }
    if (!Array.isArray(list)) {
      if (Array.isArray(parsed?.blackouts)) {
        list = [];
      } else {
        alert(
          "JSON must be an array of events, {events:[...]}, or {marks, legends}."
        );
        return;
      }
    }

    const imported = list.map(normalizeEvent).filter(Boolean);
    const incomingBlackouts = normalizeBlackouts(parsed?.blackouts);
    if (imported.length === 0 && incomingBlackouts.length === 0) {
      alert("No valid events found in JSON.");
      return;
    }
    if (mode === "replace") {
      events = imported;
      blackouts = incomingBlackouts;
    } else {
      events = [...events, ...imported];
      const byId = new Map(blackouts.map((group) => [group.id, group]));
      incomingBlackouts.forEach((group) => {
        byId.set(group.id, group);
      });
      blackouts = Array.from(byId.values());
    }
    if (parsed?.settings && typeof parsed.settings === "object") {
      const nextSettings = normalizeSettings(parsed.settings);
      settings = mode === "replace" ? nextSettings : { ...settings, ...nextSettings };
      saveSettings(settings);
      applySettings();
    }
    const seen = new Map();
    events.forEach((event) => {
      event.dates.forEach((entry) => {
        seen.set(entry.date, { eventId: event.id, entry });
      });
    });
    events = events
      .map((event) => {
        const nextDates = event.dates.filter(
          (entry) => seen.get(entry.date)?.eventId === event.id
        );
        return { ...event, dates: nextDates };
      })
      .filter((event) => event.dates.length > 0);
    saveEvents(events);
    saveBlackouts(blackouts);
    renderCalendar();
    renderDayPanel();
  } catch (error) {
    alert("Invalid JSON file.");
    console.error(error);
  }
}

function importJson() {
  const file = importInput.files?.[0];
  if (!file) {
    alert("Choose a JSON file first.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    handleImportPayload(event.target.result);
    importInput.value = "";
  };

  reader.readAsText(file);
}

async function importFromNativePicker() {
  if (!window?.HybridWebView?.InvokeDotNet) {
    importJson();
    return;
  }
  try {
    const rawText = await window.HybridWebView.InvokeDotNet("PickImport");
    if (!rawText) return;
    handleImportPayload(rawText);
  } catch (error) {
    alert("Import failed.");
    console.error(error);
  }
}

function exportState() {
  return JSON.stringify({ events, blackouts, settings }, null, 2);
}

function resetCalendar() {
  events = [];
  blackouts = [];
  saveEvents(events);
  saveBlackouts(blackouts);
  selectedDate = null;
  renderCalendar();
  renderDayPanel();
}

function importFromBase64(base64, mode = "replace") {
  const raw = atob(base64);
  handleImportPayload(raw, mode);
}

function exportJson() {
  const payload = {
    events,
    blackouts,
  };
  const json = JSON.stringify(payload, null, 2);
  if (exportText) {
    exportText.value = json;
  }
  exportBox?.classList.remove("hidden");
  try {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "events-export.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn("Download blocked, showing JSON instead.", error);
  }
}

prevYearBtn.addEventListener("click", () => {
  currentYear -= 1;
  renderCalendar();
});

nextYearBtn.addEventListener("click", () => {
  currentYear += 1;
  renderCalendar();
});

todayBtn.addEventListener("click", () => {
  const today = new Date();
  currentYear = today.getFullYear();
  selectedDate = toLocalISO(today);
  renderCalendar();
  renderDayPanel();
});

eventForm.addEventListener("submit", handleSubmit);
importBtn?.addEventListener("click", () => {
  if (isHybrid) {
    importFromNativePicker();
    return;
  }
  importJson();
});
exportBtn.addEventListener("click", exportJson);
copyExportBtn?.addEventListener("click", async () => {
  if (!exportText?.value) return;
  try {
    await navigator.clipboard.writeText(exportText.value);
  } catch (error) {
    console.warn("Clipboard unavailable", error);
  }
});
openImportModalBtn?.addEventListener("click", openImportModal);
closeImportModal?.addEventListener("click", closeImportModalUI);
importModal?.addEventListener("click", (event) => {
  if (event.target?.dataset?.close === "true") {
    closeImportModalUI();
  }
});
openSettingsBtn?.addEventListener("click", openSettingsModal);
closeSettingsModal?.addEventListener("click", closeSettingsModalUI);
settingsModal?.addEventListener("click", (event) => {
  if (event.target?.dataset?.close === "true") {
    closeSettingsModalUI();
  }
});
saveSettingsBtn?.addEventListener("click", () => {
  settings = {
    vendorLabel: vendorLabelInput.value.trim() || "Vendor",
    performerLabel: performerLabelInput.value.trim() || "Performer",
    vendorColor: vendorColorInput.value || vendorColorText.value || "#2b8cff",
    performerColor:
      performerColorInput.value || performerColorText.value || "#ff6a88",
  };
  saveSettings(settings);
  applySettings();
  renderCalendar();
  renderDayModal();
  closeSettingsModalUI();
});
vendorColorInput?.addEventListener("input", () => {
  if (vendorColorText) vendorColorText.value = vendorColorInput.value;
});
performerColorInput?.addEventListener("input", () => {
  if (performerColorText) performerColorText.value = performerColorInput.value;
});
vendorColorText?.addEventListener("change", () => {
  if (vendorColorText.value) vendorColorInput.value = vendorColorText.value;
});
performerColorText?.addEventListener("change", () => {
  if (performerColorText.value) performerColorInput.value = performerColorText.value;
});
addBtn?.addEventListener("click", openCreateModal);
closeCreateModal?.addEventListener("click", closeCreateModalUI);
createModal?.addEventListener("click", (event) => {
  if (event.target?.dataset?.close === "true") {
    closeCreateModalUI();
  }
});
createEventBtn?.addEventListener("click", () => {
  closeCreateModalUI();
  openModal();
});
createBlackoutBtn?.addEventListener("click", () => {
  closeCreateModalUI();
  openBlackoutModal();
});
closeBlackoutModal?.addEventListener("click", closeBlackoutModalUI);
blackoutModal?.addEventListener("click", (event) => {
  if (event.target?.dataset?.close === "true") {
    closeBlackoutModalUI();
  }
});
confirmBlackoutBtn?.addEventListener("click", () => {
  const dates = Array.from(blackoutSelectedDates);
  if (dates.length === 0) {
    alert("Select at least one date.");
    return;
  }
  const nextGroup = normalizeBlackoutGroup({
    id: editingBlackoutId || crypto.randomUUID(),
    title: blackoutTitleInput.value.trim(),
    notes: blackoutNotesInput.value.trim(),
    dates,
  });
  if (!nextGroup) {
    alert("Select at least one date.");
    return;
  }
  if (editingBlackoutId) {
    blackouts = blackouts.map((group) =>
      group.id === editingBlackoutId ? nextGroup : group
    );
  } else {
    blackouts = [...blackouts, nextGroup];
  }
  editingBlackoutId = null;
  saveBlackouts(blackouts);
  renderCalendar();
  renderDayModal();
  closeBlackoutModalUI();
});
toggleBlackoutBtn?.addEventListener("change", () => {
  if (!selectedDate) return;
  if (toggleBlackoutBtn.checked) {
    if (blackouts.length === 0) {
      openBlackoutModal(null, selectedDate);
      return;
    }
    openBlackoutPickModal(selectedDate);
  } else {
    removeBlackoutDate(selectedDate);
  }
  renderDayModal();
});
closeDayModal?.addEventListener("click", closeDayModalUI);
dayModal?.addEventListener("click", (event) => {
  if (event.target?.dataset?.close === "true") {
    closeDayModalUI();
  }
});
closeBlackoutPick?.addEventListener("click", closeBlackoutPickModal);
blackoutPickModal?.addEventListener("click", (event) => {
  if (event.target?.dataset?.close === "true") {
    closeBlackoutPickModal();
  }
});
createNewBlackoutGroupBtn?.addEventListener("click", () => {
  closeBlackoutPickModal();
  openBlackoutModal(null, pendingBlackoutDate || selectedDate);
});
closeModal.addEventListener("click", closeModalUI);
eventModal.addEventListener("click", (event) => {
  if (event.target?.dataset?.close === "true") {
    closeModalUI();
  }
});
deleteEventBtn.addEventListener("click", () => {
  if (!eventIdInput.value) return;
  removeEvent(eventIdInput.value);
  closeModalUI();
});
prevMonthBtn.addEventListener("click", () => {
  pickerMonth -= 1;
  if (pickerMonth < 0) {
    pickerMonth = 11;
    pickerYear -= 1;
  }
  renderMultiDatePicker();
});
nextMonthBtn.addEventListener("click", () => {
  pickerMonth += 1;
  if (pickerMonth > 11) {
    pickerMonth = 0;
    pickerYear += 1;
  }
  renderMultiDatePicker();
});
clearDatesBtn.addEventListener("click", () => {
  selectedDates = new Set();
  updateSelectedDatesLabel();
  renderMultiDatePicker();
});
blackoutPrevMonthBtn?.addEventListener("click", () => {
  blackoutPickerMonth -= 1;
  if (blackoutPickerMonth < 0) {
    blackoutPickerMonth = 11;
    blackoutPickerYear -= 1;
  }
  renderBlackoutDatePicker();
});
blackoutNextMonthBtn?.addEventListener("click", () => {
  blackoutPickerMonth += 1;
  if (blackoutPickerMonth > 11) {
    blackoutPickerMonth = 0;
    blackoutPickerYear += 1;
  }
  renderBlackoutDatePicker();
});
blackoutClearDatesBtn?.addEventListener("click", () => {
  blackoutSelectedDates = new Set();
  updateBlackoutSelectedLabel();
  renderBlackoutDatePicker();
});
vendorCheck.addEventListener("change", syncStatusInputs);
performerCheck.addEventListener("change", syncStatusInputs);

renderCalendar();
renderDayPanel();

window.__APP__ = {
  getState: () => ({
    currentYear,
    selectedDate,
    events: cloneEvents(),
    blackouts: [...blackouts],
    pickerYear,
    pickerMonth,
    selectedDates: Array.from(selectedDates),
  }),
  setEvents: (nextEvents) => {
    events = Array.isArray(nextEvents) ? nextEvents : [];
    saveEvents(events);
    renderAll();
  },
  exportState,
  importFromBase64,
  resetCalendar,
  openNewEvent: () => openModal(),
  openNewBlackout: () => openBlackoutModal(),
  renderAll,
};
