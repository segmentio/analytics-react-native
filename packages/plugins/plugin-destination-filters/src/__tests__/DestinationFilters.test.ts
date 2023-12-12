import { createTestClient } from '@segment/analytics-react-native/src/test-helpers';
import { DestinationFiltersPlugin } from '../DestinationFilters';
import {
  DestinationPlugin,
  SegmentClient,
} from '@segment/analytics-react-native';

describe('DestinationFiltersPlugin', () => {
  const { store, client: c } = createTestClient();
  const client = c as unknown as SegmentClient;
  client.add({ plugin: new DestinationFiltersPlugin() });

  class MockDestination extends DestinationPlugin {
    track = jest.fn();

    constructor(key: string) {
      super();
      this.key = key;
    }
  }

  beforeEach(async () => {
    store.reset();
    jest.clearAllMocks();
    await client.init();
  });

  it('works', async () => {
    await store.context.set({
      device: {
        id: 'pii',
        advertisingId: 'pii',
        model: 'Jest',
      },
      app: {
        name: 'test',
      },
    });

    await store.settings.set({
      DropProperties: true,
      DoNotSend: true,
    });

    await store.filters.set({
      DropProperties: {
        matchers: [{ ir: '', type: 'all' }],
        scope: 'destinations',
        target_type: 'workspace::project::destination::config',
        transformers: [
          [
            {
              type: 'drop_properties',
              config: {
                drop: { 'context.device': ['id', 'advertisingId'] },
              },
            },
          ],
        ],
        destinationName: 'DropProperties',
      },
      DoNotSend: {
        matchers: [
          {
            ir: '["and",["contains","event",{"value":"DoNotSend"}],["!=","type",{"value":"identify"}]]',
            type: 'fql',
          },
        ],
        scope: 'destinations',
        target_type: 'workspace::project::destination::config',
        transformers: [[{ type: 'drop' }]],
        destinationName: 'DoNotSend',
      },
    });
    const droppedPropsDestination = new MockDestination('DropProperties');
    client.add({ plugin: droppedPropsDestination });

    const doNotSendDestination = new MockDestination('DoNotSend');
    client.add({ plugin: doNotSendDestination });

    await client.track('DoNotSend');

    // Rule DoNotSend should not permit the event going to the destination
    expect(doNotSendDestination.track).not.toHaveBeenCalled();
    // Rule DropProps will drop context.device.id from the destination
    expect(droppedPropsDestination.track).toHaveBeenCalled();
    let lastDestinationEvent = droppedPropsDestination.track.mock.lastCall[0];
    expect(lastDestinationEvent.context.device).not.toHaveProperty('id');

    await client.track('ThisIsFine');

    // Rule DoNotSend will let this event pass, it should contain the device id as that filter does not apply here
    expect(doNotSendDestination.track).toHaveBeenCalled();
    lastDestinationEvent = doNotSendDestination.track.mock.lastCall[0];
    expect(lastDestinationEvent.context.device).toHaveProperty('id');

    // Rule DropProps will drop context.device.id from the destination
    expect(droppedPropsDestination.track).toHaveBeenCalled();
    lastDestinationEvent = droppedPropsDestination.track.mock.lastCall[0];
    expect(lastDestinationEvent.context.device).not.toHaveProperty('id');
  });
});
