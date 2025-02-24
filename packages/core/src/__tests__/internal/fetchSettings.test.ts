import { SegmentClient } from '../../analytics';
import { settingsCDN } from '../../constants';
import { SEGMENT_DESTINATION_KEY } from '../../plugins/SegmentDestination';
import { getMockLogger, MockSegmentStore } from '../../test-helpers';
import { getURL } from '../../util';

describe('internal #getSettings', () => {
  const defaultIntegrationSettings = {
    integrations: {
      // Make sure the value associated with this key here is different
      // from the initial value in `store.settings` as set by the mock store.
      // Otherwise we can't actually test that default settings are set correctly
      // i.e. tests that should fail could misleadingly appear to succeed.
      [SEGMENT_DESTINATION_KEY]: { apiKey: 'bar', apiHost: 'boo' },
    },
  };
  const store = new MockSegmentStore();

  const clientArgs = {
    config: {
      writeKey: '123-456',
      defaultSettings: defaultIntegrationSettings,
      flushInterval: 0,
    },
    logger: getMockLogger(),
    store: store,
  };

  //const client = new SegmentClient(clientArgs);

  const setSettingsSpy = jest.spyOn(store.settings, 'set');

  beforeEach(() => {
    store.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [false, false], // No proxy, No segment endpoint
    [false, true], // No proxy, Yes segment endpoint
    [true, false], // Yes proxy, No segment endpoint
    [true, true], // Yes proxy, Yes segment endpoint
  ])(
    'fetches the settings successfully when hasProxy is %s and useSegmentEndpoints is %s',
    async (hasProxy, useSegmentEndpoints) => {
      const mockJSONResponse = { integrations: { foo: 'bar' } };
      const mockResponse = Promise.resolve({
        ok: true,
        json: () => mockJSONResponse,
      });

      // Mock global fetch function
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      global.fetch = jest.fn(() => Promise.resolve(mockResponse));

      // Set up config based on test parameters
      const config = {
        ...clientArgs.config,
        useSegmentEndpoints,
        cdnProxy: hasProxy ? 'https://custom-proxy.com' : undefined, // Set proxy only when true
      };

      // Create client with the dynamic config
      const client = new SegmentClient({
        ...clientArgs,
        config,
      });

      await client.fetchSettings();

      // Determine expected settings URL based on the logic
      const settingsPrefix = config.cdnProxy ?? settingsCDN;
      let expectedSettingsPath = '';
      if (hasProxy) {
        if (useSegmentEndpoints) {
          expectedSettingsPath = `/projects/${config.writeKey}/settings`;
        } else {
          expectedSettingsPath = '';
        }
      } else {
        expectedSettingsPath = `/${config.writeKey}/settings`;
      }

      expect(fetch).toHaveBeenCalledWith(
        getURL(settingsPrefix, expectedSettingsPath),
        {
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      );

      expect(setSettingsSpy).toHaveBeenCalledWith(
        mockJSONResponse.integrations
      );
      expect(store.settings.get()).toEqual(mockJSONResponse.integrations);
      expect(client.settings.get()).toEqual(mockJSONResponse.integrations);
    }
  );

  it.each([
    [false, false], // No proxy, No segment endpoint
    [false, true], // No proxy, Yes segment endpoint
    [true, false], // Yes proxy, No segment endpoint
    [true, true], // Yes proxy, Yes segment endpoint
  ])(
    'fails to fetch settings and falls back to defaults when hasProxy is %s and useSegmentEndpoints is %s',
    async (hasProxy, useSegmentEndpoints) => {
      // Mock fetch to reject (simulate failure)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      global.fetch = jest.fn(() => Promise.reject());

      // Set up config dynamically
      const config = {
        ...clientArgs.config,
        useSegmentEndpoints,
        cdnProxy: hasProxy ? 'https://custom-proxy.com' : undefined, // Set proxy only when true
      };

      // Create client with the dynamic config
      const client = new SegmentClient({
        ...clientArgs,
        config,
      });

      await client.fetchSettings();

      // Determine expected settings URL
      const settingsPrefix = config.cdnProxy ?? settingsCDN;
      let expectedSettingsPath = '';
      if (hasProxy) {
        if (useSegmentEndpoints) {
          expectedSettingsPath = `/projects/${config.writeKey}/settings`;
        } else {
          expectedSettingsPath = '';
        }
      } else {
        expectedSettingsPath = `/${config.writeKey}/settings`;
      }

      expect(fetch).toHaveBeenCalledWith(
        getURL(settingsPrefix, expectedSettingsPath),
        {
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      );

      // Ensure default settings are used after failure
      expect(setSettingsSpy).toHaveBeenCalledWith(
        defaultIntegrationSettings.integrations
      );
      expect(store.settings.get()).toEqual(
        defaultIntegrationSettings.integrations
      );
      expect(client.settings.get()).toEqual(
        defaultIntegrationSettings.integrations
      );
    }
  );

  it.each([
    [false, false], // No proxy, No segment endpoint
    [false, true], // No proxy, Yes segment endpoint
    [true, false], // Yes proxy, No segment endpoint
    [true, true], // Yes proxy, Yes segment endpoint
  ])(
    'fails to fetch settings and has no default settings when hasProxy is %s and useSegmentEndpoints is %s',
    async (hasProxy, useSegmentEndpoints) => {
      // Mock fetch to reject (simulate failure)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      global.fetch = jest.fn(() => Promise.reject());

      // Set up config dynamically
      const config = {
        ...clientArgs.config,
        useSegmentEndpoints,
        cdnProxy: hasProxy ? 'https://custom-proxy.com' : undefined, // Set proxy only when true
        defaultSettings: undefined, // Ensure no default settings
      };

      // Create client with the dynamic config
      const anotherClient = new SegmentClient({
        ...clientArgs,
        config,
      });

      await anotherClient.fetchSettings();

      // Determine expected settings URL
      const settingsPrefix = config.cdnProxy ?? settingsCDN;
      let expectedSettingsPath = '';
      if (hasProxy) {
        if (useSegmentEndpoints) {
          expectedSettingsPath = `/projects/${config.writeKey}/settings`;
        } else {
          expectedSettingsPath = '';
        }
      } else {
        expectedSettingsPath = `/${config.writeKey}/settings`;
      }

      expect(fetch).toHaveBeenCalledWith(
        getURL(settingsPrefix, expectedSettingsPath),
        {
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      );

      // Ensure no default settings are applied
      expect(setSettingsSpy).not.toHaveBeenCalled();
    }
  );

  it.each([
    [false, false], // No proxy, No segment endpoint
    [false, true], // No proxy, Yes segment endpoint
    [true, false], // Yes proxy, No segment endpoint
    [true, true], // Yes proxy, Yes segment endpoint
  ])(
    'fails to fetch settings due to soft API errors and has no default settings when hasProxy is %s and useSegmentEndpoints is %s',
    async (hasProxy, useSegmentEndpoints) => {
      const mockResponse = Promise.resolve({
        ok: false,
        status: 500, // Simulate a soft API error (server error)
      });

      // Mock fetch to return the error response
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      global.fetch = jest.fn(() => Promise.resolve(mockResponse));

      // Set up config dynamically
      const config = {
        ...clientArgs.config,
        useSegmentEndpoints,
        cdnProxy: hasProxy ? 'https://custom-proxy.com' : undefined, // Set proxy only when true
        defaultSettings: undefined, // Ensure no default settings
      };

      // Create client with the dynamic config
      const anotherClient = new SegmentClient({
        ...clientArgs,
        config,
      });

      await anotherClient.fetchSettings();

      // Determine expected settings URL
      const settingsPrefix = config.cdnProxy ?? settingsCDN;
      let expectedSettingsPath = '';
      if (hasProxy) {
        if (useSegmentEndpoints) {
          expectedSettingsPath = `/projects/${config.writeKey}/settings`;
        } else {
          expectedSettingsPath = '';
        }
      } else {
        expectedSettingsPath = `/${config.writeKey}/settings`;
      }

      expect(fetch).toHaveBeenCalledWith(
        getURL(settingsPrefix, expectedSettingsPath),
        {
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      );

      // Ensure no default settings are applied when API fails
      expect(setSettingsSpy).not.toHaveBeenCalled();
    }
  );
});
