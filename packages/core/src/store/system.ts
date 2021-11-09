import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { defaultConfig } from '../constants';
import type { SegmentAPISettings, Config, IntegrationSettings } from '../types';

type SystemState = {
  configuration: Config;
  settings?: SegmentAPISettings;
};

export const initialState: SystemState = {
  configuration: defaultConfig,
};

export default createSlice({
  name: 'system',
  initialState,
  reducers: {
    init: (state, action: PayloadAction<{ configuration: Config }>) => {
      state.configuration = action.payload.configuration;
    },
    updateSettings: (
      state,
      action: PayloadAction<{ settings: SegmentAPISettings }>
    ) => {
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload.settings,
        },
      };
    },
    addDestination: (
      state,
      action: PayloadAction<{
        destination: {
          key: string;
          settings: IntegrationSettings;
        };
      }>
    ) => {
      return {
        ...state,
        settings: {
          ...state.settings,
          integrations: {
            ...state.settings?.integrations,
            [action.payload.destination.key]:
              action.payload.destination.settings,
          },
        },
      };
    },
  },
});
