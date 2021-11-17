import { getMockLogger } from '../__helpers__/mockLogger';
import { SegmentClient } from '../../analytics';
import { mockPersistor } from '../__helpers__/mockPersistor';

describe('internal #getSettings', () => {
  const updateSettings = jest.fn();
  const defaultIntegrationSettings = {
    integrations: {},
  };

  const defaultConfig = {
    config: {
      writeKey: '123-456',
      defaultSettings: defaultIntegrationSettings,
    },
    store: {
      dispatch: () => {},
      getState: () => ({}),
    } as any,
    actions: {
      system: {
        updateSettings,
      },
    } as any,
    logger: getMockLogger(),
    persistor: mockPersistor,
  };
  let client = new SegmentClient(defaultConfig);

  beforeEach(() => {
    updateSettings.mockReset();
    client = new SegmentClient(defaultConfig);

    jest.spyOn(client.logger, 'error');
    jest.spyOn(client.logger, 'info');
    jest.spyOn(client.logger, 'warn');
  });

  it('fetches the settings succesfully ', async () => {
    const mockJSONResponse = () => ({ foo: 'bar' });
    const mockResponse = Promise.resolve({
      json: () => mockJSONResponse,
    });
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.resolve(mockResponse));

    await client.fetchSettings();

    expect(fetch).toHaveBeenCalledWith(
      'https://cdn-settings.segment.com/v1/projects/123-456/settings'
    );

    expect(client.logger.info).toHaveBeenCalledWith(
      'Received settings from Segment succesfully.'
    );
    expect(updateSettings).toHaveBeenCalledWith({ settings: mockJSONResponse });
  });

  it('fails to the settings succesfully and uses the default if specified', async () => {
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.reject());

    await client.fetchSettings();

    expect(fetch).toHaveBeenCalledWith(
      'https://cdn-settings.segment.com/v1/projects/123-456/settings'
    );
    expect(client.logger.warn).toHaveBeenCalledWith(
      'Could not receive settings from Segment. Will use the default settings.'
    );
    expect(updateSettings).toHaveBeenCalledWith({
      settings: defaultIntegrationSettings,
    });
  });

  it('fails to the settings succesfully and has no default settings', async () => {
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.reject());
    client = new SegmentClient({
      ...defaultConfig,
      config: { ...defaultConfig.config, defaultSettings: undefined },
    });

    await client.fetchSettings();

    expect(fetch).toHaveBeenCalledWith(
      'https://cdn-settings.segment.com/v1/projects/123-456/settings'
    );
    expect(client.logger.warn).toHaveBeenCalledWith(
      'Could not receive settings from Segment. Device mode destinations will be ignored unless you specify default settings in the client config.'
    );
    expect(updateSettings).not.toHaveBeenCalled();
  });
});
