import { getMockLogger } from '../__helpers__/mockLogger';
import getSettings from '../../internal/getSettings';
import type { SegmentClientContext } from '../../client';

describe('internal #getSettings', () => {
  const updateSettings = jest.fn();

  const clientContext = {
    config: {
      writeKey: '123-456',
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
  } as SegmentClientContext;

  beforeEach(() => {
    updateSettings.mockReset();

    jest.spyOn(clientContext.logger, 'error');
    jest.spyOn(clientContext.logger, 'info');
    jest.spyOn(clientContext.logger, 'warn');
  });

  it('fetches the settings succesfully ', async () => {
    const mockJSONResponse = () => ({ foo: 'bar' });
    const mockResponse = Promise.resolve({
      json: () => mockJSONResponse,
    });
    // @ts-ignore
    fetch = jest.fn(() => Promise.resolve(mockResponse));

    await getSettings.bind(clientContext)();

    expect(fetch).toHaveBeenCalledWith(
      'https://cdn-settings.segment.com/v1/projects/123-456/settings'
    );

    expect(clientContext.logger.info).toHaveBeenCalledWith(
      'Received settings from Segment succesfully.'
    );
    expect(updateSettings).toHaveBeenCalledWith({ settings: mockJSONResponse });
  });

  it('fails to the settings succesfully and uses the default if specified', async () => {
    // @ts-ignore
    fetch = jest.fn(() => Promise.reject());

    const defaultSettings = { integrations: {} };

    const caseClientContext = {
      ...clientContext,
      config: {
        writeKey: clientContext.config.writeKey,
        defaultSettings,
      },
    } as SegmentClientContext;

    await getSettings.bind(caseClientContext)();

    expect(fetch).toHaveBeenCalledWith(
      'https://cdn-settings.segment.com/v1/projects/123-456/settings'
    );
    expect(clientContext.logger.warn).toHaveBeenCalledWith(
      'Could not receive settings from Segment. Will use the default settings.'
    );
    expect(updateSettings).toHaveBeenCalledWith({ settings: defaultSettings });
  });

  it('fails to the settings succesfully and has no default settings', async () => {
    // @ts-ignore
    fetch = jest.fn(() => Promise.reject());

    await getSettings.bind(clientContext)();

    expect(fetch).toHaveBeenCalledWith(
      'https://cdn-settings.segment.com/v1/projects/123-456/settings'
    );
    expect(clientContext.logger.warn).toHaveBeenCalledWith(
      'Could not receive settings from Segment. Device mode destinations will be ignored unless you specify default settings in the client config.'
    );
    expect(updateSettings).not.toHaveBeenCalled();
  });
});
