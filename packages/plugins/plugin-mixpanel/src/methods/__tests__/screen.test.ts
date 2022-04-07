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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks consolidated screens', () => {
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
    const mixpanel = new Mixpanel('1234');
    settings.consolidatedPageCalls = true;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).toBeCalled();
  });

  it('does not track consolidated screens', () => {
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
    const mixpanel = new Mixpanel('1234');
    settings.consolidatedPageCalls = false;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).not.toHaveBeenCalled();
  });

  it('tracks all screens', () => {
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
    const mixpanel = new Mixpanel('1234');
    settings.trackAllPages = true;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).toBeCalledTimes(1);
  });

  it('does not track all screens', () => {
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
    const mixpanel = new Mixpanel('1234');
    settings.trackAllPages = false;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).not.toHaveBeenCalled();
  });

  it('tracks named pages', () => {
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
    const mixpanel = new Mixpanel('1234');
    settings.trackNamedPages = true;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).toBeCalledTimes(1);
  });

  it('does not track named pages', () => {
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
    const mixpanel = new Mixpanel('1234');
    settings.trackNamedPages = false;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).not.toHaveBeenCalled();
  });

  it('tracks categorized pages', () => {
    const payload = {
      type: 'screen',
      properties: {
        isFirstTime: true,
        foo: 'bar',
        category: 'home',
      },
      name: 'Home',
    } as ScreenEventType;
    const settings: SegmentMixpanelSettings =
      sampleIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    settings.trackCategorizedPages = true;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).toBeCalledTimes(1);
  });

  it('does not track categorized pages', () => {
    const payload = {
      type: 'screen',
      properties: {
        isFirstTime: true,
        foo: 'bar',
        category: 'home',
      },
      name: 'Home',
    } as ScreenEventType;
    const settings: SegmentMixpanelSettings =
      sampleIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    settings.trackCategorizedPages = false;

    screen(payload, mixpanel, settings);

    expect(mixpanelTack).not.toHaveBeenCalled();
  });
});
