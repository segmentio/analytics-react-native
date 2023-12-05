import {
  CategoryConsentStatusProvider,
  DestinationPlugin,
  PluginType,
  SegmentClient,
  UtilityPlugin,
} from '@segment/analytics-react-native';
import { SegmentDestination } from '../../SegmentDestination';

beforeEach(() => {
  jest.spyOn(SegmentDestination.prototype, 'execute');
});

class SegmentWatcherPlugin extends UtilityPlugin {
  type = PluginType.after;
  execute = jest.fn();
}

class MockDestination extends DestinationPlugin {
  track = jest.fn();

  constructor(public readonly key: string) {
    super();
  }
}

export const setupTestDestinations = (client: SegmentClient) => {
  const dest1 = new MockDestination('DummyDest1');
  const dest2 = new MockDestination('DummyDest2');
  const dest3 = new MockDestination('DummyDest3');
  const dest4 = new MockDestination('DummyDest4');
  const dest5 = new MockDestination('DummyDest5');

  client.add({ plugin: dest1 });
  client.add({ plugin: dest2 });
  client.add({ plugin: dest3 });
  client.add({ plugin: dest4 });
  client.add({ plugin: dest5 });

  return {
    dest1,
    dest2,
    dest3,
    dest4,
    dest5,
  };
};

export const createSegmentWatcher = (client: SegmentClient) => {
  const segmentDestination = client
    .getPlugins()
    .find(
      (p) => (p as DestinationPlugin).key === 'Segment.io'
    ) as SegmentDestination;

  const segmentWatcher = new SegmentWatcherPlugin();
  segmentDestination.add(segmentWatcher);

  return segmentWatcher.execute;
};

export const createConsentProvider = (
  statuses: Record<string, boolean>
): CategoryConsentStatusProvider => ({
  getConsentStatus: () => Promise.resolve(statuses),
  setApplicableCategories: () => {
    /** no op */
  },
  onConsentChange: () => {
    /** no op */
  },
});

describe('Consent test utils', () => {
  it('works', () => {
    // this is just to suppress jest error - "must have at least one test"
  });
});
