import screen from '../screen';
import type { ScreenEventType } from '@segment/analytics-react-native';
import type { SegmentMixpanelSettings } from '../../types';
import { sampleIntegrationSettings } from './__helpers__/constants';
import { Mixpanel } from '../__mocks__/mixpanel-react-native';
import track from '../track';

jest.mock('../track.ts');

describe('#screen', () => {
  let mixpanel: Mixpanel;
  const payload = {
    type: 'screen',
    properties: {
      isFirstTime: true,
      foo: 'bar',
    },
    name: 'Home',
  } as ScreenEventType;
  const settings: SegmentMixpanelSettings =
    sampleIntegrationSettings.integrations.Mixpanel;

  beforeEach(() => {
    jest.clearAllMocks();
    mixpanel = new Mixpanel('1234');
  });

  it('tracks consolidated screens', () => {
    settings.consolidatedPageCalls = true;
    let eventName = 'Loaded a Screen';

    screen(payload, mixpanel, settings);

    expect(track).toBeCalledWith(
      eventName,
      payload.properties,
      settings,
      mixpanel
    );
  });

  it('does not track consolidated screens', () => {
    settings.consolidatedPageCalls = false;

    screen(payload, mixpanel, settings);

    expect(track).not.toHaveBeenCalled();
  });

  it('tracks all screens', () => {
    settings.trackAllPages = true;
    let eventName = `Viewed ${payload.name} Screen`;

    screen(payload, mixpanel, settings);

    expect(track).toBeCalledWith(
      eventName,
      payload.properties,
      settings,
      mixpanel
    );
  });

  it('does not track all screens', () => {
    settings.trackAllPages = false;

    screen(payload, mixpanel, settings);

    expect(track).not.toHaveBeenCalled();
  });

  it('tracks named pages', () => {
    settings.trackNamedPages = true;
    let eventName = `Viewed ${payload.name} Screen`;

    screen(payload, mixpanel, settings);

    expect(track).toBeCalledWith(
      eventName,
      payload.properties,
      settings,
      mixpanel
    );
  });

  it('does not track named pages', () => {
    settings.trackNamedPages = false;

    screen(payload, mixpanel, settings);

    expect(track).not.toHaveBeenCalled();
  });

  it('tracks categorized pages', () => {
    payload.properties.category = 'e-commerce';
    settings.trackCategorizedPages = true;
    let eventName = `Viewed ${payload.properties.category} Screen`;

    screen(payload, mixpanel, settings);

    expect(track).toBeCalledWith(
      eventName,
      payload.properties,
      settings,
      mixpanel
    );
  });

  it('does not track categorized pages', () => {
    settings.trackCategorizedPages = false;

    screen(payload, mixpanel, settings);

    expect(track).not.toHaveBeenCalled();
  });
});
