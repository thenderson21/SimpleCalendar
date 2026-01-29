using System.Globalization;

namespace SimpleEventsCalenderTvOS;

public sealed class CalendarIndex
{
	public Dictionary<string, List<EventDateEntry>> EventsByDate { get; }
	public HashSet<string> BlackoutDates { get; }

	public CalendarIndex(CalendarState state)
	{
		EventsByDate = BuildEventsIndex(state.Events);
		BlackoutDates = BuildBlackoutSet(state.Blackouts);
	}

	private static Dictionary<string, List<EventDateEntry>> BuildEventsIndex(IEnumerable<EventItem> events)
	{
		var map = new Dictionary<string, List<EventDateEntry>>(StringComparer.Ordinal);
		foreach (var item in events)
		{
			foreach (var entry in item.Dates)
			{
				var key = NormalizeDate(entry.Date);
				if (string.IsNullOrWhiteSpace(key))
				{
					continue;
				}
				if (!map.TryGetValue(key, out var list))
				{
					list = new List<EventDateEntry>();
					map[key] = list;
				}
				list.Add(entry);
			}
		}
		return map;
	}

	private static HashSet<string> BuildBlackoutSet(IEnumerable<BlackoutGroup> groups)
	{
		var set = new HashSet<string>(StringComparer.Ordinal);
		foreach (var group in groups)
		{
			foreach (var date in group.Dates)
			{
				var key = NormalizeDate(date);
				if (!string.IsNullOrWhiteSpace(key))
				{
					set.Add(key);
				}
			}
		}
		return set;
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
}
