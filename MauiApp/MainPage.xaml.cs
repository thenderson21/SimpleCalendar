using System.Text;
using System.Text.Json;
using CommunityToolkit.Maui.Storage;
using Microsoft.Maui.Storage;

namespace SimpleEventsCalenderApp;

public partial class MainPage : ContentPage
{
	private static readonly FilePickerFileType CalendarFileType = new(new Dictionary<DevicePlatform, IEnumerable<string>>
	{
		{ DevicePlatform.MacCatalyst, new[] { "com.simpleeventscalendar.sevc" } },
		{ DevicePlatform.iOS, new[] { "com.simpleeventscalendar.sevc" } },
		{ DevicePlatform.WinUI, new[] { ".sevc" } },
		{ DevicePlatform.Android, new[] { "application/vnd.simpleeventscalendar+json" } },
	});

	public MainPage()
	{
		InitializeComponent();
		WebView.SetInvokeJavaScriptTarget(new HybridBridge(this));
	}

	private sealed class HybridBridge
	{
		private readonly MainPage _page;

		public HybridBridge(MainPage page)
		{
			_page = page;
		}

		public async Task<string?> PickImport()
		{
			try
			{
				var result = await FilePicker.Default.PickAsync();
				if (result == null)
				{
					return null;
				}

				await using var stream = await result.OpenReadAsync();
				using var reader = new StreamReader(stream);
				return await reader.ReadToEndAsync();
			}
			catch (Exception ex)
			{
				await _page.DisplayAlert("Import", ex.Message, "OK");
				return null;
			}
		}
	}

	private async void OnSaveClicked(object? sender, EventArgs e)
	{
		try
		{
			var json = await WebView.EvaluateJavaScriptAsync("window.__APP__?.exportState?.()");
			if (string.IsNullOrWhiteSpace(json))
			{
				await DisplayAlert("Save", "No data to save.", "OK");
				return;
			}

			var bytes = Encoding.UTF8.GetBytes(json);
			await using var stream = new MemoryStream(bytes);
			var result = await FileSaver.Default.SaveAsync("calendar.sevc", stream);
			if (!result.IsSuccessful)
			{
				await DisplayAlert("Save", "Save canceled or failed.", "OK");
			}
		}
		catch (Exception ex)
		{
			await DisplayAlert("Save", ex.Message, "OK");
		}
	}

	private async void OnOpenClicked(object? sender, EventArgs e)
	{
		try
		{
			var result = await FilePicker.Default.PickAsync(new PickOptions
			{
				FileTypes = CalendarFileType,
				PickerTitle = "Open Calendar"
			});
			if (result == null)
			{
				return;
			}

			await using var stream = await result.OpenReadAsync();
			using var reader = new StreamReader(stream);
			var content = await reader.ReadToEndAsync();
			if (string.IsNullOrWhiteSpace(content))
			{
				await DisplayAlert("Open", "File is empty.", "OK");
				return;
			}

			var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(content));
			var encoded = JsonSerializer.Serialize(base64);
			var script = $"window.__APP__?.importFromBase64?.({encoded}, \"replace\");";
			await WebView.EvaluateJavaScriptAsync(script);
		}
		catch (Exception ex)
		{
			await DisplayAlert("Open", ex.Message, "OK");
		}
	}

	private async void OnNewCalendarClicked(object? sender, EventArgs e)
	{
		var confirmed = await DisplayAlert("New Calendar", "Clear all events and blackouts?", "Clear", "Cancel");
		if (!confirmed)
		{
			return;
		}
		await WebView.EvaluateJavaScriptAsync("window.__APP__?.resetCalendar?.();");
	}

	private async void OnNewEventClicked(object? sender, EventArgs e)
	{
		await WebView.EvaluateJavaScriptAsync("window.__APP__?.openNewEvent?.();");
	}

	private async void OnNewBlackoutClicked(object? sender, EventArgs e)
	{
		await WebView.EvaluateJavaScriptAsync("window.__APP__?.openNewBlackout?.();");
	}

	private async void OnSettingsClicked(object? sender, EventArgs e)
	{
		await WebView.EvaluateJavaScriptAsync("document.getElementById('openSettings')?.click();");
	}

	private async void OnHelpClicked(object? sender, EventArgs e)
	{
		await DisplayAlert(
			"Help",
			"Use File → New to add events or blackout dates. Use File → Open/Save to manage calendar files.",
			"OK");
	}
}
