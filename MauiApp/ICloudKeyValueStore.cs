namespace SimpleEventsCalenderApp;

public static class ICloudKeyValueStore
{
#if IOS || MACCATALYST || TVOS
	private const string StateKey = "SimpleEventsCalendarState";
	private const string UpdatedKey = "SimpleEventsCalendarStateUpdatedAt";
	private static string? _lastSavedPayload;
	private static string? _lastSavedUpdatedAt;
	private static bool _initialized;

	public static event Action<string>? CloudStateChanged;

	public static void Initialize()
	{
		if (_initialized)
		{
			return;
		}

		_initialized = true;
		Foundation.NSUbiquitousKeyValueStore.DefaultStore.Synchronize();
		Foundation.NSNotificationCenter.DefaultCenter.AddObserver(
			Foundation.NSUbiquitousKeyValueStore.DidChangeExternallyNotification,
			_ => HandleExternalChange());
	}

	public static string? Load()
	{
		var store = Foundation.NSUbiquitousKeyValueStore.DefaultStore;
		store.Synchronize();
		return store[StateKey]?.ToString();
	}

	public static void Save(string payload)
	{
		if (string.IsNullOrWhiteSpace(payload))
		{
			return;
		}

		var store = Foundation.NSUbiquitousKeyValueStore.DefaultStore;
		var updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
		_lastSavedPayload = payload;
		_lastSavedUpdatedAt = updatedAt;
		store.SetString(payload, StateKey);
		store.SetString(updatedAt, UpdatedKey);
		store.Synchronize();
	}

	private static void HandleExternalChange()
	{
		var store = Foundation.NSUbiquitousKeyValueStore.DefaultStore;
		var payload = store[StateKey]?.ToString();
		if (string.IsNullOrWhiteSpace(payload))
		{
			return;
		}

		var updatedAt = store[UpdatedKey]?.ToString();
		if (payload == _lastSavedPayload && updatedAt == _lastSavedUpdatedAt)
		{
			return;
		}

		CloudStateChanged?.Invoke(payload);
	}
#else
	public static event Action<string>? CloudStateChanged;

	public static void Initialize()
	{
	}

	public static string? Load()
	{
		return null;
	}

	public static void Save(string payload)
	{
	}
#endif
}
