import identify from '../identify';
import type {
  SegmentMixpanelSettings,
  IdentifyEventType,
} from '@segment/analytics-react-native';
import { sampleIntegrationSettings } from '../__mocks__/__helpers__/constants';
import { Mixpanel } from '../__mocks__/mixpanel-react-native';

describe('#identify', () => {
  let mixpanel: Mixpanel;
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
    sampleIntegrationSettings.integrations.Mixpanel;

  beforeEach(() => {
    jest.clearAllMocks();
    mixpanel = new Mixpanel('1234');
  });
  it('calls identify with userId', () => {
    identify(payload, mixpanel, settings);

    expect(mixpanel.identify).toBeCalled();
  });

  it('does not call identify when userId is undefined', () => {
    payload.userId = undefined;

    identify(payload, mixpanel, settings);

    expect(mixpanel.identify).not.toHaveBeenCalled();
  });

  it('sets all traits by default', () => {
    payload.userId = 'userId';
    settings.setAllTraitsByDefault = true;
    let getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    identify(payload, mixpanel, settings);

    expect(mixpanel.registerSuperProperties).toBeCalled();
    expect(getPeopleSpy).toBeCalled();
  });

  it('does not set all traits by default', () => {
    settings.setAllTraitsByDefault = false;
    let getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    identify(payload, mixpanel, settings);

    expect(mixpanel.registerSuperProperties).not.toHaveBeenCalled();
    expect(getPeopleSpy).not.toHaveBeenCalled();
  });

  it('registers superProperties', () => {
    payload.traits.prop1 = 'string';
    settings.superProperties = ['prop1'];

    identify(payload, mixpanel, settings);

    expect(mixpanel.registerSuperProperties).toBeCalledTimes(1);
  });

  it('does not register superProperties', () => {
    settings.setAllTraitsByDefault = false;
    settings.superProperties = [];

    identify(payload, mixpanel, settings);

    expect(mixpanel.registerSuperProperties).not.toHaveBeenCalled();
  });

  it('registers people Properties', () => {
    settings.superProperties = [];
    settings.peopleProperties = ['prop1'];
    settings.people = true;
    let getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    identify(payload, mixpanel, settings);

    expect(getPeopleSpy).toBeCalledTimes(1);
  });

  it(' does not register people Properties', () => {
    settings.peopleProperties = [];
    const getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    identify(payload, mixpanel, settings);

    expect(getPeopleSpy).not.toHaveBeenCalled();
  });
});
