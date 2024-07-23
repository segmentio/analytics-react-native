import { createTestClient } from '../../../test-helpers';
import { ConsentPlugin } from '../../ConsentPlugin';
import noUnmappedDestinations from './mockSettings/NoUnmappedDestinations.json';
import { createConsentProvider, setupTestDestinations } from './utils';

describe('No unmapped destinations', () => {
  const createClient = () =>
    createTestClient({
      settings: noUnmappedDestinations.integrations,
      consentSettings: noUnmappedDestinations.consentSettings,
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

    const consentPlugin = new ConsentPlugin(
      createConsentProvider(mockConsentStatuses)
    );

    client.add({
      plugin: consentPlugin,
    });

    await client.init();

    consentPlugin.start();

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

    const consentPlugin = new ConsentPlugin(
      createConsentProvider(mockConsentStatuses)
    );

    client.add({
      plugin: consentPlugin,
    });

    consentPlugin.start();

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

    const consentPlugin = new ConsentPlugin(
      createConsentProvider(mockConsentStatuses)
    );

    client.add({
      plugin: consentPlugin,
    });

    consentPlugin.start();

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

    const consentPlugin = new ConsentPlugin(
      createConsentProvider(mockConsentStatuses)
    );

    client.add({
      plugin: consentPlugin,
    });

    consentPlugin.start();

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

    const consentPlugin = new ConsentPlugin(
      createConsentProvider(mockConsentStatuses)
    );

    client.add({
      plugin: consentPlugin,
    });

    consentPlugin.start();

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

    const consentPlugin = new ConsentPlugin(
      createConsentProvider(mockConsentStatuses)
    );

    client.add({
      plugin: consentPlugin,
    });

    consentPlugin.start();

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

    const consentPlugin = new ConsentPlugin(
      createConsentProvider(mockConsentStatuses)
    );

    client.add({
      plugin: consentPlugin,
    });

    consentPlugin.start();

    await client.init();

    await client.track('test');

    expect(testDestinations.dest1.track).toHaveBeenCalled();
    expect(testDestinations.dest2.track).toHaveBeenCalled();
    expect(testDestinations.dest3.track).toHaveBeenCalled();
    expect(testDestinations.dest4.track).toHaveBeenCalled();
    expect(testDestinations.dest5.track).toHaveBeenCalled();
  });
});
