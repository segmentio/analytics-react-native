import 'react-native-gesture-handler';
import * as React from 'react';
// import RNBootSplash from 'react-native-bootsplash';
import {
  NavigationContainer,
  NavigationState,
  PartialState,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {
  createClient,
  AnalyticsProvider,
  CountFlushPolicy,
  // @ts-ignore unused for e2e tests
  // StartupFlushPolicy,
  // @ts-ignore unused for e2e tests
  // TimerFlushPolicy,
} from '@segment/analytics-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Home from './Home';
import SecondPage from './SecondPage';
import Modal from './Modal';
import {useState} from 'react';
import {Logger} from './plugins/Logger';
import {Platform} from 'react-native';

// import {AmplitudeSessionPlugin} from '@segment/analytics-react-native-plugin-amplitude-session';
// import { ConsentManager } from './plugins/ConsentManager';
// import { FirebasePlugin } from '@segment/analytics-react-native-plugin-firebase';
// import { FacebookAppEventsPlugin } from '@segment/analytics-react-native-plugin-facebook-app-events';
// import { IdfaPlugin } from '@segment/analytics-react-native-plugin-idfa';
// import { AdvertisingIdPlugin } from '@segment/analytics-react-native-plugin-advertising-id';
// import { ClevertapPlugin } from '@segment/analytics-react-native-plugin-clevertap';
// import { BrazePlugin } from '@segment/analytics-react-native-plugin-braze';

const segmentClient = createClient({
  writeKey: 'yup',
  maxBatchSize: 1000,
  trackDeepLinks: true,
  trackAppLifecycleEvents: true,
  autoAddSegmentDestination: true,
  collectDeviceId: true,
  debug: true,
  useSegmentEndpoints: true, //if you pass only domain/v1 as proxy setup, use this flag to append segment endpoints. Otherwise you can remove it and customise proxy completely
  // No flush policies - E2E tests use manual flush for full control
  // flushPolicies: [
  //   new CountFlushPolicy(1),
  // ],
  proxy: Platform.select({
    ios: 'http://localhost:9091/v1',
    android: 'http://10.0.2.2:9091/v1',
  }),
  cdnProxy: Platform.select({
    ios: 'http://localhost:9091/v1',
    android: 'http://10.0.2.2:9091/v1',
  }),
  // Use in-memory storage for E2E tests (no persistence across restarts)
  // This avoids module initialization issues with sovran's native bridge
  // The backoff implementation works identically with in-memory stores
  // Note: Persistence is tested via unit tests with mocked storage
  // storePersistor: AsyncStorage,
});

// Debug: Log when client is ready
console.log('[E2E DEBUG] Client created, init() called in background');
segmentClient.isReady.onChange((ready) => {
  console.log('[E2E DEBUG] Client isReady changed:', ready);
});

const LoggerPlugin = new Logger();

segmentClient.add({plugin: LoggerPlugin});

// To see an example Consent Manager uncomment the following
// const ConsentManagerPlugin = new ConsentManager();
// segmentClient.add({ plugin: ConsentManagerPlugin });

// To test the Firebase plugin make sure to add your own API_KEY in example/ios/GoogleService-Info.plist
// segmentClient.add({ plugin: new FirebasePlugin() });

// To test the Facebook App Events plugin make sure to add your Facebook App Id to Info.plist
// segmentClient.add({ plugin: new FacebookAppEventsPlugin() });
// const idfaPlugin = new IdfaPlugin();
// segmentClient.add({ plugin: idfaPlugin });

// segmentClient.add({plugin: new AmplitudeSessionPlugin()});

// segmentClient.add({ plugin: new BrazePlugin() });

// segmentClient.add({ plugin: new ClevertapPlugin() });

// segmentClient.add({
//   plugin: new AdvertisingIdPlugin(),
// });

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();
function MainStackScreen() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#262e4f',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <MainStack.Screen
        name="Home"
        component={Home}
        options={{headerShown: false}}
      />
      <MainStack.Screen
        name="SecondPage"
        component={SecondPage}
        options={{title: 'Second Page'}}
      />
    </MainStack.Navigator>
  );
}

const getActiveRouteName = (
  state: NavigationState | PartialState<NavigationState> | undefined,
): string => {
  if (!state || typeof state.index !== 'number') {
    return 'Unknown';
  }

  const route = state.routes[state.index];

  if (route.state) {
    return getActiveRouteName(route.state);
  }

  return route.name;
};

const App = () => {
  // React.useEffect(() => {
  //   void RNBootSplash.hide();
  // }, []);

  const [routeName, setRouteName] = useState('Unknown');

  return (
    <AnalyticsProvider client={segmentClient}>
      <NavigationContainer
        onStateChange={state => {
          const newRouteName = getActiveRouteName(state);

          if (routeName !== newRouteName) {
            void segmentClient.screen(newRouteName);

            setRouteName(newRouteName);
          }
        }}>
        <RootStack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#262e4f',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            presentation: 'modal',
          }}>
          <RootStack.Screen
            name="Main"
            component={MainStackScreen}
            options={{headerShown: false}}
          />
          <RootStack.Screen
            name="Modal"
            component={Modal}
            options={{headerBackTitle: 'Go back'}}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </AnalyticsProvider>
  );
};

export default App;
