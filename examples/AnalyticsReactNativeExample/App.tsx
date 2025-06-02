// import 'react-native-gesture-handler';
// import * as React from 'react';
// // import RNBootSplash from 'react-native-bootsplash';
// import {
//   NavigationContainer,
//   NavigationState,
//   PartialState,
// } from '@react-navigation/native';
// import {createStackNavigator} from '@react-navigation/stack';
// import {
//   createClient,
//   AnalyticsProvider,
//   CountFlushPolicy,
//   ConsentPlugin,
//   SegmentClient,
//   // @ts-ignore unused for e2e tests
//   // StartupFlushPolicy,
//   // @ts-ignore unused for e2e tests
//   // TimerFlushPolicy,
// } from '@segment/analytics-react-native';
// import Home from './Home';
// import SecondPage from './SecondPage';
// import Modal from './Modal';
// import {useEffect, useState} from 'react';
// //import {Logger} from './plugins/Logger';

// // import {AmplitudeSessionPlugin} from '@segment/analytics-react-native-plugin-amplitude-session';
// // import { ConsentManager } from './plugins/ConsentManager';
// // import { FirebasePlugin } from '@segment/analytics-react-native-plugin-firebase';
// // import { FacebookAppEventsPlugin } from '@segment/analytics-react-native-plugin-facebook-app-events';
// // import { IdfaPlugin } from '@segment/analytics-react-native-plugin-idfa';
// // import { AdvertisingIdPlugin } from '@segment/analytics-react-native-plugin-advertising-id';
// // import { ClevertapPlugin } from '@segment/analytics-react-native-plugin-clevertap';
// // import { BrazePlugin } from '@segment/analytics-react-native-plugin-braze';
// import OTPublishersNativeSDK from 'react-native-onetrust-cmp';
// import { OneTrustConsentProvider } from './consent'

// // OTPublishersNativeSDK.startSDK(
// //   'cdn.cookielaw.org',
// //   '018f7e67-ea32-753c-9220-2eb2c94f452b-test',
// //   'en',
// //   {countryCode: 'us', regionCode:'ca'},
// //   true,
// // ).then((responseObject) => {
// //   const typedResponse = responseObject as {responseString:string};
// //   console.info('Download status is ' + typedResponse.responseString);
// //   // get full JSON object from responseObject.responseString
// // })
// // .catch((error) => {
// //   console.error(`OneTrust download failed with error ${error}`);
// // });



// // const segmentClient = createClient({
// //   writeKey: 'VRzdzieruD0trB00Tl7n8cdQDyEI8qIK',
// //   trackAppLifecycleEvents: true,
// //   collectDeviceId: true,
// //   debug: true,
// //   trackDeepLinks: true,
// //   flushPolicies: [
// //     new CountFlushPolicy(5),
// //     // These are disabled for E2E tests
// //     // new TimerFlushPolicy(1000),
// //     // new StartupFlushPolicy(),
// //   ],
// // });
// // console.log('check for consent settings in segment client', segmentClient.consentSettings.get());
// // const applicableCategories = ['C0004'];

// // const oneTrustProvider = new OneTrustConsentProvider(OTPublishersNativeSDK)
// // oneTrustProvider.setApplicableCategories(applicableCategories);
// // const oneTrustPlugin = new ConsentPlugin(oneTrustProvider);

// // segmentClient.add({ plugin: oneTrustPlugin });

// // oneTrustPlugin.start()
// // // const LoggerPlugin = new Logger();

// // // segmentClient.add({plugin: LoggerPlugin});

// // // To see an example Consent Manager uncomment the following
// // // const ConsentManagerPlugin = new ConsentManager();
// // // segmentClient.add({ plugin: ConsentManagerPlugin });

// // // To test the Firebase plugin make sure to add your own API_KEY in example/ios/GoogleService-Info.plist
// // // segmentClient.add({ plugin: new FirebasePlugin() });

// // // To test the Facebook App Events plugin make sure to add your Facebook App Id to Info.plist
// // // segmentClient.add({ plugin: new FacebookAppEventsPlugin() });
// // // const idfaPlugin = new IdfaPlugin();
// // // segmentClient.add({ plugin: idfaPlugin });

// // // segmentClient.add({plugin: new AmplitudeSessionPlugin()});

// // // segmentClient.add({ plugin: new BrazePlugin() });

// // // segmentClient.add({ plugin: new ClevertapPlugin() });

// // // segmentClient.add({
// // //   plugin: new AdvertisingIdPlugin(),
// // // });

// const MainStack = createStackNavigator();
// const RootStack = createStackNavigator();
// function MainStackScreen() {
//   return (
//     <MainStack.Navigator
//       screenOptions={{
//         headerStyle: {
//           backgroundColor: '#262e4f',
//         },
//         headerTintColor: '#fff',
//         headerTitleStyle: {
//           fontWeight: 'bold',
//         },
//       }}>
//       <MainStack.Screen
//         name="Home"
//         component={Home}
//         options={{headerShown: false}}
//       />
//       <MainStack.Screen
//         name="SecondPage"
//         component={SecondPage}
//         options={{title: 'Second Page'}}
//       />
//     </MainStack.Navigator>
//   );
// }

// const getActiveRouteName = (
//   state: NavigationState | PartialState<NavigationState> | undefined,
// ): string => {
//   if (!state || typeof state.index !== 'number') {
//     return 'Unknown';
//   }

//   const route = state.routes[state.index];

//   if (route.state) {
//     return getActiveRouteName(route.state);
//   }

//   return route.name;
// };

// const App = () => {
//   // React.useEffect(() => {
//   //   void RNBootSplash.hide();
//   // }, []);

//   const [segmentClient, setSegmentClient] = useState<SegmentClient | undefined>(undefined);
//   const [routeName, setRouteName] = useState('Unknown');
//   useEffect(() => {
//     const initializeSDKs = async () => {
//       try {
//         const responseObject = await OTPublishersNativeSDK.startSDK(
//           'cdn.cookielaw.org',
//           '018f7e67-ea32-753c-9220-2eb2c94f452b-test',
//           'en',
//           { countryCode: 'us', regionCode: 'ca' },
//           true,
//         );

//         const typedResponse = responseObject as { responseString: string };
//         console.info('Download status is ' + typedResponse.responseString);

//         // Proceed with Segment initialization
//         const client = createClient({
//           writeKey: 'VRzdzieruD0trB00Tl7n8cdQDyEI8qIK',
//           trackAppLifecycleEvents: true,
//           collectDeviceId: true,
//           debug: true,
//           trackDeepLinks: true,
//           flushPolicies: [new CountFlushPolicy(5)],
//         });

//         const applicableCategories = ['C0004'];
//         const oneTrustProvider = new OneTrustConsentProvider(OTPublishersNativeSDK);
//         oneTrustProvider.setApplicableCategories(applicableCategories);

//         const oneTrustPlugin = new ConsentPlugin(oneTrustProvider);
//         client.add({ plugin: oneTrustPlugin });

//         oneTrustPlugin.start();

//         setSegmentClient(client);
//       } catch (error) {
//         console.error(`OneTrust download failed with error ${error}`);
//       }
//     };

//     initializeSDKs();
//   }, []);

//   return (
//     <AnalyticsProvider client={segmentClient}>
//       <NavigationContainer
//         onStateChange={state => {
//           const newRouteName = getActiveRouteName(state);

//           if (segmentClient && routeName !== newRouteName) {
//             void segmentClient.screen(newRouteName);

//             setRouteName(newRouteName);
//           }
//         }}>
//         <RootStack.Navigator
//           screenOptions={{
//             headerStyle: {
//               backgroundColor: '#262e4f',
//             },
//             headerTintColor: '#fff',
//             headerTitleStyle: {
//               fontWeight: 'bold',
//             },
//             presentation: 'modal',
//           }}>
//           <RootStack.Screen
//             name="Main"
//             component={MainStackScreen}
//             options={{headerShown: false}}
//           />
//           <RootStack.Screen
//             name="Modal"
//             component={Modal}
//             options={{headerBackTitle: 'Go back'}}
//           />
//         </RootStack.Navigator>
//       </NavigationContainer>
//     </AnalyticsProvider>
//   );
// };

// export default App;

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AnalyticsProvider } from '@segment/analytics-react-native';
import { createClient, ConsentPlugin, CountFlushPolicy } from '@segment/analytics-react-native';
import type { SegmentClient } from '@segment/analytics-react-native';

import OTPublishersNativeSDK from 'react-native-onetrust-cmp';
import { OneTrustConsentProvider } from './consent';

import Home from './Home';
import SecondPage from './SecondPage';
import Modal from './Modal';

const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

function MainStackScreen() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#262e4f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}>
      <MainStack.Screen name="Home" component={Home} options={{ headerShown: false }} />
      <MainStack.Screen name="SecondPage" component={SecondPage} options={{ title: 'Second Page' }} />
    </MainStack.Navigator>
  );
}

const getActiveRouteName = (state): string => {
  if (!state || typeof state.index !== 'number') return 'Unknown';
  const route = state.routes[state.index];
  return route.state ? getActiveRouteName(route.state) : route.name;
};

const App = () => {
  const [segmentClient, setSegmentClient] = useState<SegmentClient | undefined>(undefined);
  const [routeName, setRouteName] = useState('Unknown');

  useEffect(() => {
    const initializeSDKs = async () => {
      console.log('Initializing OneTrust SDK...');
      try {
        const responseObject = await OTPublishersNativeSDK.startSDK(
          'cdn.cookielaw.org',
          '018f7e67-ea32-753c-9220-2eb2c94f452b-test',
          'en',
          { countryCode: 'us', regionCode: 'ca' },
          true
        );

        const typedResponse = responseObject as { responseString: string };
        console.log('OneTrust SDK initialized. Download status:', typedResponse.responseString);

        console.log('Initializing Segment client...');
        const client = createClient({
          writeKey: 'VRzdzieruD0trB00Tl7n8cdQDyEI8qIK',
          trackAppLifecycleEvents: true,
          collectDeviceId: true,
          debug: true,
          trackDeepLinks: true,
          flushPolicies: [new CountFlushPolicy(5)],
        });

        const applicableCategories = ['C0004'];
        const oneTrustProvider = new OneTrustConsentProvider(OTPublishersNativeSDK);
        oneTrustProvider.setApplicableCategories(applicableCategories);

        const oneTrustPlugin = new ConsentPlugin(oneTrustProvider);
        client.add({ plugin: oneTrustPlugin });

        oneTrustPlugin.start();
        console.log('OneTrust plugin started.');

        console.log('Segment consent settings:', client.consentSettings.get());
        setSegmentClient(client);
      } catch (error) {
        console.error('OneTrust SDK initialization failed:', error);
      }
    };

    initializeSDKs();
  }, []);

  // Show nothing while SDKs initialize
  if (!segmentClient) {
    console.log('Waiting for SDK initialization...');
    return null;
  }

  return (
    <AnalyticsProvider client={segmentClient}>
      <NavigationContainer
        onStateChange={(state) => {
          const newRouteName = getActiveRouteName(state);
          if (segmentClient && routeName !== newRouteName) {
            console.log(`Navigated to screen: ${newRouteName}`);
            void segmentClient.screen(newRouteName);
            setRouteName(newRouteName);
          }
        }}>
        <RootStack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#262e4f' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            presentation: 'modal',
          }}>
          <RootStack.Screen name="Main" component={MainStackScreen} options={{ headerShown: false }} />
          <RootStack.Screen name="Modal" component={Modal} options={{ headerBackTitle: 'Go back' }} />
        </RootStack.Navigator>
      </NavigationContainer>
    </AnalyticsProvider>
  );
};

export default App;

