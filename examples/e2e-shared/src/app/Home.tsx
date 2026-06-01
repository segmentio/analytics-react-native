import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  UIManager,
  LayoutAnimation,
  StatusBar,
} from 'react-native';
import { useAnalytics } from '@segment/analytics-react-native';
import { segmentClient, logger, reconnect, onError } from './client';
import type { EventEntry } from './plugins/Logger';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ConnectionStatus = 'connected' | 'error' | 'unknown';

const Home = ({ navigation }: { navigation: any }) => {
  const { screen, track, identify, group, alias, reset, flush } =
    useAnalytics();

  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [autoFlush, setAutoFlush] = useState(true);
  const [writeKey, setWriteKey] = useState('yup');
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('unknown');
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = logger.subscribe(setEvents);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onError((error: any) => {
      setConnectionStatus('error');
      setLastError(error?.message ?? String(error));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (autoFlush) {
      segmentClient.flush();
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

  const handleReconnect = useCallback(() => {
    setConnectionStatus('unknown');
    setLastError(null);
    reconnect(writeKey);
    setConnectionStatus('connected');
  }, [writeKey]);

  const toggleSection = (
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((prev) => !prev);
  };

  const sentCount = events.filter((e) => e.sent).length;
  const queuedCount = events.filter((e) => !e.sent).length;

  const statusColor =
    connectionStatus === 'connected'
      ? colors.green
      : connectionStatus === 'error'
      ? colors.red
      : colors.yellow;

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
            <Text style={styles.sectionTitle}>
              {settingsExpanded ? '▼' : '▶'} Settings
            </Text>
          </TouchableOpacity>

          <View style={styles.quickSettings}>
            <TouchableOpacity
              style={[
                styles.toggle,
                { backgroundColor: autoFlush ? colors.green : colors.red },
              ]}
              onPress={toggleAutoFlush}
              testID="TOGGLE_AUTOFLUSH"
            >
              <Text style={styles.toggleText}>
                AutoFlush: {autoFlush ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
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
              onPress={() => flush()}
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
            <Text style={styles.sectionTitle}>
              {statsExpanded ? '▼' : '▶'} Stats
            </Text>
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
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={styles.statLabel}>
                {connectionStatus === 'connected'
                  ? 'OK'
                  : connectionStatus === 'error'
                  ? 'Error'
                  : 'Idle'}
              </Text>
            </View>
          </View>

          {lastError && (
            <Text style={styles.errorText} numberOfLines={2}>
              {lastError}
            </Text>
          )}

          {statsExpanded && (
            <View style={styles.eventLog}>
              {events.length === 0 && (
                <Text style={styles.emptyText}>No events yet</Text>
              )}
              {[...events].reverse().map((entry, i) => (
                <View key={i} style={styles.eventRow}>
                  <View
                    style={[
                      styles.eventDot,
                      {
                        backgroundColor: entry.sent
                          ? colors.green
                          : colors.orange,
                      },
                    ]}
                  />
                  <Text style={styles.eventType}>{entry.type}</Text>
                  <Text style={styles.eventName} numberOfLines={1}>
                    {entry.name}
                  </Text>
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
  },
  quickSettings: { flexDirection: 'row', marginBottom: 4 },
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
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
    color: colors.red,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
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
  eventTime: { color: '#888', fontSize: 11 },
});

export default Home;
