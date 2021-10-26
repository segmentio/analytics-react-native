import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SegmentEvent, Context, Config, PartialContext } from '../types';

type MainState = {
  events: SegmentEvent[];
  eventsToRetry: SegmentEvent[];
  context?: PartialContext;
};

export const initialState: MainState = {
  events: [],
  eventsToRetry: [],
  context: undefined,
};

export default createSlice({
  name: 'main',
  initialState,
  reducers: {
    addEvent: (
      state,
      action: PayloadAction<{
        event: SegmentEvent;
      }>
    ) => {
      state.events.push(action.payload.event);
    },
    deleteEventsByMessageId: (
      state,
      action: PayloadAction<{
        ids: string[];
      }>
    ) => {
      state.events = state.events.filter(
        (evt) => !action.payload.ids.includes(evt.messageId!)
      );
    },
    addEventsToRetry: (
      state,
      action: PayloadAction<{
        events: SegmentEvent[];
        config: Config;
      }>
    ) => {
      state.eventsToRetry = [
        ...state.eventsToRetry,
        ...action.payload.events,
      ].slice(-action.payload.config.maxEventsToRetry!);
    },
    deleteEventsToRetryByMessageId: (
      state,
      action: PayloadAction<{
        ids: string[];
      }>
    ) => {
      state.eventsToRetry = state.eventsToRetry.filter(
        (evt) => !action.payload.ids.includes(evt.messageId!)
      );
    },
    /**
     * Initializes the Context
     */
    setContext: (state, action: PayloadAction<{ context: Context }>) => {
      state.context = {
        ...state.context,
        ...action.payload.context,
      };
    },
    /**
     * Updates the context with a delta
     */
    updateContext: (
      state,
      action: PayloadAction<{
        context: PartialContext;
      }>
    ) => {
      state.context = {
        ...state.context,
        ...action.payload.context,
        app:
          action.payload.context.app !== undefined
            ? {
                ...state.context?.app,
                ...action.payload.context.app,
              }
            : state.context?.app,
        device:
          action.payload.context.device !== undefined
            ? {
                ...state.context?.device,
                ...action.payload.context.device,
              }
            : state.context?.device,
        library:
          action.payload.context.library !== undefined
            ? {
                ...state.context?.library,
                ...action.payload.context.library,
              }
            : state.context?.library,
        network:
          action.payload.context.network !== undefined
            ? {
                ...state.context?.network,
                ...action.payload.context.network,
              }
            : state.context?.network,
        os:
          action.payload.context.os !== undefined
            ? {
                ...state.context?.os,
                ...action.payload.context.os,
              }
            : state.context?.os,
        screen:
          action.payload.context.screen !== undefined
            ? {
                ...state.context?.screen,
                ...action.payload.context.screen,
              }
            : state.context?.screen,
        traits:
          action.payload.context.traits !== undefined
            ? {
                ...state.context?.traits,
                ...action.payload.context.traits,
              }
            : state.context?.traits,
      };
    },
  },
});
