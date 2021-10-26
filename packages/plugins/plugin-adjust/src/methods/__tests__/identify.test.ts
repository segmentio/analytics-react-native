import identify from '../identify';
import type { IdentifyEventType } from '@segment/analytics-react-native';
import { addSessionPartnerParameter } from '../__mocks__/react-native-adjust';

describe('#identify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets the user_id', () => {
    const payload = {
      type: 'identify',
      userId: 'user',
    };

    identify(payload as IdentifyEventType);

    expect(addSessionPartnerParameter).toHaveBeenCalledWith('user_id', 'user');
  });

  it('sets the anonymous_id', () => {
    const payload = {
      type: 'identify',
      anonymousId: 'anon',
    };

    identify(payload as IdentifyEventType);

    expect(addSessionPartnerParameter).toHaveBeenCalledWith(
      'anonymous_id',
      'anon'
    );
  });
});
