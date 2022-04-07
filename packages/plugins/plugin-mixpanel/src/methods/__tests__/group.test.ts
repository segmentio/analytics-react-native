import group from '../group';
import type {
  SegmentMixpanelSettings,
  GroupEventType,
} from '@segment/analytics-react-native';
import { mockIntegrationSettings } from '../__mocks__/mockIntegrationSettings';
import { Mixpanel } from '../__mocks__/mixpanel-react-native';

describe('#group', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the group method when id is present', () => {
    const payload = {
      type: 'group',
      traits: {
        newGroup: true,
        coolGroup: false,
        members: 4,
      },
      groupId: '23322',
    } as GroupEventType;
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    const result = jest.spyOn(mixpanel, 'getGroup');
    settings.groupIdentifierTraits = ['newGroup'];

    group(payload, mixpanel, settings);
    expect(mixpanel.setGroup).toBeCalled();
    expect(result).toBeCalled();
  });

  it(' does not call the group method when no traits are provided in settings', () => {
    const payload = {
      type: 'group',
      traits: {
        newGroup: true,
        coolGroup: false,
        members: 4,
      },
      groupId: '23322',
    } as GroupEventType;
    const settings: SegmentMixpanelSettings =
      mockIntegrationSettings.integrations.Mixpanel;
    const mixpanel = new Mixpanel('1234');
    const result = jest.spyOn(mixpanel, 'getGroup');
    settings.groupIdentifierTraits = [];

    group(payload, mixpanel, settings);
    expect(mixpanel.setGroup).toBeCalledTimes(0);
    expect(result).toBeCalledTimes(0);
  });
});
