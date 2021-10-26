import type { SegmentClientContext } from '../client';
import { getPluginsWithFlush } from '../util';

export default async function flush(this: SegmentClientContext) {
  if (this.destroyed) {
    return;
  }

  this.secondsElapsed = 0;
  const state = this.store.getState();

  if (state.main.events.length) {
    getPluginsWithFlush(this.timeline).forEach((plugin) => plugin.flush());
  }
}
