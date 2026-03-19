import { SegmentClient } from '../../analytics';
import { settingsCDN, defaultHttpConfig } from '../../constants';
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
  describe('getEndpointForSettings', () => {
    it.each([
      ['example.com/v1/', 'https://example.com/v1/'],
      ['https://example.com/v1/', 'https://example.com/v1/'],
      ['http://example.com/v1/', 'http://example.com/v1/'],
    ])(
      'should append projects/key/settings if proxy end with / and useSegmentEndpoint is true',
      (cdnProxy, expectedBaseURL) => {
        const config = {
          ...clientArgs.config,
          useSegmentEndpoints: true,
          cdnProxy: cdnProxy,
        };
        const anotherClient = new SegmentClient({
          ...clientArgs,
          config,
        });
        const spy = jest.spyOn(
          Object.getPrototypeOf(anotherClient),
          'getEndpointForSettings'
        );
        expect(anotherClient['getEndpointForSettings']()).toBe(
          `${expectedBaseURL}projects/${config.writeKey}/settings`
        );
        expect(spy).toHaveBeenCalled();
      }
    );
    it.each([
      ['example.com/v1/projects/', 'https://example.com/v1/projects/'],
      ['https://example.com/v1/projects/', 'https://example.com/v1/projects/'],
      ['http://example.com/v1/projects/', 'http://example.com/v1/projects/'],
    ])(
      'should append projects/writeKey/settings if proxy ends with projects/ and useSegmentEndpoint is true',
      (cdnProxy, expectedBaseURL) => {
        const config = {
          ...clientArgs.config,
          useSegmentEndpoints: true,
          cdnProxy: cdnProxy,
        };
        const anotherClient = new SegmentClient({
          ...clientArgs,
          config,
        });

        const spy = jest.spyOn(
          Object.getPrototypeOf(anotherClient),
          'getEndpointForSettings'
        );
        expect(anotherClient['getEndpointForSettings']()).toBe(
          `${expectedBaseURL}projects/${config.writeKey}/settings`
        );
        expect(spy).toHaveBeenCalled();
      }
    );
    it.each([
      ['example.com/v1/projects', 'https://example.com/v1/projects'],
      ['https://example.com/v1/projects', 'https://example.com/v1/projects'],
      ['http://example.com/v1/projects', 'http://example.com/v1/projects'],
    ])(
      'should append /projects/writeKey/settings if proxy ends with /projects and useSegmentEndpoint is true',
      (cdnProxy, expectedBaseURL) => {
        const config = {
          ...clientArgs.config,
          useSegmentEndpoints: true,
          cdnProxy: cdnProxy,
        };
        const anotherClient = new SegmentClient({
          ...clientArgs,
          config,
        });

        const spy = jest.spyOn(
          Object.getPrototypeOf(anotherClient),
          'getEndpointForSettings'
        );
        expect(anotherClient['getEndpointForSettings']()).toBe(
          `${expectedBaseURL}/projects/${config.writeKey}/settings`
        );
        expect(spy).toHaveBeenCalled();
      }
    );
    it.each([
      ['example.com/v1?params=xx'],
      ['https://example.com/v1?params=xx'],
      ['http://example.com/v1?params=xx'],
    ])(
      'should throw an error if proxy comes with query params and useSegmentEndpoint is true',
      (cdnProxy) => {
        const config = {
          ...clientArgs.config,
          useSegmentEndpoints: true,
          cdnProxy: cdnProxy,
        };
        const anotherClient = new SegmentClient({
          ...clientArgs,
          config,
        });

        const spy = jest.spyOn(
          Object.getPrototypeOf(anotherClient),
          'getEndpointForSettings'
        );
        // Expect the private method to throw an error
        expect(anotherClient['getEndpointForSettings']()).toBe(
          `${settingsCDN}/${config.writeKey}/settings`
        );
        expect(spy).toHaveBeenCalled();
      }
    );
    it.each([
      ['example.com/v1/', false],
      ['example.com/v1/projects/', false],
      ['example.com/v1/projects', false],
      ['example.com/v1?params=xx', false],
    ])(
      'should always return identical result if proxy is provided and useSegmentEndpoints is false',
      (cdnProxy, useSegmentEndpoints) => {
        const config = {
          ...clientArgs.config,
          useSegmentEndpoints: useSegmentEndpoints,
          cdnProxy: cdnProxy,
        };
        const anotherClient = new SegmentClient({
          ...clientArgs,
          config,
        });
        const spy = jest.spyOn(
          Object.getPrototypeOf(anotherClient),
          'getEndpointForSettings'
        );
        const expected = `https://${cdnProxy}`;
        expect(anotherClient['getEndpointForSettings']()).toBe(expected);
        expect(spy).toHaveBeenCalled();
      }
    );
    it('No cdn proxy provided, should return default settings CDN', () => {
      const config = {
        ...clientArgs.config,
        useSegmentEndpoints: true, // No matter in this case
      };
      const anotherClient = new SegmentClient({
        ...clientArgs,
        config,
      });
      const spy = jest.spyOn(
        Object.getPrototypeOf(anotherClient),
        'getEndpointForSettings'
      );
      expect(anotherClient['getEndpointForSettings']()).toBe(
        `${settingsCDN}/${config.writeKey}/settings`
      );
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('CDN integrations validation', () => {
    it('falls back to defaults when CDN returns null integrations', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ integrations: null }),
        status: 200,
      } as Response);

      const client = new SegmentClient(clientArgs);
      await client.fetchSettings();

      expect(setSettingsSpy).toHaveBeenCalledWith(
        defaultIntegrationSettings.integrations
      );
    });

    it('falls back to defaults when CDN returns integrations as an array', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ integrations: ['invalid'] }),
        status: 200,
      } as Response);

      const client = new SegmentClient(clientArgs);
      await client.fetchSettings();

      expect(setSettingsSpy).toHaveBeenCalledWith(
        defaultIntegrationSettings.integrations
      );
    });

    it('falls back to defaults when CDN returns integrations as a string', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ integrations: 'invalid' }),
        status: 200,
      } as Response);

      const client = new SegmentClient(clientArgs);
      await client.fetchSettings();

      expect(setSettingsSpy).toHaveBeenCalledWith(
        defaultIntegrationSettings.integrations
      );
    });

    it('does not set settings when CDN returns invalid integrations and no defaults', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ integrations: null }),
        status: 200,
      } as Response);

      const client = new SegmentClient({
        ...clientArgs,
        config: { ...clientArgs.config, defaultSettings: undefined },
      });
      await client.fetchSettings();

      expect(setSettingsSpy).not.toHaveBeenCalled();
    });
  });

  describe('httpConfig extraction', () => {
    it('extracts httpConfig from CDN response and merges with defaults', async () => {
      const serverHttpConfig = {
        rateLimitConfig: {
          enabled: true,
          maxRetryCount: 50,
          maxRetryInterval: 120,
          maxRateLimitDuration: 3600,
        },
        backoffConfig: {
          enabled: true,
          maxRetryCount: 50,
          baseBackoffInterval: 1,
          maxBackoffInterval: 120,
          maxTotalBackoffDuration: 3600,
          jitterPercent: 20,
          default4xxBehavior: 'drop' as const,
          default5xxBehavior: 'retry' as const,
          statusCodeOverrides: {},
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...defaultIntegrationSettings,
            httpConfig: serverHttpConfig,
          }),
        status: 200,
      } as Response);

      const anotherClient = new SegmentClient({
        ...clientArgs,
        logger: getMockLogger(),
      });

      await anotherClient.fetchSettings();
      const result = anotherClient.getHttpConfig();

      expect(result).toBeDefined();
      expect(result?.rateLimitConfig?.maxRetryCount).toBe(50);
      expect(result?.rateLimitConfig?.maxRetryInterval).toBe(120);
      expect(result?.backoffConfig?.maxRetryCount).toBe(50);
      expect(result?.backoffConfig?.jitterPercent).toBe(20);
    });

    it('returns defaultHttpConfig when CDN has no httpConfig', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(defaultIntegrationSettings),
        status: 200,
      } as Response);

      const anotherClient = new SegmentClient({
        ...clientArgs,
        logger: getMockLogger(),
      });

      await anotherClient.fetchSettings();
      const result = anotherClient.getHttpConfig();
      expect(result).toBeDefined();
      expect(result?.rateLimitConfig?.enabled).toBe(
        defaultHttpConfig.rateLimitConfig!.enabled
      );
      expect(result?.backoffConfig?.enabled).toBe(
        defaultHttpConfig.backoffConfig!.enabled
      );
      expect(result?.backoffConfig?.statusCodeOverrides).toEqual(
        defaultHttpConfig.backoffConfig!.statusCodeOverrides
      );
    });

    it('returns undefined httpConfig when fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const anotherClient = new SegmentClient({
        ...clientArgs,
        logger: getMockLogger(),
      });

      await anotherClient.fetchSettings();
      expect(anotherClient.getHttpConfig()).toBeUndefined();
    });

    it('merges partial backoffConfig with defaults', async () => {
      const partialHttpConfig = {
        backoffConfig: {
          enabled: true,
          maxRetryCount: 25,
          baseBackoffInterval: 2,
          maxBackoffInterval: 60,
          maxTotalBackoffDuration: 1800,
          jitterPercent: 5,
          default4xxBehavior: 'drop' as const,
          default5xxBehavior: 'retry' as const,
          statusCodeOverrides: { '501': 'drop' as const },
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...defaultIntegrationSettings,
            httpConfig: partialHttpConfig,
          }),
        status: 200,
      } as Response);

      const anotherClient = new SegmentClient({
        ...clientArgs,
        logger: getMockLogger(),
      });

      await anotherClient.fetchSettings();
      const result = anotherClient.getHttpConfig();

      expect(result).toBeDefined();
      // rateLimitConfig should be defaults (no server override)
      expect(result?.rateLimitConfig?.enabled).toBe(true);
      expect(result?.rateLimitConfig?.maxRetryCount).toBe(100);
      // backoffConfig should be merged
      expect(result?.backoffConfig?.maxRetryCount).toBe(25);
      expect(result?.backoffConfig?.baseBackoffInterval).toBe(2);
    });
  });
});
