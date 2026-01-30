namespace SimpleEventsCalenderApp;

public partial class MainWindow : Window
{
	private int _currentYear = DateTime.Now.Year;

	public MainWindow()
	{
		InitializeComponent();
		UpdateYearLabel();
	}

	private void UpdateYearLabel()
	{
		TitleYearLabel.Text = _currentYear.ToString();
	}

	private async void OnPrevYearClicked(object? sender, EventArgs e)
	{
		_currentYear -= 1;
		UpdateYearLabel();
		await InvokeWebAsync("window.__APP__?.prevYear?.();");
	}

	private async void OnNextYearClicked(object? sender, EventArgs e)
	{
		_currentYear += 1;
		UpdateYearLabel();
		await InvokeWebAsync("window.__APP__?.nextYear?.();");
	}

	private async void OnAddClicked(object? sender, EventArgs e)
	{
		await InvokeWebAsync("window.__APP__?.openNewEvent?.();");
	}

	private async Task InvokeWebAsync(string script)
	{
		if (Shell.Current?.CurrentPage is MainPage mainPage)
		{
			await mainPage.ExecuteScriptAsync(script);
		}
	}
}
