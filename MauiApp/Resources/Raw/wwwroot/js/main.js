import { weekdayLabels, monthLabels } from "./constants.js";
import { toLocalISO, deriveType } from "./dateUtils.js";
import {
  loadEvents,
  saveEvents,
  normalizeEvent,
  loadBlackouts,
  saveBlackouts,
} from "./storage.js";

const calendarEl = document.getElementById("calendar");
const yearLabel = document.getElementById("yearLabel");
const prevYearBtn = document.getElementById("prevYear");
const nextYearBtn = document.getElementById("nextYear");
const todayBtn = document.getElementById("todayBtn");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const dayMeta = document.getElementById("dayMeta");
const eventList = document.getElementById("eventList");
const eventForm = document.getElementById("eventForm");
const openAddEvent = document.getElementById("openAddEvent");
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
const colorInput = document.getElementById("colorInput");
const deleteEventBtn = document.getElementById("deleteEvent");
const importInput = document.getElementById("importInput");
const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const exportBox = document.getElementById("exportBox");
const exportText = document.getElementById("exportText");
const copyExportBtn = document.getElementById("copyExport");
const clearEventsBtn = document.getElementById("clearEvents");
const openImportModalBtn = document.getElementById("openImportModal");
const importModal = document.getElementById("importModal");
const closeImportModal = document.getElementById("closeImportModal");
const blackoutList = document.getElementById("blackoutList");
const addBlackoutBtn = document.getElementById("addBlackout");
const blackoutStatusEl = document.getElementById("blackoutStatus");

const isHybrid = Boolean(window?.HybridWebView?.InvokeDotNet);

if (isHybrid) {
  importInput?.classList.add("hidden");
  if (importBtn) {
    importBtn.textContent = "Choose JSON file";
  }
}

let currentYear = new Date().getFullYear();
let selectedDate = null;
let events = loadEvents();
let blackouts = loadBlackouts();
let pickerYear = new Date().getFullYear();
let pickerMonth = new Date().getMonth();
let selectedDates = new Set();


function renderAll() {
  renderCalendar();
  renderDayPanel();
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

function renderMultiDatePicker() {
  if (!multiDateGrid || !monthLabel) return;
  multiDateGrid.innerHTML = "";
  const firstDay = new Date(pickerYear, pickerMonth, 1);
  const totalDays = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const offset = firstDay.getDay();
  const blackoutSet = new Set(blackouts);

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
      cell.disabled = true;
    }
    if (selectedDates.has(iso)) {
      cell.classList.add("selected");
    }
    cell.addEventListener("click", () => toggleDateSelection(iso));
    multiDateGrid.appendChild(cell);
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
  const blackoutSet = new Set(blackouts);

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
      });

      daysGrid.appendChild(dayEl);
    }

    monthEl.appendChild(daysGrid);
    calendarEl.appendChild(monthEl);
  });
}

function renderDayPanel() {
  if (blackoutStatusEl && addBlackoutBtn) {
    if (!selectedDate) {
      blackoutStatusEl.textContent = "Select a date to manage blackouts.";
      addBlackoutBtn.textContent = "Add blackout";
      addBlackoutBtn.disabled = true;
    } else if (blackouts.includes(selectedDate)) {
      blackoutStatusEl.textContent = "This date is marked as a blackout.";
      addBlackoutBtn.textContent = "Remove blackout";
      addBlackoutBtn.disabled = false;
    } else {
      blackoutStatusEl.textContent = "This date is available.";
      addBlackoutBtn.textContent = "Add blackout";
      addBlackoutBtn.disabled = false;
    }
  }

  if (!selectedDate) {
    selectedDateLabel.textContent = "Select a day";
    dayMeta.textContent = "Click a date to manage events.";
    eventList.innerHTML = "";
    renderBlackouts();
    return;
  }

  const readable = new Date(selectedDate).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  selectedDateLabel.textContent = readable;
  dayMeta.textContent = selectedDate;

  const dayMatches = dateEntriesByDate()[selectedDate] || [];
  eventList.innerHTML = "";

  if (blackouts.includes(selectedDate)) {
    eventList.innerHTML = '<div class="muted">Blackout date.</div>';
    renderBlackouts();
    return;
  }

  if (dayMatches.length === 0) {
    eventList.innerHTML = '<div class="muted">No events yet.</div>';
    renderBlackouts();
    return;
  }

  dayMatches.forEach(({ event, entry }) => {
    const card = document.createElement("div");
    card.className = `event-card ${
      entry.statusVendor === "rejected" || entry.statusPerformer === "rejected"
        ? "rejected"
        : ""
    }`;

    const header = document.createElement("div");
    header.className = "event-card__row";

    const title = document.createElement("strong");
    title.textContent = event.title;
    header.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "event-card__row";

    const editBtn = document.createElement("button");
    editBtn.className = "ghost-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openModal(event, entry));

    actions.appendChild(editBtn);
    header.appendChild(actions);

    const meta = document.createElement("div");
    meta.className = "event-card__meta";

    const vendorEnabled = entry.type === "vendor" || entry.type === "both";
    const performerEnabled = entry.type === "performer" || entry.type === "both";

    const vendorRow = document.createElement("div");
    vendorRow.className = "event-card__row";

    const vendorToggle = document.createElement("button");
    vendorToggle.className = `type-toggle-btn ${vendorEnabled ? "active" : ""}`;
    vendorToggle.textContent = "Vendor";
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
    vendorStatus.addEventListener("change", () => {
      updateEntry(event.id, entry.date, (current) => ({
        ...current,
        statusVendor: vendorStatus.value,
      }));
    });

    vendorRow.appendChild(vendorToggle);
    vendorRow.appendChild(vendorStatus);
    meta.appendChild(vendorRow);

    const performerRow = document.createElement("div");
    performerRow.className = "event-card__row";

    const performerToggle = document.createElement("button");
    performerToggle.className = `type-toggle-btn ${
      performerEnabled ? "active" : ""
    }`;
    performerToggle.textContent = "Performer";
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
    performerStatus.addEventListener("change", () => {
      updateEntry(event.id, entry.date, (current) => ({
        ...current,
        statusPerformer: performerStatus.value,
      }));
    });

    performerRow.appendChild(performerToggle);
    performerRow.appendChild(performerStatus);
    meta.appendChild(performerRow);

    const footer = document.createElement("div");
    footer.className = "event-card__row";

    const removeDate = document.createElement("button");
    removeDate.className = "ghost-btn";
    removeDate.textContent = "Remove date";
    removeDate.addEventListener("click", () => {
      removeDateEntry(event.id, entry.date);
    });

    const addDate = document.createElement("button");
    addDate.className = "ghost-btn";
    addDate.textContent = "Add date";
    addDate.addEventListener("click", () => openModal(event, null));

    footer.appendChild(addDate);
    footer.appendChild(removeDate);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(footer);
    eventList.appendChild(card);
  });
  renderBlackouts();
}

function addEvent(event) {
  events = [...events, event];
  saveEvents(events);
  renderCalendar();
  renderDayPanel();
}

function updateEvent(updated) {
  events = events.map((event) => (event.id === updated.id ? updated : event));
  saveEvents(events);
  renderCalendar();
  renderDayPanel();
}

function removeEvent(id) {
  events = events.filter((event) => event.id !== id);
  saveEvents(events);
  renderCalendar();
  renderDayPanel();
}

function clearEvents() {
  events = [];
  saveEvents(events);
  selectedDate = null;
  renderCalendar();
  renderDayPanel();
}

function renderBlackouts() {
  if (!blackoutList) return;
  blackoutList.innerHTML = "";
  const sorted = [...blackouts].sort();
  if (sorted.length === 0) {
    blackoutList.innerHTML = '<div class="muted">None</div>';
    return;
  }
  sorted.forEach((date) => {
    const row = document.createElement("div");
    row.className = "blackout-row";
    const label = document.createElement("span");
    label.textContent = date;
    const removeBtn = document.createElement("button");
    removeBtn.className = "ghost-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeBlackout(date));
    row.appendChild(label);
    row.appendChild(removeBtn);
    blackoutList.appendChild(row);
  });
}

function addBlackout(date) {
  if (!date) return;
  if (!/\d{4}-\d{2}-\d{2}/.test(date)) return;
  if (blackouts.includes(date)) return;
  blackouts = [...blackouts, date];
  saveBlackouts(blackouts);
  renderCalendar();
  renderDayPanel();
}

function removeBlackout(date) {
  blackouts = blackouts.filter((item) => item !== date);
  saveBlackouts(blackouts);
  renderCalendar();
  renderDayPanel();
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
  colorInput.value = "#2b8cff";
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
    color: colorInput.value,
    id: eventIdInput.value || undefined,
  });

  if (!newEvent) return;
  const targetDates = Array.from(selectedDates).filter(
    (date) => !blackouts.includes(date)
  );
  if (targetDates.length === 0) {
    alert("Select at least one non-blackout date.");
    return;
  }
  const entries = targetDates.map((date) => ({
    date,
    type: newEvent.dates[0].type,
    statusVendor: newEvent.dates[0].statusVendor,
    statusPerformer: newEvent.dates[0].statusPerformer,
    color: newEvent.dates[0].color,
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

function legendColor(legendKey) {
  const palette = {
    1: "#2b8cff",
    2: "#ff6a88",
    3: "#7aa7ff",
    4: "#ffb84d",
  };
  return palette[legendKey] || "";
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
      color: legendColor(legendKey),
    };
  });
}

function handleImportPayload(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    let list = Array.isArray(parsed) ? parsed : parsed?.events;
    if (!Array.isArray(list)) {
      list = mapMarksLegends(parsed);
    }
    if (!Array.isArray(list)) {
      alert("JSON must be an array of events, {events:[...]}, or {marks, legends}.");
      return;
    }

    const imported = list.map(normalizeEvent).filter(Boolean);
    if (imported.length === 0) {
      alert("No valid events found in JSON.");
      return;
    }

    events = [...events, ...imported];
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

function exportJson() {
  const payload = {
    events,
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
openAddEvent.addEventListener("click", () => openModal());
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
clearEventsBtn.addEventListener("click", () => {
  if (!events.length) return;
  const confirmed = confirm("Remove all events? This cannot be undone.");
  if (!confirmed) return;
  clearEvents();
});
addBlackoutBtn.addEventListener("click", () => {
  if (!selectedDate) return;
  if (blackouts.includes(selectedDate)) {
    removeBlackout(selectedDate);
    return;
  }
  addBlackout(selectedDate);
});
vendorCheck.addEventListener("change", syncStatusInputs);
performerCheck.addEventListener("change", syncStatusInputs);

renderCalendar();
renderDayPanel();
renderBlackouts();

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
  renderAll,
};
