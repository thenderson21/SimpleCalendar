using System.Text;
using CommunityToolkit.Maui.Storage;
using Microsoft.Maui.Storage;

namespace SimpleEventsCalenderApp;

public partial class MainPage : ContentPage
{
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

	private async void OnExportClicked(object? sender, EventArgs e)
	{
		try
		{
			var script =
				"JSON.stringify({events: JSON.parse(localStorage.getItem('event-loom-events') || '[]'), blackouts: JSON.parse(localStorage.getItem('event-loom-blackouts') || '[]')}, null, 2)";
			var json = await WebView.EvaluateJavaScriptAsync(script);
			if (string.IsNullOrWhiteSpace(json))
			{
				await DisplayAlert("Export", "No data to export.", "OK");
				return;
			}

			var bytes = Encoding.UTF8.GetBytes(json);
			await using var stream = new MemoryStream(bytes);
			var result = await FileSaver.Default.SaveAsync("events-export.json", stream);
			if (!result.IsSuccessful)
			{
				await DisplayAlert("Export", "Export canceled or failed.", "OK");
			}
		}
		catch (Exception ex)
		{
			await DisplayAlert("Export", ex.Message, "OK");
		}
	}
}
