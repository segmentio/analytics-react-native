import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '.';

export const getEvents = createSelector(
  (state: RootState) => state.main.events,
  (events) => events
);

export const getEventsToRetry = createSelector(
  (state: RootState) => state.main.eventsToRetry,
  (events) => events
);
