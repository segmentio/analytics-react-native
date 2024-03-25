import { IdfaPlugin } from '@segment/analytics-react-native-plugin-idfa';
import { createTestClient } from '../../../test-helpers';
import { ConsentPlugin } from '../../ConsentPlugin';
import { createConsentProvider } from './utils';
import noUnmappedDestinations from './mockSettings/NoUnmappedDestinations.json';
import type { Context, ContextDevice } from '@segment/analytics-react-native';

let mockIdfaValue = {
  adTrackingEnabled: false,
  advertisingId: 'trackMeId',
  trackingStatus: 'denied',
};

jest.mock(
  '@segment/analytics-react-native-plugin-idfa/lib/commonjs/AnalyticsReactNativePluginIdfa',
  () => ({
    AnalyticsReactNativePluginIdfa: {
      getTrackingAuthorizationStatus: async () => {
        return Promise.resolve(mockIdfaValue);
      },
    },
  })
);

describe('IDFA x Consent', () => {
  it('triggers consent update event on IDFA change and includes IDFA data', async () => {
    const { client, expectEvent } = createTestClient(
      {
        settings: noUnmappedDestinations.integrations,
        consentSettings: noUnmappedDestinations.consentSettings,
      },
      { autoAddSegmentDestination: true }
    );

    const mockConsentStatuses = {
      C0001: false,
      C0002: false,
      C0003: false,
      C0004: false,
      C0005: false,
    };

    client.add({
      plugin: new ConsentPlugin(
        createConsentProvider(mockConsentStatuses),
        Object.keys(mockConsentStatuses)
      ),
    });

    const idfaPlugin = new IdfaPlugin(false);
    client.add({
      plugin: idfaPlugin as Plugin,
    });

    await client.init();

    await idfaPlugin.requestTrackingPermission();

    await new Promise((r) => setTimeout(r, 1000));

    expectEvent({
      event: 'Segment Consent Preference',
      context: expect.objectContaining({
        device: expect.objectContaining({
          adTrackingEnabled: false,
          advertisingId: 'trackMeId',
          trackingStatus: 'denied',
        }) as unknown as ContextDevice,
      }) as unknown as Context,
    });

    // update IDFA data

    mockIdfaValue = {
      adTrackingEnabled: true,
      advertisingId: 'trackMeId',
      trackingStatus: 'authorized',
    };

    await idfaPlugin.requestTrackingPermission();

    await new Promise((r) => setTimeout(r, 1000));

    expectEvent({
      event: 'Segment Consent Preference',
      context: expect.objectContaining({
        device: expect.objectContaining({
          adTrackingEnabled: true,
          advertisingId: 'trackMeId',
          trackingStatus: 'authorized',
        }) as unknown as ContextDevice,
      }) as unknown as Context,
    });
  });
});
