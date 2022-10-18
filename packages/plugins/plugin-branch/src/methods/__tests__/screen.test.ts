import { EventType, ScreenEventType } from '@segment/analytics-react-native';
import { BranchEvent } from 'react-native-branch';
import { mockLogEvent } from '../__mocks__/react-native-branch';
import * as util from '../util';
import screen from '../screen';

jest.mock('react-native-branch');

describe('#screen', () => {
  const spyCreateBranchEventWithProps = jest.spyOn(
    util,
    'createBranchEventWithProps'
  );
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards a screen event and sets the appropriate branch event name', async () => {
    const event = {
      type: EventType.ScreenEvent,
      name: 'test_event',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: {},
    } as ScreenEventType;

    await screen(event);

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(spyCreateBranchEventWithProps).toHaveBeenCalledTimes(1);
    expect(spyCreateBranchEventWithProps).toHaveBeenCalledWith(
      BranchEvent.ViewItem,
      {},
      true
    );
  });
});
