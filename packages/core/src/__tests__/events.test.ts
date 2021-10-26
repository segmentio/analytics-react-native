import {
  createScreenEvent,
  createTrackEvent,
  createIdentifyEvent,
  createGroupEvent,
  createAliasEvent,
} from '../events';
import { EventType } from '../types';

jest.mock('../uuid', () => ({
  getUUID: () => 'iDMkR2-I7c2_LCsPPlvwH',
}));

describe('#createTrackEvent', () => {
  beforeAll(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2000-01-01T00:00:00.000Z');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('creates a track event with properties', () => {
    const event = createTrackEvent({
      event: 'Awesome event',
      properties: {
        foo: 'bar',
      },
    });

    expect(event).toEqual({
      type: EventType.TrackEvent,
      event: 'Awesome event',
      properties: {
        foo: 'bar',
      },
    });
  });

  it('creates a track event without properties', () => {
    const event = createTrackEvent({
      event: 'Awesome event',
    });

    expect(event).toEqual({
      type: EventType.TrackEvent,
      event: 'Awesome event',
      properties: {},
    });
  });

  it('adds the user id when it exists', () => {
    const event = createTrackEvent({
      event: 'Awesome event',
    });

    expect(event).toEqual({
      type: EventType.TrackEvent,
      event: 'Awesome event',
      properties: {},
    });
  });
});

describe('#createScreenEvent', () => {
  beforeAll(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2000-01-01T00:00:00.000Z');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('creates a screen event with properties', () => {
    const event = createScreenEvent({
      name: 'AwesomeScreen',
      properties: {
        foo: 'bar',
      },
    });

    expect(event).toEqual({
      type: 'screen',
      name: 'AwesomeScreen',
      properties: {
        foo: 'bar',
      },
    });
  });

  it('creates a screen event without properties', () => {
    const event = createScreenEvent({
      name: 'AwesomeScreen',
    });

    expect(event).toEqual({
      type: 'screen',
      name: 'AwesomeScreen',
      properties: {},
    });
  });

  it('adds a user id if it exists', () => {
    const event = createScreenEvent({
      name: 'AwesomeScreen',
    });

    expect(event).toEqual({
      type: 'screen',
      name: 'AwesomeScreen',
      properties: {},
    });
  });
});

describe('#createIdentifyEvent', () => {
  beforeAll(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2000-01-01T00:00:00.000Z');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('creates an identify event', () => {
    const event = createIdentifyEvent({
      userTraits: {
        foo: 'bar',
      },
    });

    expect(event).toEqual({
      type: 'identify',
      traits: {
        foo: 'bar',
      },
    });
  });

  it('creates an identify event with optional traits', () => {
    const event = createIdentifyEvent({});

    expect(event).toEqual({
      type: 'identify',
      traits: {},
    });
  });
});

describe('#createGroupEvent', () => {
  beforeAll(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2000-01-01T00:00:00.000Z');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('creates a group event', () => {
    const event = createGroupEvent({
      groupId: 'some-group',
      groupTraits: {
        name: 'Segment',
      },
    });

    expect(event).toEqual({
      type: 'group',
      groupId: 'some-group',
      traits: {
        name: 'Segment',
      },
    });
  });

  it('creates an group event with optional traits', () => {
    const event = createGroupEvent({
      groupId: 'some-group',
    });

    expect(event).toEqual({
      groupId: 'some-group',
      type: 'group',
      traits: {},
    });
  });
});

describe('#createAliasEvent', () => {
  beforeAll(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2000-01-01T00:00:00.000Z');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('creates an alias event', () => {
    const event = createAliasEvent({
      userId: 'user-123',
      anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
      newUserId: 'new-user',
    });

    expect(event).toEqual({
      userId: 'new-user',
      type: 'alias',
      previousId: 'user-123',
    });
  });

  it('uses the anonymous id as previous id when no user id is available', () => {
    const event = createAliasEvent({
      anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
      newUserId: 'new-user',
    });

    expect(event).toEqual({
      userId: 'new-user',
      type: 'alias',
      previousId: 'eWpqvL-EHSHLWoiwagN-T',
    });
  });
});
