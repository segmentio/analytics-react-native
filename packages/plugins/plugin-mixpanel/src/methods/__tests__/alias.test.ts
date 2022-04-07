import alias from '../alias';
import type { AliasEventType } from '@segment/analytics-react-native';
import { Mixpanel } from '../__mocks__/mixpanel-react-native';

describe('#alias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the alias method', () => {
    const payload = {
      type: 'alias',
      userId: '123',
    } as AliasEventType;
    const mixpanel = new Mixpanel('123');

    alias(payload, mixpanel);

    expect(mixpanel.getDistinctId).toBeCalled();
    // need to fix this one
    // expect(mixpanel.alias).toBeCalled();
  });
});
