import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SegmentAPISettings, Config, Integrations } from '../types';
import { defaultConfig } from '../client';

type SystemState = {
  configuration: Config;
  integrations?: Integrations;
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
      state.settings = action.payload.settings;
    },
    addIntegrations: (state, action: PayloadAction<{ key: string }[]>) => {
      // we need to set any destination plugins to false in the
      // integrations payload.  this prevents them from being sent
      // by segment.com once an event reaches segment.
      if (!state.integrations) {
        state.integrations = {};
      }
      action.payload.forEach(({ key }) => {
        state.integrations![key] = false;
      });
    },
    removeIntegration: (state, action: PayloadAction<{ key: string }>) => {
      if (state.integrations) {
        delete state.integrations[action.payload.key];
      }
    },
  },
});
