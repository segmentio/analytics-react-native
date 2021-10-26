import identify from '../identify';
import type { IdentifyEventType } from '@segment/analytics-react-native';
import {
  setAdditionalData,
  setCurrencyCode,
  setCustomerUserId,
} from '../__mocks__/react-native-appsflyer';

describe('#identify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets the userId', () => {
    const payload = {
      type: 'identify',
      userId: 'user',
    };

    identify(payload as IdentifyEventType);

    expect(setCustomerUserId).toHaveBeenCalledWith('user');
  });

  it('sets custom data', () => {
    const payload = {
      type: 'identify',
      traits: {
        email: 'john.smith@email.com',
        firstName: 'John',
        lastName: 'Smith',
        foo: 'bar',
      },
    };

    identify(payload as IdentifyEventType);

    expect(setAdditionalData).toHaveBeenCalledWith({
      email: 'john.smith@email.com',
      firstName: 'John',
      lastName: 'Smith',
    });
  });

  it('sets the currency code', () => {
    const payload = {
      type: 'identify',
      traits: {
        currencyCode: 'JPY',
      },
    };

    identify(payload as IdentifyEventType);

    expect(setCurrencyCode).toHaveBeenCalledWith('JPY');
  });
});
