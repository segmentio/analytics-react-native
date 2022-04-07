import mixpanelTrack from '../mixpanelTrack';
import type {
  SegmentMixpanelSettings,
  JsonMap,
} from '@segment/analytics-react-native';
import { mockIntegrationSettings } from '../__mocks__/mockIntegrationSettings';
import { Mixpanel } from '../__mocks__/mixpanel-react-native';

describe('#mixpanelTrack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks the raw event', () => {
    const properties = {
      firstName: 'John',
      phone: '(555) 555-5555',
      foo: 'bar',
    } as JsonMap;
    const eventName = 'Test Event';
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(mixpanel.track).toBeCalledWith(eventName, properties);
  });

  it('calls People API if setting is true', () => {
    const properties = {
      firstName: 'John',
      phone: '(555) 555-5555',
      foo: 'bar',
      prop1: 'string',
      prop2: 34,
      prop3: false,
    } as JsonMap;
    const eventName = 'Test Event';
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    const result = jest.spyOn(mixpanel, 'getPeople');

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(result).toBeCalled();
  });

  it('returns if people setting is false', () => {
    const properties = {
      firstName: 'John',
      phone: '(555) 555-5555',
      foo: 'bar',
    } as JsonMap;
    const eventName = 'Test Event';
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    const result = jest.spyOn(mixpanel, 'getPeople');

    settings.people = false;

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(result).toBeCalledTimes(0);
  });

  it('sets the increment value if present', () => {
    const properties = {
      firstName: 'John',
      phone: '(555) 555-5555',
      foo: 'bar',
      prop1: 14,
      prop2: 'hello',
    } as JsonMap;
    const eventName = 'Test Event';
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    const result = jest.spyOn(mixpanel, 'getPeople');
    settings.people = true;
    settings.propIncrements = ['prop1', 'prop2'];

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(result).toBeCalledTimes(1);
  });

  it('does not set the increment value if it is not a number', () => {
    const properties = {
      firstName: 'John',
      phone: '(555) 555-5555',
      foo: 'bar',
      prop1: 'hello',
      prop2: 'goodbye',
    } as JsonMap;
    const eventName = 'Test Event';
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    const result = jest.spyOn(mixpanel, 'getPeople');
    settings.propIncrements = ['prop1', 'prop2'];

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(result).toBeCalledTimes(0);
  });

  it('sets event increment values', () => {
    const properties = {
      firstName: 'John',
      phone: '(555) 555-5555',
      foo: 'bar',
      prop1: 'hello',
      prop2: 'goodbye',
    } as JsonMap;
    const eventName = 'Test Event';
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    const result = jest.spyOn(mixpanel, 'getPeople');
    settings.propIncrements = [];
    settings.eventIncrements = ['Test Event'];

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(result).toBeCalledTimes(2);
  });

  it('does not set event increment values if event name is undefined', () => {
    const properties = {
      firstName: 'John',
      phone: '(555) 555-5555',
      foo: 'bar',
      prop1: 'hello',
      prop2: 'goodbye',
    } as JsonMap;
    const eventName = 'Test Event';
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    const result = jest.spyOn(mixpanel, 'getPeople');
    settings.eventIncrements = ['Real Event'];

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(result).toBeCalledTimes(0);
  });

  it('sets revenue', () => {
    const properties = {
      firstName: 'John',
      phone: '(555) 555-5555',
      foo: 'bar',
      prop1: 'hello',
      prop2: 'goodbye',
      revenue: 25,
    } as JsonMap;
    const eventName = 'Test Event';
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    const result = jest.spyOn(mixpanel, 'getPeople');
    settings.eventIncrements = [];

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(result).toBeCalled();
  });

  it('does not set revenue', () => {
    const properties = {
      firstName: 'John',
      phone: '(555) 555-5555',
      foo: 'bar',
      prop1: 'hello',
      prop2: 'goodbye',
    } as JsonMap;
    const eventName = 'Test Event';
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    const result = jest.spyOn(mixpanel, 'getPeople');

    mixpanelTrack(eventName, properties, settings, mixpanel);

    expect(result).toBeCalledTimes(0);
  });
});
