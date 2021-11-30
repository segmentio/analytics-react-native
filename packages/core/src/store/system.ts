import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SegmentAPISettings, IntegrationSettings } from '../types';

export type SystemState = {
  settings?: SegmentAPISettings;
};

export const initialState: SystemState = {};

export default createSlice({
  name: 'system',
  initialState,
  reducers: {
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
