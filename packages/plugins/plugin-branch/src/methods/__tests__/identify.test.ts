import type { IdentifyEventType } from '@segment/analytics-react-native';
import branch from '../__mocks__/react-native-branch';
import identify from '../identify';

jest.mock('react-native-branch');

describe('#identify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards event to set a new user identity', () => {
    const payload = {
      type: 'identify',
      userId: '123',
    } as IdentifyEventType;

    identify(payload);

    expect(branch.setIdentity).toBeCalled();
    expect(branch.setIdentity).toHaveBeenCalledWith(payload.userId);
  });
});
