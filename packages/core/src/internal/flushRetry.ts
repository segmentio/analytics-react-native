import { chunk } from '../util';
import type { SegmentClientContext } from '../client';
import { sendEvents } from '../api';
import type { SegmentEvent } from '../types';

export default async function flushRetry(this: SegmentClientContext) {
  if (this.destroyed) {
    return;
  }

  const state = this.store.getState();
  const { eventsToRetry } = state.main;

  if (this.refreshTimeout) {
    clearTimeout(this.refreshTimeout);
  }

  if (!eventsToRetry.length) {
    this.refreshTimeout = null;
    return;
  }

  const chunkedEvents = chunk(eventsToRetry, this.config.maxBatchSize!);

  let numFailedEvents = 0;
  let numSentEvents = 0;

  await Promise.all(
    chunkedEvents.map(async (events) => {
      try {
        await sendEvents({
          config: this.config,
          events,
        });
        const messageIds = events.map((evt: SegmentEvent) => evt.messageId);
        this.store.dispatch(
          this.actions.main.deleteEventsToRetryByMessageId({
            ids: messageIds,
          })
        );
        numSentEvents += events.length;
      } catch (e) {
        numFailedEvents += events.length;
      }
    })
  );

  if (numFailedEvents) {
    this.logger.error(
      `Failed to send ${numFailedEvents} events. Retrying in ${this.config
        .retryInterval!} seconds (via retry)`
    );
    const retryIntervalMs = this.config.retryInterval! * 1000;
    this.refreshTimeout = setTimeout(
      () => this.flushRetry(),
      retryIntervalMs
    ) as any;
  } else {
    this.refreshTimeout = null;
  }

  if (numSentEvents) {
    this.logger.warn(`Sent ${eventsToRetry.length} events (via retry)`);
  }
}
