import {
  SegmentAPISettings,
  SegmentClient,
  UpdateType,
} from '@segment/analytics-react-native';
import type {
  ConversionCallbacks,
  DeepLinkCallbacks,
  DeepLinkData,
} from 'react-native-appsflyer';
import { AppsflyerPlugin } from '../AppsflyerPlugin';
import {
  init,
  registerConversionListener,
  registerDeepLinkListener,
  registerSessionReadyListener,
  start,
} from '../methods/__mocks__/react-native-appsflyer';

const settings = {
  integrations: {
    AppsFlyer: {
      appsFlyerDevKey: 'devKey',
      appleAppID: 'appId',
      trackAttributionData: true,
    },
  },
} as unknown as SegmentAPISettings;

const createClient = () =>
  ({
    getConfig: () => ({ trackDeepLinks: true }),
    track: jest.fn(() => Promise.resolve()),
    reportInternalError: jest.fn(),
    logger: { info: jest.fn(), warn: jest.fn() },
  } as unknown as SegmentClient);

const setup = async () => {
  const client = createClient();
  const plugin = new AppsflyerPlugin();
  plugin.configure(client);
  await plugin.update(settings, UpdateType.initial);
  return { client, plugin };
};

const lastCallArg = <T>(mock: jest.Mock) => {
  const calls = mock.mock.calls as T[][];
  return calls[calls.length - 1][0];
};

describe('#appsflyerPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the deep link listener before init and the rest after', async () => {
    await setup();

    expect(init).toHaveBeenCalledWith({ devKey: 'devKey', appId: 'appId' });
    const order = (mock: jest.Mock) => mock.mock.invocationCallOrder[0];
    expect(order(registerDeepLinkListener)).toBeLessThan(order(init));
    expect(order(init)).toBeLessThan(order(registerConversionListener));
    expect(order(init)).toBeLessThan(order(registerSessionReadyListener));
    expect(start).not.toHaveBeenCalled();
  });

  it('starts the SDK when the session is ready', async () => {
    await setup();

    lastCallArg<() => void>(registerSessionReadyListener)();

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('initializes only once', async () => {
    const { plugin } = await setup();
    await plugin.update(settings, UpdateType.refresh);

    expect(init).toHaveBeenCalledTimes(1);
    expect(registerDeepLinkListener).toHaveBeenCalledTimes(1);
    expect(registerConversionListener).toHaveBeenCalledTimes(1);
  });

  it('retries init after a failure', async () => {
    init.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    const { client, plugin } = await setup();
    expect(client.reportInternalError).toHaveBeenCalledTimes(1);

    await plugin.update(settings, UpdateType.refresh);

    expect(init).toHaveBeenCalledTimes(2);
  });

  it('tracks Deep Link Opened once for a found deep link', async () => {
    const onDeepLink = jest.fn();
    const client = createClient();
    const plugin = new AppsflyerPlugin({
      is_adset: false,
      is_adset_id: false,
      is_ad_id: false,
      onDeepLink,
    });
    plugin.configure(client);
    await plugin.update(settings, UpdateType.initial);

    const data: DeepLinkData = {
      status: 'FOUND',
      deepLink: {
        deep_link_value: 'promo',
        media_source: 'source',
        campaign: 'campaign',
      },
    };
    lastCallArg<DeepLinkCallbacks>(registerDeepLinkListener).onDeepLinking?.(
      data
    );

    expect(client.track).toHaveBeenCalledTimes(1);
    expect(client.track).toHaveBeenCalledWith('Deep Link Opened', {
      provider: 'AppsFlyer',
      deepLink: 'promo',
      campaign: { name: 'campaign', source: 'source' },
    });
    expect(onDeepLink).toHaveBeenCalledWith(data);
  });

  it('does not track a deep link that was not found', async () => {
    const { client } = await setup();

    lastCallArg<DeepLinkCallbacks>(registerDeepLinkListener).onDeepLinking?.({
      status: 'NOT_FOUND',
    });

    expect(client.track).not.toHaveBeenCalled();
  });

  it.each([true, 'true'])(
    'tracks Install Attributed on a first launch of %p',
    async (isFirstLaunch) => {
      const { client } = await setup();

      lastCallArg<ConversionCallbacks>(
        registerConversionListener
      ).onConversionDataSuccess?.({
        af_status: 'Non-organic',
        is_first_launch: isFirstLaunch,
        media_source: 'source',
        campaign: 'campaign',
      });

      expect(client.track).toHaveBeenCalledWith('Install Attributed', {
        provider: 'AppsFlyer',
        campaign: { source: 'source', name: 'campaign' },
      });
    }
  );

  it('tracks Organic Install on an organic first launch', async () => {
    const { client } = await setup();

    lastCallArg<ConversionCallbacks>(
      registerConversionListener
    ).onConversionDataSuccess?.({
      af_status: 'Organic',
      is_first_launch: true,
    });

    expect(client.track).toHaveBeenCalledWith('Organic Install', {
      provider: 'AppsFlyer',
    });
  });
});
