import identify from '../identify';
import type {
  SegmentMixpanelSettings,
  IdentifyEventType,
} from '@segment/analytics-react-native';
import { mockIntegrationSettings } from '../__mocks__/mockIntegrationSettings';
import { Mixpanel } from '../__mocks__/mixpanel-react-native';

describe('#identify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('calls identify with userId', () => {
    const payload = {
      type: 'identify',
      traits: {
        firstName: 'John',
        phone: '(555) 555-5555',
        foo: 'bar',
      },
      userId: 'user',
    } as IdentifyEventType;
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');

    identify(payload, mixpanel, settings);

    expect(mixpanel.identify).toBeCalled();
  });

  it('does not call identify when userId is undefined', () => {
    const payload = {
      type: 'identify',
      traits: {
        firstName: 'John',
        phone: '(555) 555-5555',
        foo: 'bar',
      },
      userId: undefined,
    } as IdentifyEventType;
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');

    identify(payload, mixpanel, settings);

    expect(mixpanel.identify).toBeCalledTimes(0);
  });

  it('sets all traits by default', () => {
    const payload = {
      type: 'identify',
      traits: {
        firstName: 'John',
        phone: '(555) 555-5555',
        foo: 'bar',
      },
      userId: 'user',
    } as IdentifyEventType;
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    settings.setAllTraitsByDefault = true;
    const result = jest.spyOn(mixpanel, 'getPeople');

    identify(payload, mixpanel, settings);

    expect(mixpanel.registerSuperProperties).toBeCalled();
    expect(result).toBeCalled();
  });

  it('does not set all traits by default', () => {
    const payload = {
      type: 'identify',
      traits: {
        firstName: 'John',
        phone: '(555) 555-5555',
        foo: 'bar',
      },
      userId: 'user',
    } as IdentifyEventType;
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    settings.setAllTraitsByDefault = false;
    const result = jest.spyOn(mixpanel, 'getPeople');

    identify(payload, mixpanel, settings);

    expect(mixpanel.registerSuperProperties).toBeCalledTimes(0);
    expect(result).toBeCalledTimes(0);
  });

  it('registers superProperties', () => {
    const payload = {
      type: 'identify',
      traits: {
        firstName: 'John',
        phone: '(555) 555-5555',
        foo: 'bar',
        prop1: 'string',
      },
      userId: 'user',
    } as IdentifyEventType;
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    settings.setAllTraitsByDefault = false;
    settings.superProperties = ['prop1'];
    // const result = jest.spyOn(mixpanel, 'getPeople');

    identify(payload, mixpanel, settings);

    expect(mixpanel.registerSuperProperties).toBeCalledTimes(1);
  });

  it('does not register superProperties', () => {
    const payload = {
      type: 'identify',
      traits: {
        firstName: 'John',
        phone: '(555) 555-5555',
        foo: 'bar',
        prop1: 'string',
      },
      userId: 'user',
    } as IdentifyEventType;
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    settings.setAllTraitsByDefault = false;
    settings.superProperties = [];
    // const result = jest.spyOn(mixpanel, 'getPeople');

    identify(payload, mixpanel, settings);

    expect(mixpanel.registerSuperProperties).toBeCalledTimes(0);
  });

  it('registers people Properties', () => {
    const payload = {
      type: 'identify',
      traits: {
        firstName: 'John',
        phone: '(555) 555-5555',
        foo: 'bar',
        prop1: 'string',
      },
      userId: 'user',
    } as IdentifyEventType;
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    settings.superProperties = [];
    settings.peopleProperties = ['prop1'];
    settings.people = true;
    const result = jest.spyOn(mixpanel, 'getPeople');

    identify(payload, mixpanel, settings);

    expect(result).toBeCalledTimes(1);
  });

  it(' does not register people Properties', () => {
    const payload = {
      type: 'identify',
      traits: {
        firstName: 'John',
        phone: '(555) 555-5555',
        foo: 'bar',
        prop1: 'string',
      },
      userId: 'user',
    } as IdentifyEventType;
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    settings.peopleProperties = [];
    const result = jest.spyOn(mixpanel, 'getPeople');

    identify(payload, mixpanel, settings);

    expect(result).toBeCalledTimes(0);
  });
});
