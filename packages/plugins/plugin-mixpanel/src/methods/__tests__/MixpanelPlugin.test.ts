import { SegmentClient, UpdateType } from '@segment/analytics-react-native';
import { getMockLogger } from '@segment/analytics-rn-shared/__helpers__/mockLogger';
import { MockSegmentStore } from '@segment/analytics-rn-shared/__helpers__/mockSegmentStore';

import { EU_SERVER, MixpanelPlugin } from '../../MixpanelPlugin';
import { initMock, setServerMock } from '../__mocks__/mixpanel-react-native';
import { sampleIntegrationSettings } from './__helpers__/constants';

jest.mock('mixpanel-react-native');

describe('MixpanelPlugin', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    logger: getMockLogger(),
    config: {
      writeKey: '123-456',
      trackApplicationLifecycleEvents: true,
      flushInterval: 0,
    },
    store,
  };
  let plugin: MixpanelPlugin = new MixpanelPlugin();
  const settings = sampleIntegrationSettings;
  const updateType: UpdateType = UpdateType.initial;

  beforeEach(() => {
    store.reset();
    jest.clearAllMocks();
    plugin = new MixpanelPlugin();
    plugin.analytics = new SegmentClient(clientArgs);
  });

  it('calls update with settings', () => {
    const updateSpy = jest.spyOn(plugin, 'update');

    plugin.update(settings, updateType);
    expect(updateSpy).toHaveBeenCalledWith(settings, updateType);
    expect(initMock).toHaveBeenCalled();
  });

  it('does not initialize Mixpanel when token is undefined', () => {
    settings.integrations.Mixpanel.token = '';

    plugin.update(settings, updateType);
    expect(initMock).not.toHaveBeenCalled();
  });

  it('enables the European endpoint', () => {
    settings.integrations.Mixpanel.token = '1234';
    settings.integrations.Mixpanel.enableEuropeanEndpoint = true;

    plugin.update(settings, updateType);
    expect(setServerMock).toHaveBeenCalledWith(EU_SERVER);
  });
});
