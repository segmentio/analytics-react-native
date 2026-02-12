import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import {
  createClient,
  AnalyticsProvider,
  useAnalytics,
} from '@segment/analytics-react-native';

// ⚠️ REPLACE WITH YOUR WRITE KEY
const WRITE_KEY = 'YOUR_WRITE_KEY_HERE';

const segment = createClient({
  writeKey: WRITE_KEY,
  trackAppLifecycleEvents: true,
  debug: true, // Enable verbose logging
  flushAt: 20, // Flush after 20 events
  flushInterval: 30, // Flush every 30 seconds
  maxBatchSize: 10, // Keep batches small for testing
});

function TestScreen() {
  const { track, screen, flush, reset } = useAnalytics();
  const [eventCount, setEventCount] = useState(0);
  const [flushCount, setFlushCount] = useState(0);

  const trackEvent = () => {
    track('Test Event', {
      count: eventCount,
      timestamp: new Date().toISOString(),
      source: 'manual-test',
    });
    setEventCount(eventCount + 1);
    Alert.alert('Event Tracked', `Event #${eventCount + 1} tracked`);
  };

  const trackScreen = () => {
    screen('Test Screen', {
      timestamp: new Date().toISOString(),
    });
    Alert.alert('Screen Tracked', 'Screen view tracked');
  };

  const manualFlush = async () => {
    setFlushCount(flushCount + 1);
    console.log(`\n🔄 Manual Flush #${flushCount + 1}`);
    await flush();
    Alert.alert('Flush', `Flush #${flushCount + 1} initiated`);
  };

  const spamEvents = () => {
    console.log('\n💣 Spamming 100 events...');
    for (let i = 0; i < 100; i++) {
      track('Spam Event', {
        index: i,
        batch: 'spam',
        timestamp: new Date().toISOString(),
      });
    }
    setEventCount(eventCount + 100);
    Alert.alert('Spam Events', '100 events tracked. Tap Flush to send.');
  };

  const flushMultipleTimes = async () => {
    console.log('\n🔥 Flushing 5 times rapidly...');
    for (let i = 0; i < 5; i++) {
      console.log(`Flush attempt ${i + 1}/5`);
      await flush();
      setFlushCount(flushCount + i + 1);
    }
    Alert.alert('Multiple Flushes', '5 flush attempts completed');
  };

  const resetClient = () => {
    reset();
    setEventCount(0);
    setFlushCount(0);
    Alert.alert('Reset', 'Client reset. All state cleared.');
  };

  const testSequentialBatches = () => {
    console.log('\n📦 Creating multiple batches for sequential test...');
    // Create 50 events (with maxBatchSize=10, this is 5 batches)
    for (let i = 0; i < 50; i++) {
      track('Sequential Test Event', {
        index: i,
        batch: Math.floor(i / 10),
        timestamp: new Date().toISOString(),
      });
    }
    setEventCount(eventCount + 50);
    Alert.alert(
      'Sequential Test',
      '50 events tracked. Will create 5 batches. Tap Flush.'
    );
  };

  const testStateInfo = () => {
    // Display current state info
    Alert.alert(
      'Test Info',
      `Events tracked: ${eventCount}\nFlushes: ${flushCount}\n\nCheck console for detailed logs.`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>TAPI Backoff Manual Test</Text>
          <Text style={styles.subtitle}>
            Events: {eventCount} | Flushes: {flushCount}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Operations</Text>
          <TouchableOpacity
            testID="BUTTON_TRACK"
            style={styles.button}
            onPress={trackEvent}
          >
            <Text style={styles.buttonText}>Track Event</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="BUTTON_SCREEN"
            style={styles.button}
            onPress={trackScreen}
          >
            <Text style={styles.buttonText}>Track Screen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="BUTTON_FLUSH"
            style={styles.buttonPrimary}
            onPress={manualFlush}
          >
            <Text style={styles.buttonTextPrimary}>Flush</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate Limiting Tests</Text>
          <TouchableOpacity style={styles.buttonDanger} onPress={spamEvents}>
            <Text style={styles.buttonTextDanger}>Spam Events (100)</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Creates 100 events. Use with Flush Multiple Times to trigger 429.
          </Text>

          <TouchableOpacity
            style={styles.buttonDanger}
            onPress={flushMultipleTimes}
          >
            <Text style={styles.buttonTextDanger}>
              Flush Multiple Times (5x)
            </Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Attempts 5 rapid flushes. May trigger rate limiting.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sequential Processing Test</Text>
          <TouchableOpacity
            style={styles.buttonWarning}
            onPress={testSequentialBatches}
          >
            <Text style={styles.buttonText}>
              Test Sequential Batches (50 events)
            </Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Creates 5 batches. If rate limited on first batch, remaining should
            not be sent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Utilities</Text>
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={testStateInfo}
          >
            <Text style={styles.buttonText}>Show State Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="BUTTON_RESET"
            style={styles.buttonSecondary}
            onPress={resetClient}
          >
            <Text style={styles.buttonText}>Reset Client</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>📋 Instructions:</Text>
          <Text style={styles.instructionsText}>
            1. Enable React Native logs to see backoff behavior{'\n'}
            2. Track events and flush normally to verify baseline{'\n'}
            3. Use "Spam Events" + "Flush Multiple Times" to trigger 429{'\n'}
            4. Watch console for rate limiting messages{'\n'}
            5. Close app and reopen to test state persistence{'\n'}
            {'\n'}
            See README.md for detailed test scenarios.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  if (WRITE_KEY === 'YOUR_WRITE_KEY_HERE') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Configuration Required</Text>
          <Text style={styles.errorText}>
            Please edit App.tsx and replace YOUR_WRITE_KEY_HERE with your actual
            Segment writeKey.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AnalyticsProvider client={segment}>
      <TestScreen />
    </AnalyticsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#8E8E93',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonWarning: {
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDanger: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 8,
  },
  instructions: {
    backgroundColor: '#E5F5FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
