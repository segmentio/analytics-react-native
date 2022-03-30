import type { GroupEventType } from '@segment/analytics-react-native/src';
import group from '../group';
import * as Taplytics from 'taplytics-react-native';

jest.mock('taplytics-react-native', () => ({
  logEvent: jest.fn(),
}));

describe('#group', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs a group event', () => {
    const event = {
      type: 'group',
      groupId: 'testId',
      traits: {
        description: 'description',
        email: 'test@test.com',
      },
    } as GroupEventType;

    group(event);

    expect(Taplytics.logEvent).toHaveBeenCalledTimes(1);
    expect(Taplytics.logEvent).toHaveBeenCalledWith('GROUP event: testId', 0, {
      description: 'description',
      email: 'test@test.com',
    });
  });
});
