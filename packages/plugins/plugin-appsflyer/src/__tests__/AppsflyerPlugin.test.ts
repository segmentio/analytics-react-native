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
    });
    expect(plugin.timeToWaitForATTUserAuthorization).toEqual(90);
  });
});
