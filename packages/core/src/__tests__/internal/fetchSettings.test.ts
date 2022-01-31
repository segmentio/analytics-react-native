import { getMockLogger } from '../__helpers__/mockLogger';
import { SegmentClient } from '../../analytics';
import { MockSegmentStore } from '../__helpers__/mockSegmentStore';

describe('internal #getSettings', () => {
  const defaultIntegrationSettings = {
    integrations: {},
  };
  const store = new MockSegmentStore();

  const clientArgs = {
    config: {
      writeKey: '123-456',
      defaultSettings: defaultIntegrationSettings,
    },
    logger: getMockLogger(),
    store: store,
  };

  const client = new SegmentClient(clientArgs);

  const setSettingsSpy = jest.spyOn(store.settings, 'set');

  beforeEach(() => {
    store.reset();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches the settings succesfully ', async () => {
    const mockJSONResponse = { foo: 'bar' };
    const mockResponse = Promise.resolve({
      json: () => mockJSONResponse,
    });
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.resolve(mockResponse));

    await client.fetchSettings();

    expect(fetch).toHaveBeenCalledWith(
      'https://cdn-settings.segment.com/v1/projects/123-456/settings'
    );

    expect(setSettingsSpy).toHaveBeenCalledWith(mockJSONResponse);
    expect(store.settings.get()).toEqual(mockJSONResponse);
    expect(client.settings.get()).toEqual({
      ...mockJSONResponse,
    });
  });

  it('fails to the settings succesfully and uses the default if specified', async () => {
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.reject());

    await client.fetchSettings();

    expect(fetch).toHaveBeenCalledWith(
      'https://cdn-settings.segment.com/v1/projects/123-456/settings'
    );

    expect(setSettingsSpy).toHaveBeenCalledWith(defaultIntegrationSettings);
    expect(store.settings.get()).toEqual(
      defaultIntegrationSettings.integrations
    );
    expect(client.settings.get()).toEqual(
      defaultIntegrationSettings.integrations
    );
  });

  it('fails to the settings succesfully and has no default settings', async () => {
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.reject());
    const anotherClient = new SegmentClient({
      ...clientArgs,
      config: { ...clientArgs.config, defaultSettings: undefined },
    });

    await anotherClient.fetchSettings();

    expect(fetch).toHaveBeenCalledWith(
      'https://cdn-settings.segment.com/v1/projects/123-456/settings'
    );
    expect(setSettingsSpy).not.toHaveBeenCalled();
  });
});
