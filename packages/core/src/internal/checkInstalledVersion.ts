import { getContext } from '../context';
import type { SegmentClientContext } from '../client';
import { createTrackEvent } from '../events';

export default async function checkInstalledVersion(
  this: SegmentClientContext
) {
  const context = await getContext(undefined);
  const previousContext = this.store.getState().main.context;

  this.store.dispatch(this.actions.main.updateContext({ context }));

  if (!this.config.trackAppLifecycleEvents) {
    return;
  }

  if (!previousContext?.app) {
    const event = createTrackEvent({
      event: 'Application Installed',
      properties: {
        version: context.app.version,
        build: context.app.build,
      },
    });
    this.process(event);
    this.logger.info('TRACK (Application Installed) event saved', event);
  } else if (context.app.version !== previousContext.app.version) {
    const event = createTrackEvent({
      event: 'Application Updated',
      properties: {
        version: context.app.version,
        build: context.app.build,
        previous_version: previousContext.app.version,
        previous_build: previousContext.app.build,
      },
    });
    this.process(event);
    this.logger.info('TRACK (Application Updated) event saved', event);
  }

  const event = createTrackEvent({
    event: 'Application Opened',
    properties: {
      from_background: false,
      version: context.app.version,
      build: context.app.build,
    },
  });
  this.process(event);
  this.logger.info('TRACK (Application Opened) event saved', event);
}
