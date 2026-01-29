using System.Globalization;
using UIKit;

namespace SimpleEventsCalenderTvOS;

public sealed class CalendarVisuals
{
	public UIColor VendorColor { get; }
	public UIColor PerformerColor { get; }
	public UIColor BothColor { get; }
	public UIColor BlackoutColor { get; } = UIColor.FromRGB(235, 63, 70);
	public UIColor CountColor { get; } = UIColor.FromRGB(255, 106, 136);
	public UIColor TextColor { get; } = UIColor.FromRGB(21, 28, 37);
	public UIColor MutedColor { get; } = UIColor.FromRGB(110, 122, 136);
	public UIColor CardColor { get; } = UIColor.FromRGB(244, 246, 250);
	public UIColor BackgroundColor { get; } = UIColor.FromRGB(236, 239, 245);
	public UIColor TodayBorderColor { get; } = UIColor.FromRGBA(255, 183, 74, 128);

	public CalendarVisuals(CalendarSettings settings)
	{
		VendorColor = ParseColor(settings.VendorColor, UIColor.FromRGB(43, 140, 255));
		PerformerColor = ParseColor(settings.PerformerColor, UIColor.FromRGB(255, 106, 136));
		BothColor = Blend(VendorColor, PerformerColor);
	}

	private static UIColor ParseColor(string? hex, UIColor fallback)
	{
		if (string.IsNullOrWhiteSpace(hex))
		{
			return fallback;
		}

		var cleaned = hex.Trim().TrimStart('#');
		if (cleaned.Length != 6)
		{
			return fallback;
		}

		if (int.TryParse(cleaned, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var value))
		{
			var r = (value >> 16) & 0xFF;
			var g = (value >> 8) & 0xFF;
			var b = value & 0xFF;
			return UIColor.FromRGB(r, g, b);
		}

		return fallback;
	}

	private static UIColor Blend(UIColor a, UIColor b)
	{
		a.GetRGBA(out var ar, out var ag, out var ab, out var aa);
		b.GetRGBA(out var br, out var bg, out var bb, out var ba);
		return UIColor.FromRGBA(
			(ar + br) / 2f,
			(ag + bg) / 2f,
			(ab + bb) / 2f,
			(aa + ba) / 2f);
	}
}
