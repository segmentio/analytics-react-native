import { Linking } from 'react-native';
import type { SegmentClientContext } from '../client';
import { createTrackEvent } from '../events';

export default async function trackDeepLinks(this: SegmentClientContext) {
  const url = await Linking.getInitialURL();

  if (url && this.config.trackDeepLinks) {
    const event = createTrackEvent({
      event: 'Deep Link Opened',
      properties: {
        url,
      },
    });
    this.process(event);
    this.logger.info('TRACK (Deep Link Opened) event saved', event);
  }
}
