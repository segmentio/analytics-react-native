import { MixpanelPlugin, EU_SERVER } from '../../MixpanelPlugin';
import { SegmentClient } from '../../../../../core/src/analytics';
import { MockSegmentStore } from '../../../../../core/src/__tests__/__helpers__/mockSegmentStore';
import { getMockLogger } from '../../../../../core/src/__tests__/__helpers__/mockLogger';
import { sampleIntegrationSettings } from '../__mocks__/__helpers__/constants';
import { UpdateType } from '../../../../../core/src/types';
import { initMock, setServerMock } from '../__mocks__/mixpanel-react-native';

jest.mock('mixpanel-react-native');

describe('MixpanelPlugin', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    logger: getMockLogger(),
    config: {
      writeKey: '123-456',
      trackApplicationLifecycleEvents: true,
    },
    store,
  };

  beforeEach(() => {
    store.reset();
    jest.clearAllMocks();
  });

  it('calls update with settings', () => {
    const plugin = new MixpanelPlugin();
    plugin.analytics = new SegmentClient(clientArgs);
    let settings = sampleIntegrationSettings;
    let updateType: UpdateType = UpdateType.initial;
    const updateSpy = jest.spyOn(plugin, 'update');

    plugin.update(settings, updateType);
    expect(updateSpy).toHaveBeenCalledWith(settings, updateType);
    expect(initMock).toHaveBeenCalled();
  });

  it('does not initialize Mixpanel when token is undefined', () => {
    const plugin = new MixpanelPlugin();
    plugin.analytics = new SegmentClient(clientArgs);
    let settings = sampleIntegrationSettings;
    let updateType: UpdateType = UpdateType.initial;

    settings.integrations.Mixpanel.token = '';

    plugin.update(settings, updateType);
    expect(initMock).not.toHaveBeenCalled();
  });

  it('enables the European endpoint', () => {
    const plugin = new MixpanelPlugin();
    plugin.analytics = new SegmentClient(clientArgs);
    let settings = sampleIntegrationSettings;
    let updateType: UpdateType = UpdateType.initial;

    settings.integrations.Mixpanel.token = '1234';
    settings.integrations.Mixpanel.enableEuropeanEndpoint = true;

    plugin.update(settings, updateType);
    expect(setServerMock).toHaveBeenCalledWith(EU_SERVER);
  });
});
