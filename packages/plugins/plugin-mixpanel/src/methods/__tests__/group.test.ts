import group from '../group';
import type {
  SegmentMixpanelSettings,
  GroupEventType,
} from '@segment/analytics-react-native';
import { sampleIntegrationSettings } from '../__mocks__/__helpers__/constants';
import { Mixpanel } from '../__mocks__/mixpanel-react-native';

describe('#group', () => {
  let mixpanel: Mixpanel;
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
    sampleIntegrationSettings.integrations.Mixpanel;

  beforeEach(() => {
    jest.clearAllMocks();
    mixpanel = new Mixpanel('1234');
  });

  it('calls the group method when id is present', () => {
    let getGroupSpy = jest.spyOn(mixpanel, 'getGroup');
    settings.groupIdentifierTraits = ['newGroup'];

    group(payload, mixpanel, settings);

    expect(mixpanel.setGroup).toBeCalled();
    expect(getGroupSpy).toBeCalled();
  });

  it(' does not call the group method when no traits are provided in settings', () => {
    let getGroupSpy = jest.spyOn(mixpanel, 'getGroup');
    settings.groupIdentifierTraits = [];

    group(payload, mixpanel, settings);

    expect(mixpanel.setGroup).toBeCalledTimes(0);
    expect(getGroupSpy).not.toBeCalled();
  });
});
