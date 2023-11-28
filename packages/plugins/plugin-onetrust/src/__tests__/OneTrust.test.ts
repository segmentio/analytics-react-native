import {
  DestinationPlugin,
  Plugin,
  PluginType,
  SegmentClient,
} from '@segment/analytics-react-native';
import { OneTrustPlugin } from '../OneTrust';
import onChange from 'on-change';
import type { OTPublishersNativeSDK } from '../OTProvider';
import { createTestClient } from '@segment/analytics-rn-shared/__helpers__/setupSegmentClient';

class MockDestination extends DestinationPlugin {
  track = jest.fn();

  constructor(public readonly key: string) {
    super();
  }
}

class MockOneTrustSDK implements OTPublishersNativeSDK {
  private readonly DEFAULT_CONSENT_STATUSES = {
    C001: 1,
    C002: 0,
    C003: 1,
    C004: -1,
  };

  private changeCallbacks = new Map<
    string,
    ((cid: string, status: number) => void)[]
  >();

  mockConsentStatuses: Record<string, number> = onChange(
    this.DEFAULT_CONSENT_STATUSES,
    (key, value) => {
      this.changeCallbacks.get(key)?.forEach((cb) => cb(key, value as number));
    }
  );

  getConsentStatusForCategory(categoryId: string): Promise<number> {
    return Promise.resolve(this.mockConsentStatuses[categoryId]);
  }

  setBroadcastAllowedValues(): void {
    return;
  }

  listenForConsentChanges(
    categoryId: string,
    callback: (cid: string, status: number) => void
  ): void {
    this.changeCallbacks.set(categoryId, [
      ...(this.changeCallbacks.get(categoryId) || []),
      callback,
    ]);
  }

  stopListeningForConsentChanges(): void {
    this.changeCallbacks.clear();
  }
}

describe('OneTrustPlugin', () => {
  let client: SegmentClient;
  let mockOneTrust: MockOneTrustSDK;
  const mockBraze = new MockDestination('Braze');
  const mockAmplitude = new MockDestination('Amplitude');

  beforeEach(async () => {
    const testClient = createTestClient();
    testClient.store.reset();
    jest.clearAllMocks();
    client = testClient.client as unknown as SegmentClient;
    mockOneTrust = new MockOneTrustSDK();
    client.add({
      plugin: new OneTrustPlugin(
        mockOneTrust,
        Object.keys(mockOneTrust.mockConsentStatuses)
      ),
    });

    client.add({
      plugin: mockBraze,
      settings: {
        consentSettings: {
          categories: ['C002', 'C004'],
        },
      },
    });

    client.add({
      plugin: mockAmplitude,
      settings: {
        consentSettings: {
          categories: ['C002'],
        },
      },
    });

    await client.init();
  });

  it('stamps each event with consent statuses as provided by onetrust', async () => {
    // we'll use a before plugin to tap into the timeline and confirm the stamps are applied as early as possible
    class TapPlugin extends Plugin {
      type = PluginType.before;
      execute = jest.fn();
    }

    const tapPlugin = new TapPlugin();
    client.add({
      plugin: tapPlugin,
    });

    await client.track('Test event');

    expect(tapPlugin.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        context: expect.objectContaining({
          consent: {
            categoryPreferences: {
              C001: true,
              C002: false,
              C003: true,
              C004: false,
            },
          },
        }),
      })
    );
  });

  it('prevents an event from reaching non-compliant destinations', async () => {
    await client.track('Test event');

    expect(mockBraze.track).not.toHaveBeenCalled();
    expect(mockAmplitude.track).not.toHaveBeenCalled();
  });

  it('allows an event to reach destinations once consent is granted later on', async () => {
    await client.track('Test event');

    expect(mockBraze.track).not.toHaveBeenCalled();
    expect(mockAmplitude.track).not.toHaveBeenCalled();

    mockOneTrust.mockConsentStatuses.C002 = 1;

    await client.track('Test event');

    // this destination will now receive events
    expect(mockAmplitude.track).toHaveBeenCalledTimes(1);
    // but one of the tagged categories on this destination is still not consented
    expect(mockBraze.track).not.toHaveBeenCalled();

    mockOneTrust.mockConsentStatuses.C004 = 1;

    await client.track('Test event');

    // now both have been consented
    expect(mockAmplitude.track).toHaveBeenCalledTimes(2);
    expect(mockBraze.track).toHaveBeenCalledTimes(1);
  });

  it('relays consent change within onetrust to Segment', async () => {
    const spy = jest.spyOn(client, 'track');

    await client.track('Test event');

    mockOneTrust.mockConsentStatuses.C002 = 1;

    // await one tick
    await new Promise(process.nextTick);

    // this is to make sure there are no unneccessary Consent Preference track calls
    expect(spy).toHaveBeenCalledTimes(2);

    expect(spy).toHaveBeenLastCalledWith('Segment Consent Preference', {
      consent: {
        categoryPreferences: {
          C001: true,
          C002: true,
          C003: true,
          C004: false,
        },
      },
    });
  });
});
