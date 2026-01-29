using System.Linq;
using UIKit;

namespace SimpleEventsCalenderTvOS;

public sealed class DayCellView : UIControl
{
	private readonly UILabel _numberLabel;
	private readonly UIView _numberWrap;
	private readonly UILabel _xLabel;
	private readonly UIStackView _dotsRow;
	private readonly UILabel _countLabel;
	private readonly CalendarVisuals _visuals;

	public DayCellView(CalendarVisuals visuals)
	{
		_visuals = visuals;
		TranslatesAutoresizingMaskIntoConstraints = false;
		BackgroundColor = UIColor.Clear;
		Layer.CornerRadius = 10;
		Layer.BorderWidth = 1;
		Layer.BorderColor = UIColor.Clear.CGColor;
		UserInteractionEnabled = true;

		_numberWrap = new UIView
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			BackgroundColor = UIColor.Clear
		};
		_numberWrap.Layer.CornerRadius = 8;

		_numberLabel = new UILabel
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Font = UIFont.SystemFontOfSize(13, UIFontWeight.Medium),
			TextColor = visuals.TextColor,
			TextAlignment = UITextAlignment.Center
		};

		_xLabel = new UILabel
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Font = UIFont.SystemFontOfSize(11, UIFontWeight.Bold),
			TextColor = visuals.BlackoutColor,
			TextAlignment = UITextAlignment.Center,
			Text = "X",
			Hidden = true
		};

		_dotsRow = new UIStackView
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Axis = UILayoutConstraintAxis.Horizontal,
			Spacing = 3,
			Alignment = UIStackViewAlignment.Center,
			Distribution = UIStackViewDistribution.FillProportionally,
		};

		_countLabel = new UILabel
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			Font = UIFont.SystemFontOfSize(9, UIFontWeight.Semibold),
			TextColor = UIColor.FromRGB(12, 15, 20),
			BackgroundColor = visuals.CountColor,
			TextAlignment = UITextAlignment.Center,
			Hidden = true
		};
		_countLabel.Layer.CornerRadius = 8;
		_countLabel.Layer.MasksToBounds = true;

		AddSubview(_numberWrap);
		_numberWrap.AddSubview(_numberLabel);
		AddSubview(_dotsRow);
		AddSubview(_xLabel);
		AddSubview(_countLabel);

		NSLayoutConstraint.ActivateConstraints(new[]
		{
			HeightAnchor.ConstraintEqualTo(28),
			_numberWrap.TopAnchor.ConstraintEqualTo(TopAnchor, 2),
			_numberWrap.CenterXAnchor.ConstraintEqualTo(CenterXAnchor),
			_numberWrap.WidthAnchor.ConstraintEqualTo(16),
			_numberWrap.HeightAnchor.ConstraintEqualTo(16),
			_numberLabel.CenterXAnchor.ConstraintEqualTo(_numberWrap.CenterXAnchor),
			_numberLabel.CenterYAnchor.ConstraintEqualTo(_numberWrap.CenterYAnchor),
			_dotsRow.TopAnchor.ConstraintEqualTo(_numberWrap.BottomAnchor, 1),
			_dotsRow.CenterXAnchor.ConstraintEqualTo(CenterXAnchor),
			_xLabel.TopAnchor.ConstraintEqualTo(_numberWrap.BottomAnchor, 0),
			_xLabel.CenterXAnchor.ConstraintEqualTo(CenterXAnchor),
			_countLabel.TopAnchor.ConstraintEqualTo(TopAnchor, -2),
			_countLabel.TrailingAnchor.ConstraintEqualTo(TrailingAnchor, -2),
			_countLabel.WidthAnchor.ConstraintGreaterThanOrEqualTo(14),
			_countLabel.HeightAnchor.ConstraintEqualTo(14)
		});
	}

	public DateTime? Date { get; private set; }
	public event Action<DateTime>? DaySelected;

	public void Configure(DateTime? date, int? dayNumber, bool isToday, bool isBlackout, IReadOnlyList<EventDateEntry> eventsForDay, CalendarVisuals visuals)
	{
		Date = date;
		if (!dayNumber.HasValue)
		{
			_numberLabel.Text = string.Empty;
			_xLabel.Hidden = true;
			_countLabel.Hidden = true;
			ClearDots();
			return;
		}

		_numberLabel.Text = dayNumber.Value.ToString();

		Layer.BorderColor = isToday ? visuals.TodayBorderColor.CGColor : UIColor.Clear.CGColor;
		Layer.BorderWidth = isToday ? 1 : 0;
		Layer.ShadowOpacity = 0;

		if (isBlackout)
		{
			_numberWrap.Layer.BorderWidth = 2;
			_numberWrap.Layer.BorderColor = visuals.BlackoutColor.CGColor;
			_xLabel.Hidden = false;
		}
		else
		{
			_numberWrap.Layer.BorderWidth = 0;
			_xLabel.Hidden = true;
		}

		ApplyEventIndicators(eventsForDay, visuals);
	}

	public override bool CanBecomeFocused => Date.HasValue;

	public override void DidUpdateFocus(UIFocusUpdateContext context, UIFocusAnimationCoordinator coordinator)
	{
		base.DidUpdateFocus(context, coordinator);
		coordinator.AddCoordinatedAnimations(() =>
		{
			if (Focused)
			{
				BackgroundColor = UIColor.FromRGBA(56, 211, 159, 0.2f);
				Layer.BorderColor = UIColor.FromRGBA(56, 211, 159, 0.5f).CGColor;
				Layer.BorderWidth = 1;
			}
			else
			{
				BackgroundColor = UIColor.Clear;
				Layer.BorderColor = UIColor.Clear.CGColor;
				Layer.BorderWidth = 0;
			}
		}, null);
	}

	public override void PressesEnded(NSSet<UIPress> presses, UIPressesEvent evt)
	{
		base.PressesEnded(presses, evt);
		if (!Date.HasValue)
		{
			return;
		}
		foreach (var press in presses)
		{
			if (press is UIPress { Type: UIPressType.Select })
			{
				DaySelected?.Invoke(Date.Value);
				break;
			}
		}
	}

	private void ApplyEventIndicators(IReadOnlyList<EventDateEntry> eventsForDay, CalendarVisuals visuals)
	{
		ClearDots();
		_countLabel.Hidden = true;

		if (eventsForDay == null || eventsForDay.Count == 0)
		{
			return;
		}

		if (eventsForDay.Count > 1)
		{
			_countLabel.Text = eventsForDay.Count.ToString();
			_countLabel.Hidden = false;
			return;
		}

		var entry = eventsForDay[0];
		var color = entry.Type switch
		{
			"performer" => visuals.PerformerColor,
			"both" => visuals.BothColor,
			_ => visuals.VendorColor,
		};

			_dotsRow.AddArrangedSubview(MakeDot(color));
	}

	private UIView MakeDot(UIColor color)
	{
		var dot = new UIView
		{
			TranslatesAutoresizingMaskIntoConstraints = false,
			BackgroundColor = color
		};
		dot.Layer.CornerRadius = 3;
		NSLayoutConstraint.ActivateConstraints(new[]
		{
			dot.WidthAnchor.ConstraintEqualTo(5),
			dot.HeightAnchor.ConstraintEqualTo(5)
		});
		return dot;
	}

	private void ClearDots()
	{
		foreach (var view in _dotsRow.ArrangedSubviews)
		{
			_dotsRow.RemoveArrangedSubview(view);
			view.RemoveFromSuperview();
		}
	}
}
