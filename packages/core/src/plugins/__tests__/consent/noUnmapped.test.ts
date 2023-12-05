import { createTestClient } from '../../../__tests__/__helpers__/setupSegmentClient';
import { ConsentPlugin } from '../../ConsentPlugin';

import { setupTestDestinations, createConsentProvider } from './utils';
import noUnmappedDestinations from './mockSettings/NoUnmappedDestinations.json';

describe('No unmapped destinations', () => {
  const createClient = () =>
    createTestClient({
      settings: noUnmappedDestinations.integrations,
    });

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

    await client.track('test');

    Object.values(testDestinations).forEach((testDestination) => {
      expect(testDestination.track).not.toHaveBeenCalled();
    });
  });

  test('yes to 1', async () => {
    const { client } = createClient();
    const testDestinations = setupTestDestinations(client);
    const mockConsentStatuses = {
      C0001: true,
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

    await client.track('test');

    expect(testDestinations.dest1.track).toHaveBeenCalled();
    expect(testDestinations.dest2.track).not.toHaveBeenCalled();
    expect(testDestinations.dest3.track).not.toHaveBeenCalled();
    expect(testDestinations.dest4.track).not.toHaveBeenCalled();
    expect(testDestinations.dest5.track).not.toHaveBeenCalled();
  });

  test('yes to 2', async () => {
    const { client } = createClient();
    const testDestinations = setupTestDestinations(client);
    const mockConsentStatuses = {
      C0001: false,
      C0002: true,
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

    await client.track('test');

    expect(testDestinations.dest1.track).not.toHaveBeenCalled();
    expect(testDestinations.dest2.track).toHaveBeenCalled();
    expect(testDestinations.dest3.track).not.toHaveBeenCalled();
    expect(testDestinations.dest4.track).not.toHaveBeenCalled();
    expect(testDestinations.dest5.track).not.toHaveBeenCalled();
  });

  test('yes to 3', async () => {
    const { client } = createClient();
    const testDestinations = setupTestDestinations(client);
    const mockConsentStatuses = {
      C0001: false,
      C0002: false,
      C0003: true,
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

    await client.track('test');

    expect(testDestinations.dest1.track).not.toHaveBeenCalled();
    expect(testDestinations.dest2.track).not.toHaveBeenCalled();
    expect(testDestinations.dest3.track).toHaveBeenCalled();
    expect(testDestinations.dest4.track).not.toHaveBeenCalled();
    expect(testDestinations.dest5.track).not.toHaveBeenCalled();
  });

  test('yes to 4', async () => {
    const { client } = createClient();
    const testDestinations = setupTestDestinations(client);
    const mockConsentStatuses = {
      C0001: false,
      C0002: false,
      C0003: false,
      C0004: true,
      C0005: false,
    };

    client.add({
      plugin: new ConsentPlugin(
        createConsentProvider(mockConsentStatuses),
        Object.keys(mockConsentStatuses)
      ),
    });

    await client.init();

    await client.track('test');

    expect(testDestinations.dest1.track).not.toHaveBeenCalled();
    expect(testDestinations.dest2.track).not.toHaveBeenCalled();
    expect(testDestinations.dest3.track).not.toHaveBeenCalled();
    expect(testDestinations.dest4.track).toHaveBeenCalled();
    expect(testDestinations.dest5.track).not.toHaveBeenCalled();
  });

  test('yes to 1 and 3', async () => {
    const { client } = createClient();
    const testDestinations = setupTestDestinations(client);
    const mockConsentStatuses = {
      C0001: true,
      C0002: false,
      C0003: true,
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

    await client.track('test');

    expect(testDestinations.dest1.track).toHaveBeenCalled();
    expect(testDestinations.dest2.track).not.toHaveBeenCalled();
    expect(testDestinations.dest3.track).toHaveBeenCalled();
    expect(testDestinations.dest4.track).not.toHaveBeenCalled();
    expect(testDestinations.dest5.track).not.toHaveBeenCalled();
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

    await client.track('test');

    expect(testDestinations.dest1.track).toHaveBeenCalled();
    expect(testDestinations.dest2.track).toHaveBeenCalled();
    expect(testDestinations.dest3.track).toHaveBeenCalled();
    expect(testDestinations.dest4.track).toHaveBeenCalled();
    expect(testDestinations.dest5.track).toHaveBeenCalled();
  });
});
