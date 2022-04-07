import { MixpanelPlugin } from '../../MixpanelPlugin';
import { SegmentClient } from '../../../../../core/src/analytics';
import { MockSegmentStore } from '../../../../../core/src/__tests__/__helpers__/mockSegmentStore';
import { getMockLogger } from '../../../../../core/src/__tests__/__helpers__/mockLogger';
import { mockIntegrationSettings } from '../__mocks__/mockIntegrationSettings';
import type { UpdateType } from '../../../../../core/src/types';
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
    let settings = mockIntegrationSettings;
    let updateType: UpdateType = 'initial' as UpdateType;
    const mockMixpanelPlugin = jest.spyOn(plugin, 'update');

    plugin.update(settings, updateType);
    expect(mockMixpanelPlugin).toHaveBeenCalledWith(settings, updateType);
  });

  it('initializes Mixpanel', () => {
    const plugin = new MixpanelPlugin();
    plugin.analytics = new SegmentClient(clientArgs);
    let settings = mockIntegrationSettings;
    let updateType: UpdateType = 'initial' as UpdateType;

    jest.spyOn(plugin, 'update');
    plugin.update(settings, updateType);
    expect(initMock).toHaveBeenCalled();
  });

  it('does not initialize Mixpanel when token is undefined', () => {
    const plugin = new MixpanelPlugin();
    plugin.analytics = new SegmentClient(clientArgs);
    let settings = mockIntegrationSettings;
    let updateType: UpdateType = 'initial' as UpdateType;

    settings.integrations.Mixpanel.token = '';

    jest.spyOn(plugin, 'update');
    plugin.update(settings, updateType);
    expect(initMock).toBeCalledTimes(0);
  });

  it('enables the European endpoint', () => {
    const plugin = new MixpanelPlugin();
    plugin.analytics = new SegmentClient(clientArgs);
    let settings = mockIntegrationSettings;
    let updateType: UpdateType = 'initial' as UpdateType;

    settings.integrations.Mixpanel.token = '1234';
    settings.integrations.Mixpanel.enableEuropeanEndpoint = true;

    jest.spyOn(plugin, 'update');
    plugin.update(settings, updateType);
    expect(setServerMock).toHaveBeenCalled();
  });
});
