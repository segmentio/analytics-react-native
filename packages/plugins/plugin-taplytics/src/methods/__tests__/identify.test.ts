import type { IdentifyEventType } from '@segment/analytics-react-native/src';
import identify from '../identify';
import * as Taplytics from 'taplytics-react-native';

jest.mock('taplytics-react-native', () => ({
  setUserAttributes: jest.fn(),
}));

describe('#identify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the identify event with only userId', () => {
    const event = {
      type: 'identify',
      userId: 'testId',
      traits: {
        description: 'description',
      },
    } as IdentifyEventType;

    identify(event);

    expect(Taplytics.setUserAttributes).toHaveBeenCalledTimes(1);
    expect(Taplytics.setUserAttributes).toHaveBeenCalledWith({
      user_id: 'testId',
    });
  });

  it('sends the identify event with ID and other user attributes', () => {
    const event = {
      type: 'identify',
      userId: 'testId',
      traits: {
        age: 25,
        gender: 'female',
        description: 'description',
        name: 'Test Name',
        email: 'test@test.com',
      },
    } as IdentifyEventType;

    identify(event);

    expect(Taplytics.setUserAttributes).toHaveBeenCalledTimes(1);
    expect(Taplytics.setUserAttributes).toHaveBeenCalledWith({
      user_id: 'testId',
      age: 25,
      gender: 'female',
      name: 'Test Name',
      email: 'test@test.com',
    });
  });
});
