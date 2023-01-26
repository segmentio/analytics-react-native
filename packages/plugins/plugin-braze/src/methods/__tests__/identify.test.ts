import {
  changeUser,
  setFirstName,
  setCountry,
  setPhoneNumber,
  setDateOfBirth,
  setLastName,
  setEmail,
  setGender,
  setHomeCity,
  setCustomUserAttribute,
} from '../__mocks__/react-native-appboy-sdk';
import type { IdentifyEventType } from '@segment/analytics-react-native';
import { BrazePlugin } from '../../BrazePlugin';

describe('#identify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls correct methods #1', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'identify',
      traits: {
        firstName: 'John',
        phone: '(555) 555-5555',
        foo: 'bar',
      },
      userId: 'user',
    };

    plugin.identify(payload as IdentifyEventType);

    expect(changeUser).toHaveBeenCalledWith('user');
    expect(setFirstName).toHaveBeenCalledWith('John');
    expect(setPhoneNumber).toHaveBeenCalledWith('(555) 555-5555');
    expect(setCustomUserAttribute).toHaveBeenCalledWith('foo', 'bar');
  });

  it('calls correct methods #2', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'identify',
      traits: {
        lastName: 'Smith',
        birthday: 'Saturday February 29, 20',
        address: {
          city: 'Denver',
        },
      },
    };

    plugin.identify(payload as IdentifyEventType);

    expect(setDateOfBirth).toHaveBeenCalledWith(2020, 2, 29);
    expect(setLastName).toHaveBeenCalledWith('Smith');
    expect(setHomeCity).toHaveBeenCalledWith('Denver');
  });

  it('handles invalid dates gracefully', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'identify',
      traits: {
        lastName: 'Smith',
        birthday: 'not a valid date',
        address: {
          city: 'Denver',
        },
      },
    };

    plugin.identify(payload as IdentifyEventType);

    expect(setDateOfBirth).not.toHaveBeenCalled();
    expect(setLastName).toHaveBeenCalledWith('Smith');
    expect(setHomeCity).toHaveBeenCalledWith('Denver');
  });

  it('calls correct methods #3', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'identify',
      traits: {
        gender: 'o',
        email: 'test@test.com',
        address: {
          country: 'US',
        },
      },
    };

    plugin.identify(payload as IdentifyEventType);

    expect(setEmail).toHaveBeenCalledWith('test@test.com');
    expect(setGender).toHaveBeenCalledWith('o');
    expect(setCountry).toHaveBeenCalledWith('US');
  });

  it('only calls setGender with defined values', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'identify',
      traits: {
        gender: 'male',
      },
    };

    plugin.identify(payload as IdentifyEventType);

    expect(setGender).not.toHaveBeenCalled();
  });
});
