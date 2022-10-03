//@ts-ignore
import type { AliasEventType } from '@segment/analytics-react-native';
import branch from '../__mocks__/react-native-branch';
import alias from '../alias';

jest.mock('react-native-branch');

describe('#alias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards event to set a new user identity', () => {
    const payload = {
      type: 'alias',
      userId: '123',
    } as AliasEventType;

    alias(payload);

    expect(branch.setIdentity).toBeCalled();
    expect(branch.setIdentity).toHaveBeenCalledWith(payload.userId);
  });
});
