const en = {
  status: {
    title: 'Apple Health',
    notSupportedTitle: 'Not available',
    notSupportedDescription: 'Apple Health is unavailable on this device.',
    notSupportedHint: 'Please use a supported iPhone or check the system settings.',
    permissionsTitle: 'Setup required',
    permissionsDescription:
      'Grant access so we can sync your activity. All data stays on this device.',
    partiallyConnectedTitle: 'Partial access',
    connectedDescription: 'Syncing {{count}} health metrics from Apple Health.',
    connectedTitle: 'All set',
    syncing: 'Syncing…',
    loading: 'Loading health data…',
    errorLabel: 'Sync error: {{message}}',
    lastSynced: 'Last synced {{relative}}',
    lastSyncedNever: 'Not synced yet',
    openHealthUnavailable: 'Unable to open the Health app on this device.',
  },
  actions: {
    allowAccess: 'Allow Access',
    managePermissions: 'Manage in Health app',
    syncNow: 'Sync now',
    syncing: 'Syncing…',
  },
  overview: {
    highlightsTitle: 'Highlights',
    empty: 'No samples recorded for today yet.',
    noTodayData: 'We’ll show your daily summary once new data arrives.',
  },
  summary: {
    viewDetail: 'Open Health summary',
  },
  trend: {
    title: 'Trends',
    subtitle: 'Recent trend for {{metric}}',
    empty: 'No trend data yet. Pull to refresh after new data is available.',
    range: {
      7: '7 days',
      30: '30 days',
      90: '90 days',
    },
  },
  moodCheckin: {
    title: 'State of mind',
    description: 'Review your most recent mood and keep tracking how you feel.',
    lastRecorded: 'Last recorded {{relative}}',
    noData: 'No mood entries synced yet.',
    openHealth: 'Log in Health app',
    openHealthError: 'Unable to open the Health app.',
    syncMood: 'Sync latest mood',
  },
  units: {
    steps: 'steps',
    kilometers: 'km',
    kcal: 'kcal',
    bpm: 'bpm',
    hourShort: 'h',
    minuteShort: 'm',
  },
  metric: {
    noData: 'No data yet',
    sampleCount: '{{count}} samples',
    stepCount: {
      title: 'Steps',
    },
    distanceWalkingRunning: {
      title: 'Distance',
    },
    activeEnergyBurned: {
      title: 'Active energy',
    },
    appleExerciseTime: {
      title: 'Exercise minutes',
    },
    appleStandTime: {
      title: 'Stand minutes',
    },
    heartRate: {
      title: 'Heart rate',
      range: 'Range {{min}} – {{max}} bpm',
    },
    restingHeartRate: {
      title: 'Resting heart rate',
    },
    hrvSdnn: {
      title: 'HRV (SDNN)',
    },
    sleepAnalysis: {
      title: 'Sleep duration',
    },
    mindfulSession: {
      title: 'Mindfulness',
    },
    mood: {
      title: 'Mood',
    },
    defaultTitle: 'Health metric',
  },
  moodClassificationPositive: 'Positive',
  moodClassificationNeutral: 'Balanced',
  moodClassificationNegative: 'Low',
  moodClassificationUnknown: 'Unknown',
  moodScore: 'Score {{value}}',
} as const;

export default en;
