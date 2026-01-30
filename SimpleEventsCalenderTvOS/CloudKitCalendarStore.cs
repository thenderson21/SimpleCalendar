using System.Threading;

namespace SimpleEventsCalenderTvOS;

public static class CloudKitCalendarStore
{
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
}
