import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
} from '@reduxjs/toolkit';
import { persistStore, persistReducer, PERSIST } from 'redux-persist';
import AsyncStorage from '@react-native-community/async-storage';
import mainSlice from './main';
import systemSlice from './system';
import userInfo from './userInfo';

export const actions = {
  main: mainSlice.actions,
  system: systemSlice.actions,
  userInfo: userInfo.actions,
};

const rootReducer = combineReducers({
  main: mainSlice.reducer,
  system: systemSlice.reducer,
  userInfo: userInfo.reducer,
});

export const initializeStore = (segmentKey: string) => {
  const persistConfig = {
    key: `${segmentKey}-analyticsData`,
    storage: AsyncStorage,
  };

  const persistedReducer = persistReducer(persistConfig, rootReducer);

  const store = configureStore({
    reducer: persistedReducer,
    middleware: getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [PERSIST],
      },
    }),
  });

  const persistor = persistStore(store);

  return { store, persistor };
};
