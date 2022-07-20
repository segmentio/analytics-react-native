/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useAnalytics } from '@segment/analytics-react-native';

const screenWidth = Dimensions.get('screen').width;

const Home = ({ navigation }: { navigation: any }) => {
  const { screen, track, identify, group, alias, reset, flush } =
    useAnalytics();

  const analyticsEvents = useMemo(() => {
    return [
      {
        color: colors.green,
        name: 'Track',
        testID: 'BUTTON_TRACK',
        onPress: () => {
          track('Track pressed', { foo: 'bar' });
        },
      },
      {
        color: colors.darkGreen,
        name: 'Screen',
        testID: 'BUTTON_SCREEN',
        onPress: () => {
          screen('Home Screen', { foo: 'bar' });
        },
      },
      {
        color: colors.purple,
        name: 'Identify',
        testID: 'BUTTON_IDENTIFY',
        onPress: () => {
          identify('user_2', { username: 'simplyTheBest' });
        },
      },
      {
        color: colors.lightPurple,
        name: 'Group',
        testID: 'BUTTON_GROUP',
        onPress: () => group('best-group', { companyId: 'Lala' }),
      },
      {
        color: colors.indigo,
        name: 'Alias',
        testID: 'BUTTON_ALIAS',
        onPress: () => alias('new-id'),
      },
    ];
  }, []);

  const clientEvents = [
    {
      color: colors.pink,
      name: 'Flush',
      testID: 'BUTTON_FLUSH',
      onPress: () => flush(),
    },
    {
      color: colors.orange,
      name: 'Reset',
      testID: 'BUTTON_RESET',
      onPress: () => reset(),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.page}>
        <Text style={styles.title}>Analytics Events</Text>
        <View style={styles.section}>
          {analyticsEvents.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={[styles.button, { backgroundColor: item.color }]}
              onPress={item.onPress}
              testID={item.testID}
            >
              <Text style={styles.text}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>Client Events</Text>
        <View style={styles.section}>
          {clientEvents.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={[styles.trackingButton, { backgroundColor: item.color }]}
              onPress={item.onPress}
              testID={item.testID}
            >
              <Text style={styles.text}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>Navigation</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.purple, width: screenWidth / 2 - 40 },
            ]}
            onPress={() => navigation.navigate('SecondPage')}
          >
            <Text style={styles.text}>Page</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.acai, width: screenWidth / 2 - 40 },
            ]}
            onPress={() => navigation.navigate('Modal')}
          >
            <Text style={styles.text}>Modal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  safeArea: { flex: 1, backgroundColor: colors.darkBlue },
  page: {
    flex: 1,
    paddingTop: 30,
  },
  trackingButton: {
    marginVertical: 5,
    marginHorizontal: 5,
    paddingHorizontal: 0,
    paddingVertical: 16,
    backgroundColor: colors.green,
    borderRadius: 8,
    width: screenWidth / 3 - 20,
  },
  button: {
    marginVertical: 8,
    marginHorizontal: 5,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: colors.green,
    borderRadius: 8,
    width: screenWidth / 1.5,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 24,
    textAlign: 'center',
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
  },
  section: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 40,
  },
  mainHeading: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default Home;
