import 'react-native-gesture-handler';
import * as React from 'react';
import RNBootSplash from 'react-native-bootsplash';
import {
  NavigationContainer,
  NavigationState,
  PartialState,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  createClient,
  AnalyticsProvider,
} from '@segment/analytics-react-native';
import Home from './Home';
import SecondPage from './SecondPage';
import Modal from './Modal';
import { useState } from 'react';
import { Logger } from './plugins/Logger';

//To see an example Consent Manager uncomment the following
//@ts-ignore
// import { ConsentManager } from './plugins/ConsentManager';

// @ts-ignore
// import { FirebasePlugin } from '@segment/analytics-react-native-plugin-firebase';

// @ts-ignore
// import { FacebookAppEventsPlugin } from '@segment/analytics-react-native-plugin-facebook-app-events';

// @ts-ignore
// import { IdfaPlugin } from '@segment/analytics-react-native-plugin-idfa';

// @ts-ignore
import { AmplitudeSessionPlugin } from '@segment/analytics-react-native-plugin-amplitude-session';

const segmentClient = createClient({
  writeKey: 'WRITE_KEY',
  trackAppLifecycleEvents: true,
  collectDeviceId: true,
  debug: true,
  trackDeepLinks: true,
});

const LoggerPlugin = new Logger();

segmentClient.add({ plugin: LoggerPlugin });

// To see an example Consent Manager uncomment the following
// const ConsentManagerPlugin = new ConsentManager();
// segmentClient.add({ plugin: ConsentManagerPlugin });

// To test the Firebase plugin make sure to add your own API_KEY in example/ios/GoogleService-Info.plist
// segmentClient.add({ plugin: new FirebasePlugin() });

// To test the Facebook App Events plugin make sure to add your Facebook App Id to Info.plist
// segmentClient.add({ plugin: new FacebookAppEventsPlugin() });

// segmentClient.add({ plugin: new IdfaPlugin() });

segmentClient.add({ plugin: new AmplitudeSessionPlugin() });

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
      }}
    >
      <MainStack.Screen
        name="Home"
        component={Home}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="SecondPage"
        component={SecondPage}
        options={{ title: 'Second Page' }}
      />
    </MainStack.Navigator>
  );
}

const getActiveRouteName = (
  state: NavigationState | PartialState<NavigationState> | undefined
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
  React.useEffect(() => {
    RNBootSplash.hide();
  }, []);

  // React.useEffect(() => {
  //   testSovran.subscribe((store) => {
  //     console.warn(store.message);
  //   });
  // });

  const [routeName, setRouteName] = useState('Unknown');

  return (
    <AnalyticsProvider client={segmentClient}>
      <NavigationContainer
        onStateChange={(state) => {
          const newRouteName = getActiveRouteName(state);

          if (routeName !== newRouteName) {
            segmentClient.screen(newRouteName);

            setRouteName(newRouteName);
          }
        }}
      >
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
          }}
        >
          <RootStack.Screen
            name="Main"
            component={MainStackScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="Modal"
            component={Modal}
            options={{ headerBackTitle: 'Go back' }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </AnalyticsProvider>
  );
};

export default App;
