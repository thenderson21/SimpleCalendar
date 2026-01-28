using CommunityToolkit.Maui;
using Microsoft.Extensions.Logging;
#if IOS || MACCATALYST
using Foundation;
using Microsoft.Maui.Handlers;
using ObjCRuntime;
using WebKit;
#endif

namespace SimpleEventsCalenderApp;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.UseMauiCommunityToolkit()
			.ConfigureFonts(fonts =>
			{
				fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
				fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
			});

#if IOS || MACCATALYST
		HybridWebViewHandler.Mapper.AppendToMapping("EnableWebInspector", (handler, view) =>
		{
			if (handler.PlatformView is WKWebView wkView)
			{
				var selector = new Selector("setInspectable:");
				if (wkView.RespondsToSelector(selector))
				{
					wkView.SetValueForKey(NSNumber.FromBoolean(true), new NSString("inspectable"));
				}
			}
		});
#endif

#if DEBUG
		builder.Logging.AddDebug();
#endif

		return builder.Build();
	}
}
