using CommunityToolkit.Maui;
using Microsoft.Extensions.Logging;
#if MACCATALYST
using Microsoft.Maui.LifecycleEvents;
#endif
#if IOS || MACCATALYST
using Foundation;
using Microsoft.Maui.Handlers;
using ObjCRuntime;
using WebKit;
#endif
#if MACCATALYST
using UIKit;
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

#if MACCATALYST
		builder.ConfigureLifecycleEvents(events =>
		{
			events.AddiOS(iOS =>
			{
				iOS.SceneWillConnect((scene, _, __) =>
				{
					if (!OperatingSystem.IsMacCatalyst())
					{
						return;
					}
					if (scene is not UIWindowScene windowScene)
					{
						return;
					}

					windowScene.Title = string.Empty;
					var titlebar = windowScene.Titlebar;
					if (titlebar != null)
					{
						titlebar.TitleVisibility = UITitlebarTitleVisibility.Hidden;
						titlebar.Toolbar = null;
					}
				});
			});
		});
#endif

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
