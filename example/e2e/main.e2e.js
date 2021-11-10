const { element, by, device } = require('detox');

import { startServer, stopServer } from './mockServer';
import { setupMatchers } from './matchers';

describe('#mainTest', () => {
  const mockServerListener = jest.fn();

  const trackButton = element(by.id('BUTTON_TRACK'));
  const screenButton = element(by.id('BUTTON_SCREEN'));
  const identifyButton = element(by.id('BUTTON_IDENTIFY'));
  const groupButton = element(by.id('BUTTON_GROUP'));
  const aliasButton = element(by.id('BUTTON_ALIAS'));
  const resetButton = element(by.id('BUTTON_RESET'));
  const flushButton = element(by.id('BUTTON_FLUSH'));

  beforeAll(async () => {
    await startServer(mockServerListener);
    await device.launchApp();
    setupMatchers();
  });

  const clearLifecycleEvents = async () => {
    await flushButton.tap();

    mockServerListener.mockClear();
    expect(mockServerListener).not.toHaveBeenCalled();
  };

  beforeEach(async () => {
    mockServerListener.mockReset();
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await stopServer();
  });

  it('checks that lifecycle methods are triggered', async () => {
    await flushButton.tap();

    const events = mockServerListener.mock.calls[0][0].batch;

    expect(events).toHaveEventWith({
      type: 'track',
      event: 'Application Opened',
    });
    expect(events).toHaveEventWith({
      type: 'track',
      event: 'Application Installed',
    });
  });

  it('checks that track & screen methods are logged', async () => {
    await clearLifecycleEvents();

    await trackButton.tap();
    await screenButton.tap();
    await flushButton.tap();

    expect(mockServerListener).toHaveBeenCalledTimes(1);

    const events = mockServerListener.mock.calls[0][0].batch;

    expect(events).toHaveLength(2);
    expect(events).toHaveEventWith({ type: 'track', event: 'Track pressed' });
    expect(events).toHaveEventWith({ type: 'screen', name: 'Home Screen' });
  });

  it('checks the identify method', async () => {
    await clearLifecycleEvents();

    await identifyButton.tap();
    await flushButton.tap();

    expect(mockServerListener).toHaveBeenCalledTimes(1);

    const events = mockServerListener.mock.calls[0][0].batch;

    expect(events).toHaveLength(1);
    expect(events).toHaveEventWith({
      type: 'identify',
      userId: 'user_2',
    });
  });

  it('checks the group method', async () => {
    await clearLifecycleEvents();

    await groupButton.tap();
    await flushButton.tap();

    expect(mockServerListener).toHaveBeenCalledTimes(1);

    const events = mockServerListener.mock.calls[0][0].batch;

    expect(events).toHaveLength(1);
    expect(events).toHaveEventWith({ type: 'group', groupId: 'best-group' });
  });

  it('checks the alias method', async () => {
    await clearLifecycleEvents();

    await aliasButton.tap();
    await flushButton.tap();

    expect(mockServerListener).toHaveBeenCalledTimes(1);

    const events = mockServerListener.mock.calls[0][0].batch;

    expect(events).toHaveLength(1);
    expect(events).toHaveEventWith({ type: 'alias', userId: 'new-id' });
  });

  it('reset the client and checks the user id', async () => {
    await clearLifecycleEvents();

    await identifyButton.tap();
    await trackButton.tap();
    await resetButton.tap();
    await screenButton.tap();
    await flushButton.tap();

    expect(mockServerListener).toHaveBeenCalledTimes(1);

    const events = mockServerListener.mock.calls[0][0].batch;

    const screenEvent = events.find((item) => item.type === 'screen');

    expect(events).toHaveLength(3);
    expect(events).toHaveEventWith({ type: 'identify', userId: 'user_2' });
    expect(events).toHaveEventWith({ type: 'track', userId: 'user_2' });
    expect(screenEvent.userId).toBeUndefined();
  });

  it('checks that the context is set properly', async () => {
    await clearLifecycleEvents();

    await trackButton.tap();
    await flushButton.tap();

    expect(mockServerListener).toHaveBeenCalledTimes(1);

    const request = mockServerListener.mock.calls[0][0];
    const context = request.batch[0].context;

    expect(request.batch).toHaveLength(1);
    expect(context.app.name).toBe('Analytics');
    expect(context.app.version).toBe('1.0');
    expect(context.library.name).toBe('@segment/analytics-react-native');
    expect(context.locale).toBe('en-US');
    // This test only works in iOS for now
    if (device.getPlatform() === 'ios') {
      expect(context.network.wifi).toBe(true);
    }
  });
});
