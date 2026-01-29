using UIKit;

namespace SimpleEventsCalenderTvOS;

public sealed class DetailOverlayView : UIView
{
	public event Action? DismissRequested;

	public DetailOverlayView()
	{
		TranslatesAutoresizingMaskIntoConstraints = false;
		BackgroundColor = UIColor.FromRGBA(12, 15, 20, 0.55f);
		UserInteractionEnabled = true;
	}

	public override bool CanBecomeFocused => true;

	public override void PressesBegan(NSSet<UIPress> presses, UIPressesEvent evt)
	{
		foreach (var press in presses)
		{
			if (press is UIPress { Type: UIPressType.Menu })
			{
				DismissRequested?.Invoke();
				return;
			}
		}
		base.PressesBegan(presses, evt);
	}

	public override void PressesEnded(NSSet<UIPress> presses, UIPressesEvent evt)
	{
		foreach (var press in presses)
		{
			if (press is UIPress { Type: UIPressType.Menu })
			{
				DismissRequested?.Invoke();
				return;
			}
		}
		base.PressesEnded(presses, evt);
	}
}
