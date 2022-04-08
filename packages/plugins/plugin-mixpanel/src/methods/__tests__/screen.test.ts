import screen from '../screen';
import type {
  SegmentMixpanelSettings,
  ScreenEventType,
} from '@segment/analytics-react-native';
import { sampleIntegrationSettings } from '../__mocks__/__helpers__/constants';
import { Mixpanel } from '../__mocks__/mixpanel-react-native';
import mixpanelTack from '../mixpanelTrack';

jest.mock('../mixpanelTrack.ts');

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

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).toBeCalled();
  });

  it('does not track consolidated screens', () => {
    settings.consolidatedPageCalls = false;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).not.toHaveBeenCalled();
  });

  it('tracks all screens', () => {
    settings.trackAllPages = true;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).toBeCalledTimes(1);
  });

  it('does not track all screens', () => {
    settings.trackAllPages = false;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).not.toHaveBeenCalled();
  });

  it('tracks named pages', () => {
    settings.trackNamedPages = true;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).toBeCalledTimes(1);
  });

  it('does not track named pages', () => {
    settings.trackNamedPages = false;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).not.toHaveBeenCalled();
  });

  it('tracks categorized pages', () => {
    payload.properties.category = 'e-commerce';
    settings.trackCategorizedPages = true;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).toBeCalledTimes(1);
  });

  it('does not track categorized pages', () => {
    settings.trackCategorizedPages = false;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).not.toHaveBeenCalled();
  });
});
