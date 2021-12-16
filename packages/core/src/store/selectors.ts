import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '.';

export const getEvents = createSelector(
  (state: RootState) => state.main.events,
  (events) => events
);
