using System.Globalization;
using UIKit;

namespace SimpleEventsCalenderTvOS;

public sealed class MonthView : UIView
{
	private static readonly string[] Weekdays = { "S", "M", "T", "W", "T", "F", "S" };
	private readonly Action<DateTime> _onDaySelected;

	public MonthView(int year, int month, CalendarIndex index, CalendarVisuals visuals, Action<DateTime> onDaySelected)
	{
		_onDaySelected = onDaySelected;
		TranslatesAutoresizingMaskIntoConstraints = false;
		BackgroundColor = visuals.CardColor;
		Layer.CornerRadius = 16;
		Layer.ShadowColor = UIColor.Black.CGColor;
		Layer.ShadowOpacity = 0.08f;
		Layer.ShadowRadius = 8;
		Layer.ShadowOffset = new CGSize(0, 4);

		var title = new UILabel
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Font = UIFont.SystemFontOfSize(22, UIFontWeight.Bold),
			TextColor = visuals.TextColor,
			Text = new DateTime(year, month, 1).ToString("MMMM", CultureInfo.InvariantCulture),
			TextAlignment = UITextAlignment.Center
		};

		var weekdays = new UIStackView
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Axis = UILayoutConstraintAxis.Horizontal,
			Distribution = UIStackViewDistribution.FillEqually,
			Spacing = 2
		};

		foreach (var day in Weekdays)
		{
			weekdays.AddArrangedSubview(new UILabel
			{
				Text = day,
				Font = UIFont.SystemFontOfSize(12, UIFontWeight.Semibold),
				TextColor = visuals.MutedColor,
				TextAlignment = UITextAlignment.Center
			});
		}

		var grid = BuildGrid(year, month, index, visuals);

		AddSubview(title);
		AddSubview(weekdays);
		AddSubview(grid);

		NSLayoutConstraint.ActivateConstraints(new[]
		{
			title.TopAnchor.ConstraintEqualTo(TopAnchor, 6),
			title.LeadingAnchor.ConstraintGreaterThanOrEqualTo(LeadingAnchor, 12),
			title.TrailingAnchor.ConstraintLessThanOrEqualTo(TrailingAnchor, -12),
			title.CenterXAnchor.ConstraintEqualTo(CenterXAnchor),
			title.HeightAnchor.ConstraintEqualTo(24),

			weekdays.TopAnchor.ConstraintEqualTo(title.BottomAnchor, 4),
			weekdays.LeadingAnchor.ConstraintEqualTo(LeadingAnchor, 8),
			weekdays.TrailingAnchor.ConstraintEqualTo(TrailingAnchor, -8),
			weekdays.HeightAnchor.ConstraintEqualTo(14),

			grid.TopAnchor.ConstraintEqualTo(weekdays.BottomAnchor, 2),
			grid.LeadingAnchor.ConstraintEqualTo(LeadingAnchor, 8),
			grid.TrailingAnchor.ConstraintEqualTo(TrailingAnchor, -8),
			grid.BottomAnchor.ConstraintEqualTo(BottomAnchor, -6)
		});
	}

	private UIStackView BuildGrid(int year, int month, CalendarIndex index, CalendarVisuals visuals)
	{
		var grid = new UIStackView
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Axis = UILayoutConstraintAxis.Vertical,
			Distribution = UIStackViewDistribution.FillEqually,
			Spacing = 0
		};

		var firstDay = new DateTime(year, month, 1);
		var startOffset = (int)firstDay.DayOfWeek;
		var daysInMonth = DateTime.DaysInMonth(year, month);
		var current = 1;

		for (var week = 0; week < 6; week++)
		{
			var row = new UIStackView
			{
				Axis = UILayoutConstraintAxis.Horizontal,
				Distribution = UIStackViewDistribution.FillEqually,
				Spacing = 0
			};

			for (var day = 0; day < 7; day++)
			{
				var cell = new DayCellView(visuals);
				int? dayNumber = null;
				DateTime? date = null;
				if (week == 0 && day < startOffset)
				{
					dayNumber = null;
				}
				else if (current <= daysInMonth)
				{
					dayNumber = current;
					date = new DateTime(year, month, current);
					current++;
				}

				if (date.HasValue)
				{
					var dateKey = date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
					var eventsForDay = index.EventsByDate.TryGetValue(dateKey, out var list)
						? (IReadOnlyList<EventDateEntry>)list
						: Array.Empty<EventDateEntry>();
					var isBlackout = index.BlackoutDates.Contains(dateKey);
					var isToday = date.Value.Date == DateTime.Today;
					cell.Configure(date, dayNumber, isToday, isBlackout, eventsForDay, visuals);
					cell.DaySelected += _onDaySelected;
				}
				else
				{
					cell.Configure(null, null, false, false, Array.Empty<EventDateEntry>(), visuals);
				}

				row.AddArrangedSubview(cell);
			}

			grid.AddArrangedSubview(row);
		}

		return grid;
	}
}
