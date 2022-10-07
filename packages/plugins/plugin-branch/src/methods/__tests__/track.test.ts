//@ts-ignore
import { EventType, TrackEventType } from '@segment/analytics-react-native';
import track from '../track';
import { mockLogEvent } from '../__mocks__/react-native-branch';
import * as util from '../../util';
import { mapEventNames } from '../../parameterMapping';

jest.mock('react-native-branch');

describe('#track', () => {
  const spyCreateBranchEventWithProps = jest.spyOn(
    util,
    'createBranchEventWithProps'
  );
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards a track event with name only', async () => {
    const event = {
      type: EventType.TrackEvent,
      event: 'test_event',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: {},
    } as TrackEventType;

    await track(event);

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
  });

  it('forwards a track event with name and properties', async () => {
    const event = {
      type: EventType.TrackEvent,
      event: 'another_test_event',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: { foo: 'bar' },
    } as TrackEventType;

    await track(event);

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(spyCreateBranchEventWithProps).toHaveBeenCalledTimes(1);
    expect(spyCreateBranchEventWithProps).toHaveBeenCalledWith(
      'another_test_event',
      { foo: 'bar' },
      false
    );
  });

  it('maps event name to branch standard when applicable', async () => {
    const event = {
      type: EventType.TrackEvent,
      event: 'Product Clicked',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: {},
    } as TrackEventType;

    await track(event);

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(spyCreateBranchEventWithProps).toHaveBeenCalledWith(
      mapEventNames[event.event],
      {},
      true
    );
  });
});
