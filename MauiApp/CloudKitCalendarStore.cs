using System.Threading;

namespace SimpleEventsCalenderApp;

public static class CloudKitCalendarStore
{
#if IOS || MACCATALYST || TVOS
	private const string RecordType = "CalendarState";
	private const string RecordName = "calendar-state";
	private const string PayloadKey = "payload";
	private const string UpdatedAtKey = "updatedAt";
	private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(2);
	private static readonly CloudKit.CKRecordID RecordId = new(RecordName);
	private static string? _lastPayload;
	private static DateTimeOffset? _lastUpdatedAt;
	private static int _polling;
	private static bool _initialized;
	private static Timer? _pollTimer;

	public static event Action<string>? CloudStateChanged;

	private static bool AllowWrites
	{
#if TVOS
		get { return false; }
#else
		get { return true; }
#endif
	}

	public static void Initialize()
	{
		if (_initialized)
		{
			return;
		}

		_initialized = true;
		StartPolling();
	}

	public static async Task<string?> LoadAsync()
	{
		var record = await FetchRecordAsync();
		if (record == null)
		{
			return null;
		}

		var payload = GetPayload(record);
		var updatedAt = GetUpdatedAt(record);
		if (!string.IsNullOrWhiteSpace(payload))
		{
			_lastPayload = payload;
			_lastUpdatedAt = updatedAt;
		}

		return payload;
	}

	public static async Task<string> SaveAsync(string payload)
	{
		if (!AllowWrites || string.IsNullOrWhiteSpace(payload))
		{
			return string.Empty;
		}

		var record = await FetchRecordAsync() ?? new CloudKit.CKRecord(RecordType, RecordId);
		record[PayloadKey] = new Foundation.NSString(payload);
		var updatedAt = DateTimeOffset.UtcNow;
		record[UpdatedAtKey] = Foundation.NSDate.FromTimeIntervalSince1970(updatedAt.ToUnixTimeSeconds());

		var saved = await SaveRecordAsync(record);
		if (saved != null)
		{
			_lastPayload = payload;
			_lastUpdatedAt = updatedAt;
		}

		return string.Empty;
	}

	private static void StartPolling()
	{
		_pollTimer = new Timer(async _ => await PollOnceAsync(), null, PollInterval, PollInterval);
	}

	private static async Task PollOnceAsync()
	{
		if (Interlocked.Exchange(ref _polling, 1) == 1)
		{
			return;
		}

		try
		{
			var record = await FetchRecordAsync();
			if (record == null)
			{
				return;
			}

			var payload = GetPayload(record);
			if (string.IsNullOrWhiteSpace(payload))
			{
				return;
			}

			var updatedAt = GetUpdatedAt(record);
			if (_lastUpdatedAt.HasValue && updatedAt.HasValue && updatedAt <= _lastUpdatedAt)
			{
				return;
			}

			if (payload == _lastPayload)
			{
				return;
			}

			_lastPayload = payload;
			_lastUpdatedAt = updatedAt;
			CloudStateChanged?.Invoke(payload);
		}
		finally
		{
			Interlocked.Exchange(ref _polling, 0);
		}
	}

	private static CloudKit.CKDatabase Database => CloudKit.CKContainer.DefaultContainer.PrivateCloudDatabase;

	private static Task<CloudKit.CKRecord?> FetchRecordAsync()
	{
		var tcs = new TaskCompletionSource<CloudKit.CKRecord?>();
		Database.FetchRecord(RecordId, (record, error) =>
		{
			if (error != null)
			{
				if (IsNotFound(error))
				{
					tcs.TrySetResult(null);
				}
				else
				{
					tcs.TrySetResult(null);
				}
				return;
			}

			tcs.TrySetResult(record);
		});
		return tcs.Task;
	}

	private static Task<CloudKit.CKRecord?> SaveRecordAsync(CloudKit.CKRecord record)
	{
		var tcs = new TaskCompletionSource<CloudKit.CKRecord?>();
		Database.SaveRecord(record, (saved, error) =>
		{
			if (error != null)
			{
				tcs.TrySetResult(null);
				return;
			}

			tcs.TrySetResult(saved);
		});
		return tcs.Task;
	}

	private static string? GetPayload(CloudKit.CKRecord record)
	{
		return record[PayloadKey]?.ToString();
	}

	private static DateTimeOffset? GetUpdatedAt(CloudKit.CKRecord record)
	{
		if (record[UpdatedAtKey] is Foundation.NSDate updatedAt)
		{
			return DateTimeOffset.FromUnixTimeSeconds((long)updatedAt.SecondsSince1970);
		}

		if (record.ModificationDate != null)
		{
			return DateTimeOffset.FromUnixTimeSeconds((long)record.ModificationDate.SecondsSince1970);
		}

		return null;
	}

	private static bool IsNotFound(Foundation.NSError error)
	{
		if (error.Domain != "CKErrorDomain")
		{
			return false;
		}

		return (CloudKit.CKErrorCode)(long)error.Code == CloudKit.CKErrorCode.UnknownItem;
	}
#else
#pragma warning disable CS0067
	public static event Action<string>? CloudStateChanged;
#pragma warning restore CS0067

	public static void Initialize()
	{
	}

	public static Task<string?> LoadAsync()
	{
		return Task.FromResult<string?>(null);
	}

	public static Task<string> SaveAsync(string payload)
	{
		return Task.FromResult(string.Empty);
	}
#endif
}
