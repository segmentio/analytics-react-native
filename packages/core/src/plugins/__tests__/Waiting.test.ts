import { SegmentClient } from '../../analytics';
import { DestinationPlugin } from '../../plugin';

//import { SegmentDestination } from '../SegmentDestination';
import {
  ExampleWaitingPlugin,
  ExampleWaitingPlugin1,
  getMockLogger,
  ManualResumeWaitingPlugin,
  MockSegmentStore,
  StubDestinationPlugin,
} from '../../test-helpers';

jest.useFakeTimers();

describe('WaitingPlugin', () => {
  const store = new MockSegmentStore();
  const baseConfig = {
    writeKey: 'test-key',
    flushAt: 1,
    flushInterval: 0,
    trackAppLifecycleEvents: false,
    autoAddSegmentDestination: false,
  };

  beforeEach(() => {
    store.reset();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('test resume after timeout', async () => {
    const client = new SegmentClient({
      config: baseConfig,
      logger: getMockLogger(),
      store,
    });

    await client.store.running.set(true);
    expect(client.store.running.get()).toBe(true);

    client.pauseEventProcessing(1000);

    expect(client.store.running.get()).toBe(false);

    jest.advanceTimersByTime(2000);

    // Allow microtasks from setTimeout → resumeEventProcessing
    await Promise.resolve();

    expect(await client.store.running.get(true)).toBe(true);
  });
  test('test manual resume', async () => {
    const client = new SegmentClient({
      config: baseConfig,
      logger: getMockLogger(),
      store,
    });

    await client.store.running.set(true);
    expect(client.store.running.get()).toBe(true);

    client.pauseEventProcessing();

    expect(client.store.running.get()).toBe(false);

    await client.resumeEventProcessing();

    expect(await client.store.running.get(true)).toBe(true);
  });
  test('pause does not dispatch timeout if already paused', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const client = new SegmentClient({
      config: baseConfig,
      logger: getMockLogger(),
      store,
    });

    await client.store.running.set(true);

    client.pauseEventProcessing();
    client.pauseEventProcessing();
    client.pauseEventProcessing();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
  });
  test('WaitingPlugin makes analytics wait', async () => {
    const client = new SegmentClient({
      config: baseConfig,
      logger: getMockLogger(),
      store,
    });

    await client.store.running.set(true);
    expect(client.store.running.get()).toBe(true);

    const plugin = new ExampleWaitingPlugin();

    client.add({ plugin });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trackSpy = jest.spyOn(client as any, 'startTimelineProcessing');

    client.track('foo');

    expect(client.store.running.get()).toBe(false);

    // Event should NOT be processed while paused
    expect(trackSpy).not.toHaveBeenCalled();

    await Promise.resolve();

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(await client.store.running.get(true)).toBe(true);

    // Event should now be processed
    expect(trackSpy).toHaveBeenCalledTimes(1);
  });

  test('timeout force resume', async () => {
    const client = new SegmentClient({
      config: baseConfig,
      logger: getMockLogger(),
      store,
    });

    await client.store.running.set(true);
    expect(client.store.running.get()).toBe(true);

    const waitingPlugin = new ManualResumeWaitingPlugin();
    client.add({ plugin: waitingPlugin });

    client.track('foo');

    expect(client.store.running.get()).toBe(false);
    expect(waitingPlugin.tracked).toBe(false);

    await jest.advanceTimersByTimeAsync(30000);

    await Promise.resolve();
    await Promise.resolve();

    expect(await client.store.running.get(true)).toBe(true);
    expect(waitingPlugin.tracked).toBe(true);
  });
  test('multiple WaitingPlugins', async () => {
    const client = new SegmentClient({
      config: baseConfig,
      logger: getMockLogger(),
      store,
    });

    // Initially, analytics is running
    await client.store.running.set(true);
    expect(client.store.running.get()).toBe(true);

    // Create two waiting plugins
    const plugin1 = new ExampleWaitingPlugin1();
    const plugin2 = new ManualResumeWaitingPlugin();

    // Add plugins to client
    client.add({ plugin: plugin1 });
    client.add({ plugin: plugin2 });

    // Track an event while waiting plugins are active
    client.track('foo');

    // Client should now be paused
    expect(client.store.running.get()).toBe(false);

    // Plugins should not have tracked the event yet
    expect(plugin1.tracked).toBe(false);
    expect(plugin2.tracked).toBe(false);

    // Resume the first plugin
    await plugin1.resume();
    // Advance timers to simulate any internal delays
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    // Still paused because plugin2 is waiting
    expect(client.store.running.get()).toBe(false);
    expect(plugin1.tracked).toBe(false);
    expect(plugin2.tracked).toBe(false);

    // Resume the second plugin
    await plugin2.resume();
    // Advance timers to flush
    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    // Now analytics should be running
    expect(await client.store.running.get(true)).toBe(true);
    // Both plugins should have tracked the event
    expect(plugin1.tracked).toBe(true);
    expect(plugin2.tracked).toBe(true);
  });
  test('WaitingPlugin makes analytics to wait on DestinationPlugin', async () => {
    jest.useFakeTimers();

    const client = new SegmentClient({
      config: baseConfig,
      logger: getMockLogger(),
      store,
    });

    // Initially, analytics is running
    await client.store.running.set(true);
    expect(client.store.running.get()).toBe(true);
    const waitingPlugin = new ExampleWaitingPlugin1();
    const stubDestinationPlugin: DestinationPlugin =
      new StubDestinationPlugin();
    // Add destination to analytics
    client.add({ plugin: stubDestinationPlugin });
    // Add waiting plugin inside destination
    stubDestinationPlugin.add(waitingPlugin);

    // Track event
    await client.track('foo');

    // Analytics should pause
    expect(client.store.running.get()).toBe(false);
    expect(waitingPlugin.tracked).toBe(false);
    await Promise.resolve();

    jest.advanceTimersByTime(30000);
    await jest.runAllTimersAsync();

    // 🔑 flush remaining promise chains
    await Promise.resolve();
    await Promise.resolve();

    // Analytics resumed
    expect(await client.store.running.get(true)).toBe(true);
    // Waiting plugin executed
    expect(waitingPlugin.tracked).toBe(true);

    jest.useRealTimers();
  });
  test('timeout force resume on DestinationPlugin', async () => {
    const client = new SegmentClient({
      config: baseConfig,
      logger: getMockLogger(),
      store,
    });

    // analytics running initially
    await client.store.running.set(true);
    expect(client.store.running.get()).toBe(true);

    const waitingPlugin = new ExampleWaitingPlugin1(); // no manual resume
    const destinationPlugin: DestinationPlugin = new StubDestinationPlugin();

    // add destination
    client.add({ plugin: destinationPlugin });

    // add waiting plugin inside destination
    destinationPlugin.add(waitingPlugin);

    // track event
    await client.track('foo');

    // analytics should pause
    expect(client.store.running.get()).toBe(false);
    expect(waitingPlugin.tracked).toBe(false);

    await Promise.resolve();

    jest.advanceTimersByTime(6000);
    await jest.runAllTimersAsync();

    await Promise.resolve();
    await Promise.resolve();

    // analytics resumed
    expect(await client.store.running.get(true)).toBe(true);

    // waiting plugin executed
    expect(waitingPlugin.tracked).toBe(true);
  });
  test('test multiple WaitingPlugin on DestinationPlugin', async () => {
    const client = new SegmentClient({
      config: baseConfig,
      logger: getMockLogger(),
      store,
    });

    // analytics running initially
    await client.store.running.set(true);
    expect(client.store.running.get()).toBe(true);

    const destinationPlugin: DestinationPlugin = new StubDestinationPlugin();
    client.add({ plugin: destinationPlugin });

    const plugin1 = new ExampleWaitingPlugin1();
    const plugin2 = new ManualResumeWaitingPlugin();

    destinationPlugin.add(plugin1);
    destinationPlugin.add(plugin2);

    // track event
    await client.track('foo');

    // analytics paused
    expect(client.store.running.get()).toBe(false);
    expect(plugin1.tracked).toBe(false);
    expect(plugin2.tracked).toBe(false);
    // Resume the first plugin
    await plugin1.resume();

    jest.advanceTimersByTime(6000);
    await Promise.resolve();

    // still paused because plugin2 not resumed
    expect(client.store.running.get()).toBe(false);
    expect(plugin1.tracked).toBe(false);
    expect(plugin2.tracked).toBe(false);
    plugin2.resume();

    jest.advanceTimersByTime(6000);
    await jest.runAllTimersAsync();
    await Promise.resolve();
    // analytics resumed
    expect(await client.store.running.get(true)).toBe(true);

    // both plugins executed
    expect(plugin1.tracked).toBe(true);
    expect(plugin2.tracked).toBe(true);
  });
});
