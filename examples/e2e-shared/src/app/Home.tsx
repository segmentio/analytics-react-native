import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Platform,
  UIManager,
  LayoutAnimation,
  StatusBar,
} from 'react-native';
import { useAnalytics } from '@segment/analytics-react-native';
import { segmentClient, logger, reconnect, onError } from './client';
import type { EventEntry, EventStatus } from './plugins/Logger';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ConnectionStatus = 'connected' | 'network_error' | 'server_error' | 'idle';

interface ErrorInfo {
  message: string;
  trace: string;
}

const Home = ({ navigation }: { navigation: any }) => {
  const { screen, track, identify, group, alias, reset, flush } =
    useAnalytics();

  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [autoFlush, setAutoFlush] = useState(true);
  const [writeKey, setWriteKey] = useState('yup');
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle');
  const [lastError, setLastError] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    const unsub = logger.subscribe(setEvents);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onError((error: any) => {
      const statusCode = error?.statusCode ?? -1;
      const hasServerResponse = statusCode > 0;
      setConnectionStatus(hasServerResponse ? 'server_error' : 'network_error');

      const message = error?.message ?? String(error);
      const parts = [message];
      if (statusCode > 0) parts.push(`HTTP ${statusCode}`);
      if (error?.type !== undefined) parts.push(`type: ${error.type}`);
      if (error?.innerError) {
        const inner = error.innerError;
        parts.push(inner?.stack ?? inner?.message ?? String(inner));
      } else if (error?.stack) {
        parts.push(error.stack);
      }
      setLastError({ message, trace: parts.join('\n') });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (autoFlush) {
      let hadError = false;
      const unsub = onError(() => {
        hadError = true;
      });
      segmentClient.flush().then(() => {
        unsub();
        if (!hadError) {
          const hasSent = logger.getEvents().some((e) => e.status === 'sent');
          if (hasSent) setConnectionStatus('connected');
        }
      });
    }
  }, [autoFlush]);

  const toggleAutoFlush = useCallback(() => {
    const newValue = !autoFlush;
    if (newValue) {
      segmentClient.addFlushPolicy(
        new (require('@segment/analytics-react-native').CountFlushPolicy)(5)
      );
    } else {
      const policies = [...segmentClient.getFlushPolicies()];
      policies.forEach((p) => segmentClient.removeFlushPolicy(p));
    }
    setAutoFlush(newValue);
  }, [autoFlush]);

  const handleFlush = useCallback(async () => {
    let hadError = false;
    const unsub = onError(() => {
      hadError = true;
    });
    await flush();
    unsub();
    if (!hadError) {
      const hasSent = logger.getEvents().some((e) => e.status === 'sent');
      if (hasSent) setConnectionStatus('connected');
    }
  }, [flush]);

  const handleReconnect = useCallback(() => {
    setConnectionStatus('idle');
    setLastError(null);
    reconnect(writeKey);
  }, [writeKey]);

  const toggleSection = (
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((prev) => !prev);
  };

  const sentCount = events.filter((e) => e.status === 'sent').length;
  const failedCount = events.filter((e) => e.status === 'failed').length;
  const queuedCount = events.filter((e) => e.status === 'queued').length;

  const statusColor =
    connectionStatus === 'connected'
      ? colors.green
      : connectionStatus === 'network_error'
      ? colors.red
      : connectionStatus === 'server_error'
      ? colors.orange
      : colors.yellow;

  const eventColor = (status: EventStatus) =>
    status === 'sent'
      ? colors.green
      : status === 'failed'
      ? colors.red
      : colors.orange;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Settings Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection(setSettingsExpanded)}
          >
            <Text style={styles.sectionTitle}>Settings</Text>
          </TouchableOpacity>

          <View style={styles.quickSettings}>
            <Text style={styles.toggleLabel}>AutoFlush</Text>
            <Switch
              value={autoFlush}
              onValueChange={toggleAutoFlush}
              trackColor={{ false: colors.red, true: colors.green }}
              testID="TOGGLE_AUTOFLUSH"
            />
          </View>

          {settingsExpanded && (
            <View style={styles.settingsBody}>
              <Text style={styles.label}>Write Key</Text>
              <View style={styles.row}>
                <TextInput
                  style={styles.input}
                  value={writeKey}
                  onChangeText={setWriteKey}
                  placeholder="Enter write key..."
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="INPUT_WRITE_KEY"
                />
                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    { backgroundColor: colors.purple },
                  ]}
                  onPress={handleReconnect}
                  testID="BUTTON_RECONNECT"
                >
                  <Text style={styles.smallButtonText}>Connect</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.green }]}
              onPress={() => track('Track pressed', { foo: 'bar' })}
              testID="BUTTON_TRACK"
            >
              <Text style={styles.buttonText}>Track</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.darkGreen },
              ]}
              onPress={() => screen('Home Screen', { foo: 'bar' })}
              testID="BUTTON_SCREEN"
            >
              <Text style={styles.buttonText}>Screen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.purple }]}
              onPress={() => identify('user_2', { username: 'simplyTheBest' })}
              testID="BUTTON_IDENTIFY"
            >
              <Text style={styles.buttonText}>Identify</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.lightPurple },
              ]}
              onPress={() => group('best-group', { companyId: 'Lala' })}
              testID="BUTTON_GROUP"
            >
              <Text style={styles.buttonText}>Group</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.indigo }]}
              onPress={() => alias('new-id')}
              testID="BUTTON_ALIAS"
            >
              <Text style={styles.buttonText}>Alias</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.wideButton, { backgroundColor: colors.pink }]}
              onPress={handleFlush}
              testID="BUTTON_FLUSH"
            >
              <Text style={styles.buttonText}>Flush</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.wideButton, { backgroundColor: colors.orange }]}
              onPress={() => reset()}
              testID="BUTTON_RESET"
            >
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.wideButton, { backgroundColor: colors.acai }]}
              onPress={() => navigation.navigate('SecondPage')}
            >
              <Text style={styles.buttonText}>Page</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.wideButton, { backgroundColor: colors.darkGreen }]}
              onPress={() => navigation.navigate('Modal')}
            >
              <Text style={styles.buttonText}>Modal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection(setStatsExpanded)}
          >
            <Text style={styles.sectionTitle}>Stats</Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: colors.green }]}>
                {sentCount}
              </Text>
              <Text style={styles.statLabel}>Sent</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: colors.orange }]}>
                {queuedCount}
              </Text>
              <Text style={styles.statLabel}>Queued</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: colors.red }]}>
                {failedCount}
              </Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
            <View style={styles.stat}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={styles.statLabel}>
                {connectionStatus === 'connected'
                  ? 'OK'
                  : connectionStatus === 'network_error'
                  ? 'Unreachable'
                  : connectionStatus === 'server_error'
                  ? 'Rejected'
                  : 'Idle'}
              </Text>
            </View>
          </View>

          {lastError && (
            <Text
              style={[styles.errorText, { color: statusColor }]}
              numberOfLines={2}
            >
              {lastError.message}
            </Text>
          )}

          {statsExpanded && (
            <View style={styles.eventLog}>
              <View style={styles.versionRow}>
                <Text style={styles.versionText}>
                  RN {Platform.constants.reactNativeVersion.major}.
                  {Platform.constants.reactNativeVersion.minor}.
                  {Platform.constants.reactNativeVersion.patch} · {Platform.OS}
                </Text>
              </View>
              {lastError && (
                <View style={styles.errorTrace}>
                  <Text style={styles.errorTraceText}>{lastError.trace}</Text>
                </View>
              )}
              {events.length === 0 && (
                <Text style={styles.emptyText}>No events yet</Text>
              )}
              {[...events].reverse().map((entry, i) => (
                <View key={i} style={styles.eventRow}>
                  <View
                    style={[
                      styles.eventDot,
                      { backgroundColor: eventColor(entry.status) },
                    ]}
                  />
                  <Text style={styles.eventType}>{entry.type}</Text>
                  <Text style={styles.eventName} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  {entry.statusCode !== undefined && (
                    <Text style={styles.eventStatus}>{entry.statusCode}</Text>
                  )}
                  <Text style={styles.eventTime}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const colors = {
  green: '#52bd95',
  darkGreen: '#28a745',
  acai: '#5c4d6b',
  purple: '#6152bd',
  lightPurple: '#6f42c1',
  indigo: '#6610f2',
  pink: '#e83e8c',
  red: '#dc3545',
  orange: '#fd7e14',
  yellow: '#ffc107',
  darkBlue: '#262e4f',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBlue,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 32 : 0,
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleLabel: { color: '#ccc', fontSize: 14, marginRight: 8 },
  settingsBody: { marginTop: 12 },
  label: { color: '#ccc', fontSize: 13, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: 'white',
    fontSize: 14,
    marginRight: 8,
  },
  smallButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  smallButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  wideButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#ccc', fontSize: 12, marginTop: 2 },
  statusDot: { width: 20, height: 20, borderRadius: 10, marginBottom: 2 },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorTrace: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  errorTraceText: {
    color: '#ccc',
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  versionRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 4,
  },
  versionText: { color: '#888', fontSize: 12, textAlign: 'center' },
  eventLog: { marginTop: 8 },
  emptyText: { color: '#666', textAlign: 'center', fontSize: 13 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  eventType: { color: '#aaa', fontSize: 11, width: 50 },
  eventName: { color: 'white', fontSize: 13, flex: 1, marginRight: 8 },
  eventStatus: { color: '#aaa', fontSize: 11, marginRight: 6 },
  eventTime: { color: '#888', fontSize: 11 },
});

export default Home;
