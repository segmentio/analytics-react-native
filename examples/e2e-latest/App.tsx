import * as React from 'react';
import {useState, useEffect} from 'react';
import {
  NavigationContainer,
  NavigationState,
  PartialState,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AnalyticsProvider} from '@segment/analytics-react-native';
import {
  Home,
  SecondPage,
  Modal,
  segmentClient,
  onClientChange,
} from '../e2e-shared/src/app';

const MainStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function MainStackScreen() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#262e4f'},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: 'bold'},
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
  const [client, setClient] = useState(segmentClient);
  const [routeName, setRouteName] = useState('Unknown');

  useEffect(() => {
    return onClientChange(setClient);
  }, []);

  return (
    <AnalyticsProvider client={client} key={client.getConfig().writeKey}>
      <NavigationContainer
        onStateChange={state => {
          const newRouteName = getActiveRouteName(state);
          if (routeName !== newRouteName) {
            void client.screen(newRouteName);
            setRouteName(newRouteName);
          }
        }}>
        <RootStack.Navigator
          screenOptions={{
            headerStyle: {backgroundColor: '#262e4f'},
            headerTintColor: '#fff',
            headerTitleStyle: {fontWeight: 'bold'},
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
