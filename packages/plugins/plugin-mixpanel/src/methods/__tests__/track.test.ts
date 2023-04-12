import mixpanelTrack from '../track';
import type { JsonMap } from '@segment/analytics-react-native';
import type { SegmentMixpanelSettings } from '../../types';
import { sampleIntegrationSettings } from './__helpers__/constants';
import { Mixpanel } from '../__mocks__/mixpanel-react-native';

describe('#mixpanelTrack', () => {
  let mixpanel: Mixpanel;
  const properties = {
    firstName: 'John',
    phone: '(555) 555-5555',
    foo: 'bar',
  } as JsonMap;
  const eventName = 'Test Event';
  const settings: SegmentMixpanelSettings =
    sampleIntegrationSettings.integrations.Mixpanel;

  beforeEach(() => {
    jest.clearAllMocks();
    mixpanel = new Mixpanel('1234');
  });

  it('tracks the raw event', () => {
    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(mixpanel.track).toBeCalledWith(eventName, properties);
  });

  it('calls People API if setting is true', () => {
    settings.people = true;
    const getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');
    const newProperties = {
      ...properties,
      prop1: 'string',
      prop2: 34,
      prop3: false,
    };

    mixpanelTrack(eventName, newProperties, settings, mixpanel);

    expect(getPeopleSpy).toBeCalled();
  });

  it('returns if people setting is false', () => {
    settings.people = false;
    const getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(getPeopleSpy).not.toHaveBeenCalled();
  });

  it('sets the increment value if present', () => {
    settings.people = true;
    settings.propIncrements = ['incProp'];
    const newProperties = { ...properties, incProp: 10 };
    const getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    mixpanelTrack(eventName, newProperties, settings, mixpanel);

    expect(getPeopleSpy).toBeCalledTimes(1);
  });

  it('does not set the increment value if it is not a number', () => {
    const newProperties = { incProp: 'string' };
    settings.propIncrements = ['prop1', 'prop2'];
    const getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    mixpanelTrack(eventName, newProperties, settings, mixpanel);

    expect(getPeopleSpy).not.toHaveBeenCalled();
  });

  it('sets event increment values', () => {
    settings.propIncrements = [];
    settings.eventIncrements = ['Test Event'];
    const getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(getPeopleSpy).toBeCalledTimes(2);
  });

  it('does not set event increment values if event name is undefined', () => {
    settings.eventIncrements = ['Real Event'];
    const getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(getPeopleSpy).not.toHaveBeenCalled();
  });

  it('sets revenue', () => {
    const newProperties = { revenue: 15 };
    settings.eventIncrements = [];
    const getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    mixpanelTrack(eventName, newProperties, settings, mixpanel);

    expect(getPeopleSpy).toBeCalled();
  });

  it('does not set revenue', () => {
    const getPeopleSpy = jest.spyOn(mixpanel, 'getPeople');

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(getPeopleSpy).not.toHaveBeenCalled();
  });
});
