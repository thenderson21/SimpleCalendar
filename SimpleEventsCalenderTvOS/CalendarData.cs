using System.Globalization;
using System.Text.Json;

namespace SimpleEventsCalenderTvOS;

public sealed class CalendarState
{
	public List<EventItem> Events { get; } = new();
	public List<BlackoutGroup> Blackouts { get; } = new();
	public CalendarSettings Settings { get; } = new();

	public static CalendarState Empty => new();
}

public sealed class EventItem
{
	public string Id { get; set; } = Guid.NewGuid().ToString();
	public string Title { get; set; } = "Untitled";
	public List<EventDateEntry> Dates { get; } = new();
}

public sealed class EventDateEntry
{
	public string Date { get; set; } = "";
	public string Type { get; set; } = "vendor";
	public string StatusVendor { get; set; } = "pending";
	public string StatusPerformer { get; set; } = "pending";
}

public sealed class BlackoutGroup
{
	public string Id { get; set; } = Guid.NewGuid().ToString();
	public string Title { get; set; } = "";
	public string Notes { get; set; } = "";
	public List<string> Dates { get; } = new();
}

public sealed class CalendarSettings
{
	public string VendorLabel { get; set; } = "Vendor";
	public string PerformerLabel { get; set; } = "Performer";
	public string VendorColor { get; set; } = "#2b8cff";
	public string PerformerColor { get; set; } = "#ff6a88";
}

public static class CalendarDataLoader
{
	private const string DefaultFileName = "calendar.sevc";

	public static async Task<CalendarState> LoadAsync()
	{
		try
		{
			var path = ResolveICloudPath();
			if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
			{
				var json = await File.ReadAllTextAsync(path);
				return Parse(json);
			}
		}
		catch
		{
			// Ignore iCloud errors and fall back to empty state.
		}

		return CalendarState.Empty;
	}

	private static string? ResolveICloudPath()
	{
		var containerUrl = Foundation.NSFileManager.DefaultManager.GetUrlForUbiquityContainer(null);
		if (containerUrl == null)
		{
			return null;
		}

		var documentsUrl = containerUrl.Append("Documents", true);
		Foundation.NSError? error;
		Foundation.NSFileManager.DefaultManager.CreateDirectory(documentsUrl, true, null, out error);
		if (error != null)
		{
			return null;
		}

		var documentsPath = documentsUrl.Path;
		return string.IsNullOrWhiteSpace(documentsPath)
			? null
			: Path.Combine(documentsPath, DefaultFileName);
	}

	private static CalendarState Parse(string json)
	{
		if (string.IsNullOrWhiteSpace(json))
		{
			return CalendarState.Empty;
		}

		using var doc = JsonDocument.Parse(json);
		var state = new CalendarState();

		if (doc.RootElement.ValueKind == JsonValueKind.Array)
		{
			ParseEvents(doc.RootElement, state.Events);
			return state;
		}

		if (doc.RootElement.ValueKind != JsonValueKind.Object)
		{
			return state;
		}

		if (doc.RootElement.TryGetProperty("events", out var eventsElement))
		{
			ParseEvents(eventsElement, state.Events);
		}

		if (doc.RootElement.TryGetProperty("blackouts", out var blackoutsElement))
		{
			ParseBlackouts(blackoutsElement, state.Blackouts);
		}

		if (doc.RootElement.TryGetProperty("settings", out var settingsElement))
		{
			ParseSettings(settingsElement, state.Settings);
		}

		return state;
	}

	private static void ParseEvents(JsonElement element, List<EventItem> target)
	{
		if (element.ValueKind != JsonValueKind.Array)
		{
			return;
		}

		foreach (var item in element.EnumerateArray())
		{
			if (item.ValueKind != JsonValueKind.Object)
			{
				continue;
			}

			var evt = new EventItem
			{
				Id = GetString(item, "id") ?? Guid.NewGuid().ToString(),
				Title = GetString(item, "title") ?? "Untitled",
			};

			if (item.TryGetProperty("dates", out var datesElement) && datesElement.ValueKind == JsonValueKind.Array)
			{
				foreach (var entry in datesElement.EnumerateArray())
				{
					var parsed = ParseEventDateEntry(entry);
					if (parsed != null)
					{
						evt.Dates.Add(parsed);
					}
				}
			}
			else if (item.TryGetProperty("date", out var dateElement))
			{
				var fallback = new EventDateEntry
				{
					Date = NormalizeDate(dateElement.GetString()),
					Type = NormalizeType(GetString(item, "type")),
					StatusVendor = NormalizeStatus(GetString(item, "statusVendor")) ?? NormalizeStatus(GetString(item, "status")) ?? "pending",
					StatusPerformer = NormalizeStatus(GetString(item, "statusPerformer")) ?? NormalizeStatus(GetString(item, "status")) ?? "pending",
				};
				if (!string.IsNullOrWhiteSpace(fallback.Date))
				{
					evt.Dates.Add(fallback);
				}
			}

			if (evt.Dates.Count > 0)
			{
				target.Add(evt);
			}
		}
	}

	private static EventDateEntry? ParseEventDateEntry(JsonElement entry)
	{
		if (entry.ValueKind != JsonValueKind.Object)
		{
			return null;
		}

		var date = NormalizeDate(GetString(entry, "date"));
		if (string.IsNullOrWhiteSpace(date))
		{
			return null;
		}

		return new EventDateEntry
		{
			Date = date,
			Type = NormalizeType(GetString(entry, "type")),
			StatusVendor = NormalizeStatus(GetString(entry, "statusVendor")) ?? NormalizeStatus(GetString(entry, "status")) ?? "pending",
			StatusPerformer = NormalizeStatus(GetString(entry, "statusPerformer")) ?? NormalizeStatus(GetString(entry, "status")) ?? "pending",
		};
	}

	private static void ParseBlackouts(JsonElement element, List<BlackoutGroup> target)
	{
		if (element.ValueKind != JsonValueKind.Array)
		{
			return;
		}

		var datesOnly = new List<string>();
		foreach (var item in element.EnumerateArray())
		{
			if (item.ValueKind == JsonValueKind.String)
			{
				var date = NormalizeDate(item.GetString());
				if (!string.IsNullOrWhiteSpace(date))
				{
					datesOnly.Add(date);
				}
				continue;
			}

			if (item.ValueKind != JsonValueKind.Object)
			{
				continue;
			}

			var group = new BlackoutGroup
			{
				Id = GetString(item, "id") ?? Guid.NewGuid().ToString(),
				Title = GetString(item, "title") ?? "",
				Notes = GetString(item, "notes") ?? "",
			};

			if (item.TryGetProperty("dates", out var datesElement) && datesElement.ValueKind == JsonValueKind.Array)
			{
				foreach (var dateElement in datesElement.EnumerateArray())
				{
					var date = NormalizeDate(dateElement.GetString());
					if (!string.IsNullOrWhiteSpace(date))
					{
						group.Dates.Add(date);
					}
				}
			}

			if (group.Dates.Count > 0)
			{
				group.Dates.Sort(StringComparer.Ordinal);
				target.Add(group);
			}
		}

		if (target.Count == 0 && datesOnly.Count > 0)
		{
			var group = new BlackoutGroup
			{
				Id = Guid.NewGuid().ToString(),
				Title = "Blackouts",
			};
			group.Dates.AddRange(datesOnly.Distinct().OrderBy(d => d));
			target.Add(group);
		}
	}

	private static void ParseSettings(JsonElement element, CalendarSettings settings)
	{
		if (element.ValueKind != JsonValueKind.Object)
		{
			return;
		}

		settings.VendorLabel = GetString(element, "vendorLabel")?.Trim() ?? settings.VendorLabel;
		settings.PerformerLabel = GetString(element, "performerLabel")?.Trim() ?? settings.PerformerLabel;

		var vendorColor = GetString(element, "vendorColor");
		if (!string.IsNullOrWhiteSpace(vendorColor))
		{
			settings.VendorColor = vendorColor;
		}

		var performerColor = GetString(element, "performerColor");
		if (!string.IsNullOrWhiteSpace(performerColor))
		{
			settings.PerformerColor = performerColor;
		}
	}

	private static string? GetString(JsonElement element, string name)
	{
		return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
			? value.GetString()
			: null;
	}

	private static string NormalizeDate(string? input)
	{
		if (string.IsNullOrWhiteSpace(input))
		{
			return string.Empty;
		}

		if (DateTime.TryParseExact(input.Trim().AsSpan(0, Math.Min(input.Length, 10)), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
		{
			return dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
		}

		return string.Empty;
	}

	private static string NormalizeType(string? input)
	{
		var value = (input ?? string.Empty).Trim().ToLowerInvariant();
		return value is "vendor" or "performer" or "both" ? value : "vendor";
	}

	private static string? NormalizeStatus(string? input)
	{
		var value = (input ?? string.Empty).Trim().ToLowerInvariant();
		return value is "contacted" or "submitted" or "pending" or "confirmed" or "rejected" ? value : null;
	}
}
