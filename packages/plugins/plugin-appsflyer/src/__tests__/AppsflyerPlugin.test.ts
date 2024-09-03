import { AppsflyerPlugin } from '../AppsflyerPlugin';

describe('#appsflyerPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Appsflyer plugin without timeToWait', () => {
    const plugin = new AppsflyerPlugin();
    expect(plugin.timeToWaitForATTUserAuthorization).toEqual(60);
  });
  it('Appsflyer plugin with timeToWait', () => {
    const plugin = new AppsflyerPlugin({
      timeToWaitForATTUserAuthorization: 90,
      is_ad_id: true,
      is_adset: true,
      is_adset_id: true,
    });
    expect(plugin.timeToWaitForATTUserAuthorization).toEqual(90);
  });
});
