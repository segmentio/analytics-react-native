import type { SegmentClientContext } from '../client';

export default async function getSettings(this: SegmentClientContext) {
  const settingsEndpoint = `https://cdn-settings.segment.com/v1/projects/${this.config.writeKey}/settings`;

  try {
    const res = await fetch(settingsEndpoint);
    const resJson = await res.json();
    this.logger.info(`Received settings from Segment succesfully.`);
    this.store.dispatch(
      this.actions.system.updateSettings({ settings: resJson })
    );
  } catch {
    this.logger.warn(
      `Could not receive settings from Segment. ${
        this.config.defaultSettings
          ? 'Will use the default settings.'
          : 'Device mode destinations will be ignored unless you specify default settings in the client config.'
      }`
    );
    if (this.config.defaultSettings) {
      this.store.dispatch(
        this.actions.system.updateSettings({
          settings: this.config.defaultSettings,
        })
      );
    }
  }
}
