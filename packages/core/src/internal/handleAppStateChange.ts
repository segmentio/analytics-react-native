import type { AppStateStatus } from 'react-native';
import type { SegmentClientContext } from '../client';
import { createTrackEvent } from '../events';

export default function handleAppStateChange(
  this: SegmentClientContext,
  { nextAppState }: { nextAppState: AppStateStatus }
) {
  if (this.config.trackAppLifecycleEvents) {
    if (
      ['inactive', 'background'].includes(this.appState) &&
      nextAppState === 'active'
    ) {
      const { context } = this.store.getState().main;
      const event = createTrackEvent({
        event: 'Application Opened',
        properties: {
          from_background: true,
          version: context?.app?.version,
          build: context?.app?.build,
        },
      });
      this.process(event);
      this.logger.info('TRACK (Application Opened) event saved', event);
    } else if (
      this.appState === 'active' &&
      ['inactive', 'background'].includes(nextAppState)
    ) {
      const event = createTrackEvent({
        event: 'Application Backgrounded',
      });
      this.process(event);
      this.logger.info('TRACK (Application Backgrounded) event saved', event);
    }
  }

  this.appState = nextAppState;
}
