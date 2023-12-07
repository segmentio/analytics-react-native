import { createTestClient } from '../../../test-helpers';
import { ConsentPlugin } from '../../ConsentPlugin';
import consentNotEnabledAtSegment from './mockSettings/ConsentNotEnabledAtSegment.json';
import {
  createConsentProvider,
  createSegmentWatcher,
  setupTestDestinations,
} from './utils';

describe('Consent not enabled at Segment', () => {
  const createClient = () =>
    createTestClient(
      {
        settings: consentNotEnabledAtSegment.integrations,
      },
      { autoAddSegmentDestination: true }
    );

  test('no to all', async () => {
    const { client } = createClient();
    const testDestinations = setupTestDestinations(client);
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

    await client.init();

    const segmentDestination = createSegmentWatcher(client);

    await client.track('test');

    expect(segmentDestination).toHaveBeenCalled();
    expect(testDestinations.dest1.track).toHaveBeenCalled();
    expect(testDestinations.dest2.track).toHaveBeenCalled();
    expect(testDestinations.dest3.track).toHaveBeenCalled();
    expect(testDestinations.dest4.track).toHaveBeenCalled();
    expect(testDestinations.dest5.track).toHaveBeenCalled();
  });

  test('yes to some', async () => {
    const { client } = createClient();
    const testDestinations = setupTestDestinations(client);
    const mockConsentStatuses = {
      C0001: false,
      C0002: true,
      C0003: false,
      C0004: true,
      C0005: true,
    };

    client.add({
      plugin: new ConsentPlugin(
        createConsentProvider(mockConsentStatuses),
        Object.keys(mockConsentStatuses)
      ),
    });

    await client.init();

    const segmentDestination = createSegmentWatcher(client);

    await client.track('test');

    expect(segmentDestination).toHaveBeenCalled();
    expect(testDestinations.dest1.track).toHaveBeenCalled();
    expect(testDestinations.dest2.track).toHaveBeenCalled();
    expect(testDestinations.dest3.track).toHaveBeenCalled();
    expect(testDestinations.dest4.track).toHaveBeenCalled();
    expect(testDestinations.dest5.track).toHaveBeenCalled();
  });

  test('yes to all', async () => {
    const { client } = createClient();
    const testDestinations = setupTestDestinations(client);
    const mockConsentStatuses = {
      C0001: true,
      C0002: true,
      C0003: true,
      C0004: true,
      C0005: true,
    };

    client.add({
      plugin: new ConsentPlugin(
        createConsentProvider(mockConsentStatuses),
        Object.keys(mockConsentStatuses)
      ),
    });

    await client.init();

    const segmentDestination = createSegmentWatcher(client);

    await client.track('test');

    expect(segmentDestination).toHaveBeenCalled();
    expect(testDestinations.dest1.track).toHaveBeenCalled();
    expect(testDestinations.dest2.track).toHaveBeenCalled();
    expect(testDestinations.dest3.track).toHaveBeenCalled();
    expect(testDestinations.dest4.track).toHaveBeenCalled();
    expect(testDestinations.dest5.track).toHaveBeenCalled();
  });
});
