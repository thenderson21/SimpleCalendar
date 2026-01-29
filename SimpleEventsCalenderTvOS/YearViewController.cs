using UIKit;

namespace SimpleEventsCalenderTvOS;

public sealed class YearViewController : UIViewController
{
	private CalendarState _state = CalendarState.Empty;
	private int _year = DateTime.Today.Year;
	private UILabel? _yearLabel;
	private DetailOverlayView? _detailOverlay;

	public override void ViewDidLoad()
	{
		base.ViewDidLoad();
		View.BackgroundColor = UIColor.FromRGB(236, 239, 245);
		_ = LoadAsync();
	}

	private async Task LoadAsync()
	{
		_state = await CalendarDataLoader.LoadAsync();
		InvokeOnMainThread(BuildUI);
	}

	private void BuildUI()
	{
		View.Subviews.ToList().ForEach(v => v.RemoveFromSuperview());

		var headerRow = BuildHeaderRow();
		var visuals = new CalendarVisuals(_state.Settings);
		var index = new CalendarIndex(_state);
		var monthGrid = BuildMonthGrid(index, visuals);

		View.AddSubview(headerRow);
		View.AddSubview(monthGrid);

		NSLayoutConstraint.ActivateConstraints(new[]
		{
			headerRow.TopAnchor.ConstraintEqualTo(View.SafeAreaLayoutGuide.TopAnchor, 8),
			headerRow.LeadingAnchor.ConstraintEqualTo(View.SafeAreaLayoutGuide.LeadingAnchor, 44),
			headerRow.TrailingAnchor.ConstraintEqualTo(View.SafeAreaLayoutGuide.TrailingAnchor, -44),
			headerRow.HeightAnchor.ConstraintEqualTo(40),

			monthGrid.TopAnchor.ConstraintEqualTo(headerRow.BottomAnchor, 10),
			monthGrid.LeadingAnchor.ConstraintEqualTo(View.SafeAreaLayoutGuide.LeadingAnchor, 44),
			monthGrid.TrailingAnchor.ConstraintEqualTo(View.SafeAreaLayoutGuide.TrailingAnchor, -44),
			monthGrid.BottomAnchor.ConstraintEqualTo(View.SafeAreaLayoutGuide.BottomAnchor, -8),
		});
	}

	private UIButton MakeYearButton(string title, Action onTap)
	{
		var button = UIButton.FromType(UIButtonType.Custom);
		button.TranslatesAutoresizingMaskIntoConstraints = false;
		var textColor = UIColor.FromRGB(21, 28, 37);
		var attributes = new UIStringAttributes
		{
			Font = UIFont.SystemFontOfSize(26, UIFontWeight.Bold),
			ForegroundColor = textColor
		};
		button.SetAttributedTitle(new NSAttributedString(title, attributes), UIControlState.Normal);
		button.SetAttributedTitle(new NSAttributedString(title, attributes), UIControlState.Focused);
		button.SetAttributedTitle(new NSAttributedString(title, attributes), UIControlState.Highlighted);
		button.TintColor = textColor;
		button.BackgroundColor = UIColor.FromRGB(244, 246, 250);
		button.Layer.CornerRadius = 12;
		button.TouchUpInside += (_, _) => onTap();
		button.PrimaryActionTriggered += (_, _) => onTap();
		button.WidthAnchor.ConstraintEqualTo(52).Active = true;
		button.HeightAnchor.ConstraintEqualTo(40).Active = true;
		return button;
	}

	private void ChangeYear(int delta)
	{
		_year += delta;
		BuildUI();
	}

	private UIView BuildHeaderRow()
	{
		var headerRow = new UIView
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
		};

		var prevButton = MakeYearButton("◀", () => ChangeYear(-1));
		var nextButton = MakeYearButton("▶", () => ChangeYear(1));

		_yearLabel = new UILabel
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Font = UIFont.SystemFontOfSize(34, UIFontWeight.Bold),
			TextColor = UIColor.FromRGB(21, 28, 37),
			Text = _year.ToString(),
			TextAlignment = UITextAlignment.Center
		};

		var centerStack = new UIStackView
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Axis = UILayoutConstraintAxis.Horizontal,
			Alignment = UIStackViewAlignment.Center,
			Spacing = 12
		};
		centerStack.AddArrangedSubview(prevButton);
		centerStack.AddArrangedSubview(_yearLabel);
		centerStack.AddArrangedSubview(nextButton);

		headerRow.AddSubview(centerStack);

		NSLayoutConstraint.ActivateConstraints(new[]
		{
			centerStack.CenterXAnchor.ConstraintEqualTo(headerRow.CenterXAnchor),
			centerStack.CenterYAnchor.ConstraintEqualTo(headerRow.CenterYAnchor),
		});

		return headerRow;
	}

	private UIStackView BuildMonthGrid(CalendarIndex index, CalendarVisuals visuals)
	{
		var grid = new UIStackView
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Axis = UILayoutConstraintAxis.Vertical,
			Spacing = 10,
			Distribution = UIStackViewDistribution.FillEqually
		};

		for (var row = 0; row < 4; row++)
		{
			var rowStack = new UIStackView
			{
				Axis = UILayoutConstraintAxis.Horizontal,
				Spacing = 16,
				Distribution = UIStackViewDistribution.FillEqually,
			};

			for (var col = 0; col < 3; col++)
			{
				var month = row * 3 + col + 1;
				var monthView = new MonthView(_year, month, index, visuals, ShowDayDetail);
				rowStack.AddArrangedSubview(monthView);
			}

			grid.AddArrangedSubview(rowStack);
		}

		return grid;
	}

	private void ShowDayDetail(DateTime date)
	{
		var overlay = new DetailOverlayView
		{
			Alpha = 0
		};
		overlay.DismissRequested += () => DismissOverlay(overlay);

		var card = new UIView
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			BackgroundColor = UIColor.FromRGB(244, 246, 250),
		};
		card.Layer.CornerRadius = 20;
		card.UserInteractionEnabled = true;

		var title = new UILabel
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Font = UIFont.SystemFontOfSize(26, UIFontWeight.Bold),
			TextColor = UIColor.FromRGB(21, 28, 37),
			Text = date.ToString("dddd, MMMM d, yyyy")
		};

		var close = UIButton.FromType(UIButtonType.System);
		close.TranslatesAutoresizingMaskIntoConstraints = false;
		close.SetTitle("Close", UIControlState.Normal);
		close.SetTitle("Close", UIControlState.Focused);
		close.TitleLabel.Font = UIFont.SystemFontOfSize(16, UIFontWeight.Semibold);
		close.SetImage(UIImage.GetSystemImage("xmark.circle.fill"), UIControlState.Normal);
		close.ImageEdgeInsets = new UIEdgeInsets(0, -6, 0, 6);
		close.TintColor = UIColor.FromRGB(110, 122, 136);
		close.PrimaryActionTriggered += (_, _) => DismissOverlay(overlay);
		close.TouchUpInside += (_, _) => DismissOverlay(overlay);

		var stack = new UIStackView
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Axis = UILayoutConstraintAxis.Vertical,
			Spacing = 12
		};

		var dateKey = date.ToString("yyyy-MM-dd");
		var events = BuildEventSummaries(dateKey);
		var blackouts = BuildBlackoutSummaries(dateKey);

		if (blackouts.Count > 0)
		{
			stack.AddArrangedSubview(MakeSectionTitle("Blackout groups"));
			foreach (var item in blackouts)
			{
				stack.AddArrangedSubview(MakeBodyLabel(item));
			}
		}

		if (events.Count > 0)
		{
			stack.AddArrangedSubview(MakeSectionTitle("Events"));
			foreach (var item in events)
			{
				stack.AddArrangedSubview(MakeBodyLabel(item));
			}
		}

		if (events.Count == 0 && blackouts.Count == 0)
		{
			stack.AddArrangedSubview(MakeBodyLabel("No items for this day."));
		}

		card.AddSubview(title);
		card.AddSubview(close);
		card.AddSubview(stack);

		overlay.AddSubview(card);
		View.AddSubview(overlay);
		_detailOverlay = overlay;

		NSLayoutConstraint.ActivateConstraints(new[]
		{
			overlay.TopAnchor.ConstraintEqualTo(View.TopAnchor),
			overlay.BottomAnchor.ConstraintEqualTo(View.BottomAnchor),
			overlay.LeadingAnchor.ConstraintEqualTo(View.LeadingAnchor),
			overlay.TrailingAnchor.ConstraintEqualTo(View.TrailingAnchor),

			card.CenterXAnchor.ConstraintEqualTo(overlay.CenterXAnchor),
			card.CenterYAnchor.ConstraintEqualTo(overlay.CenterYAnchor),
			card.WidthAnchor.ConstraintEqualTo(overlay.WidthAnchor, 0.7f),
			card.HeightAnchor.ConstraintLessThanOrEqualTo(overlay.HeightAnchor, 0.7f),

			title.TopAnchor.ConstraintEqualTo(card.TopAnchor, 20),
			title.LeadingAnchor.ConstraintEqualTo(card.LeadingAnchor, 20),
			title.TrailingAnchor.ConstraintLessThanOrEqualTo(card.TrailingAnchor, -60),

			close.TopAnchor.ConstraintEqualTo(card.TopAnchor, 16),
			close.TrailingAnchor.ConstraintEqualTo(card.TrailingAnchor, -16),
			close.WidthAnchor.ConstraintEqualTo(32),
			close.HeightAnchor.ConstraintEqualTo(32),

			stack.TopAnchor.ConstraintEqualTo(title.BottomAnchor, 16),
			stack.LeadingAnchor.ConstraintEqualTo(card.LeadingAnchor, 20),
			stack.TrailingAnchor.ConstraintEqualTo(card.TrailingAnchor, -20),
			stack.BottomAnchor.ConstraintLessThanOrEqualTo(card.BottomAnchor, -20),
		});

		UIView.Animate(0.2, () => overlay.Alpha = 1);
		SetNeedsFocusUpdate();
		UpdateFocusIfNeeded();
	}

	private void DismissOverlay(DetailOverlayView overlay)
	{
		UIView.Animate(0.2, () => overlay.Alpha = 0, () => overlay.RemoveFromSuperview());
		if (_detailOverlay == overlay)
		{
			_detailOverlay = null;
			SetNeedsFocusUpdate();
			UpdateFocusIfNeeded();
		}
	}

	public override IUIFocusEnvironment[] PreferredFocusEnvironments
		=> _detailOverlay != null
			? new IUIFocusEnvironment[] { _detailOverlay }
			: base.PreferredFocusEnvironments;

	private UILabel MakeSectionTitle(string text)
	{
		return new UILabel
		{
			Font = UIFont.SystemFontOfSize(16, UIFontWeight.Semibold),
			TextColor = UIColor.FromRGB(110, 122, 136),
			Text = text
		};
	}

	private UILabel MakeBodyLabel(string text)
	{
		return new UILabel
		{
			Lines = 0,
			Font = UIFont.SystemFontOfSize(18, UIFontWeight.Medium),
			TextColor = UIColor.FromRGB(21, 28, 37),
			Text = text
		};
	}

	private List<string> BuildEventSummaries(string dateKey)
	{
		var list = new List<string>();
		foreach (var evt in _state.Events)
		{
			foreach (var entry in evt.Dates)
			{
				if (entry.Date != dateKey)
				{
					continue;
				}
				var type = entry.Type switch
				{
					"performer" => _state.Settings.PerformerLabel,
					"both" => $"{_state.Settings.VendorLabel} + {_state.Settings.PerformerLabel}",
					_ => _state.Settings.VendorLabel
				};
				list.Add($"{evt.Title} · {type}");
			}
		}
		return list;
	}

	private List<string> BuildBlackoutSummaries(string dateKey)
	{
		var list = new List<string>();
		foreach (var group in _state.Blackouts)
		{
			if (group.Dates.Contains(dateKey))
			{
				list.Add(string.IsNullOrWhiteSpace(group.Title) ? "Blackout" : group.Title);
			}
		}
		return list;
	}
}
