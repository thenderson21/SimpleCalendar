using System.Text;
using System.Text.Json;
using CommunityToolkit.Maui.Storage;
using Microsoft.Maui.Storage;

namespace SimpleEventsCalenderApp;

public partial class MainPage : ContentPage
{
	private const string LastCalendarPathKey = "lastCalendarPath";
	private int _currentYear = DateTime.Now.Year;
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
		ConfigureMenuShortcuts();
		SetYearLabel(_currentYear);
		ICloudKeyValueStore.Initialize();
		ICloudKeyValueStore.CloudStateChanged += OnCloudStateChanged;
	}

	private void SetYearLabel(int year)
	{
		var label = year.ToString();
		YearLabelMobile.Text = label;
	}

	private void ConfigureMenuShortcuts()
	{
#if WINDOWS
		SettingsMenuItem.KeyboardAccelerators.Add(new KeyboardAccelerator
		{
			Key = ",",
			Modifiers = KeyboardAcceleratorModifiers.Control
		});
#elif MACCATALYST
		SettingsMenuItem.KeyboardAccelerators.Add(new KeyboardAccelerator
		{
			Key = ",",
			Modifiers = KeyboardAcceleratorModifiers.None
		});
#endif
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
				await _page.DisplayAlertAsync("Import", ex.Message, "OK");
				return null;
			}
		}

		public Task<string> GetDeviceIdiom()
		{
			return Task.FromResult(DeviceInfo.Idiom.ToString());
		}

		public Task<string?> LoadCloudState()
		{
			return Task.FromResult(ICloudKeyValueStore.Load());
		}

		public Task<string> SaveCloudState(string payload)
		{
			ICloudKeyValueStore.Save(payload);
			return Task.FromResult(string.Empty);
		}

	}

	private async void OnPrevYearClicked(object? sender, EventArgs e)
	{
		_currentYear -= 1;
		SetYearLabel(_currentYear);
		await WebView.EvaluateJavaScriptAsync("window.__APP__?.prevYear?.();");
	}

	private async void OnNextYearClicked(object? sender, EventArgs e)
	{
		_currentYear += 1;
		SetYearLabel(_currentYear);
		await WebView.EvaluateJavaScriptAsync("window.__APP__?.nextYear?.();");
	}

	private async void OnAddClicked(object? sender, EventArgs e)
	{
		await WebView.EvaluateJavaScriptAsync("window.__APP__?.openNewEvent?.();");
	}

	private async void OnMoreClicked(object? sender, EventArgs e)
	{
		var choice = await DisplayActionSheetAsync("More", "Cancel", null, "Import", "Export", "Settings");
		switch (choice)
		{
			case "Import":
				await WebView.EvaluateJavaScriptAsync("window.__APP__?.openImportModal?.();");
				break;
			case "Export":
				await WebView.EvaluateJavaScriptAsync("window.__APP__?.openExportModal?.();");
				break;
			case "Settings":
				 OnSettingsClicked(sender, EventArgs.Empty);
				break;
		}
	}

	private async void OnSaveClicked(object? sender, EventArgs e)
	{
		try
		{
			var json = await WebView.EvaluateJavaScriptAsync("window.__APP__?.exportState?.()");
			if (string.IsNullOrWhiteSpace(json))
			{
				await DisplayAlertAsync("Save", "No data to save.", "OK");
				return;
			}

#if IOS || MACCATALYST || TVOS
			if (await TrySaveToICloudAsync(json))
			{
				return;
			}
#endif

			var bytes = Encoding.UTF8.GetBytes(json);
			await using var stream = new MemoryStream(bytes);
			var result = await FileSaver.Default.SaveAsync("calendar.sevc", stream);
			if (!result.IsSuccessful)
			{
				await DisplayAlertAsync("Save", "Save canceled or failed.", "OK");
			}
		}
		catch (Exception ex)
		{
			await DisplayAlertAsync("Save", ex.Message, "OK");
		}
	}

	private async void OnOpenClicked(object? sender, EventArgs e)
	{
		try
		{
#if IOS || MACCATALYST || TVOS
			var iCloudContent = await TryReadFromICloudAsync();
			if (!string.IsNullOrWhiteSpace(iCloudContent))
			{
				await ImportCalendarContentAsync(iCloudContent);
				return;
			}
#endif

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
				await DisplayAlertAsync("Open", "File is empty.", "OK");
				return;
			}

			await ImportCalendarContentAsync(content);
		}
		catch (Exception ex)
		{
			await DisplayAlertAsync("Open", ex.Message, "OK");
		}
	}

	private async void OnNewCalendarClicked(object? sender, EventArgs e)
	{
		var confirmed = await DisplayAlertAsync("New Calendar", "Clear all events and blackouts?", "Clear", "Cancel");
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
		await WebView.EvaluateJavaScriptAsync("window.__APP__?.openSettings?.();");
	}

	private void OnCloudStateChanged(string payload)
	{
		if (string.IsNullOrWhiteSpace(payload))
		{
			return;
		}

		var encoded = JsonSerializer.Serialize(payload);
		MainThread.BeginInvokeOnMainThread(async () =>
		{
			await WebView.EvaluateJavaScriptAsync($"window.__APP__?.applyCloudState?.({encoded});");
		});
	}

	public Task ExecuteScriptAsync(string script)
	{
		return WebView.EvaluateJavaScriptAsync(script);
	}

	private async Task ImportCalendarContentAsync(string content)
	{
		var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(content));
		var encoded = JsonSerializer.Serialize(base64);
		var script = $"window.__APP__?.importFromBase64?.({encoded}, \"replace\");";
		await WebView.EvaluateJavaScriptAsync(script);
	}

#if IOS || MACCATALYST || TVOS
	private static string? TryGetICloudDocumentsDirectory()
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

		return documentsUrl.Path;
	}

	private static string? ResolveICloudCalendarPath()
	{
		var last = Preferences.Default.Get(LastCalendarPathKey, string.Empty);
		if (!string.IsNullOrWhiteSpace(last))
		{
			return last;
		}

		var directory = TryGetICloudDocumentsDirectory();
		if (string.IsNullOrWhiteSpace(directory))
		{
			return null;
		}

		return Path.Combine(directory, "calendar.sevc");
	}

	private static async Task<bool> TrySaveToICloudAsync(string json)
	{
		var path = ResolveICloudCalendarPath();
		if (string.IsNullOrWhiteSpace(path))
		{
			return false;
		}

		await File.WriteAllTextAsync(path, json);
		Preferences.Default.Set(LastCalendarPathKey, path);
		return true;
	}

	private static async Task<string?> TryReadFromICloudAsync()
	{
		var path = ResolveICloudCalendarPath();
		if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
		{
			return null;
		}

		return await File.ReadAllTextAsync(path);
	}
#endif

	// Help is provided by the system Help menu + help book bundle.
}
