import alias from '../alias';
import type { AliasEventType } from '@segment/analytics-react-native';
import { MixpanelPlugin } from '../../MixpanelPlugin';
import { Mixpanel } from '../__mocks__/mixpanel-react-native';
import { SegmentClient } from '../../../../../core/src/analytics';
import { MockSegmentStore } from '../../../../../core/src/__tests__/__helpers__/mockSegmentStore';
import { getMockLogger } from '../../../../../core/src/__tests__/__helpers__/mockLogger';

jest.mock('mixpanel-react-native');

describe('#alias', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    logger: getMockLogger(),
    config: {
      writeKey: '123-456',
      trackApplicationLifecycleEvents: true,
    },
    store,
  };
  let plugin: MixpanelPlugin = new MixpanelPlugin();

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new MixpanelPlugin();
    plugin.analytics = new SegmentClient(clientArgs);
  });

  it('calls the alias method', () => {
    const payload = {
      type: 'alias',
      userId: '123',
    } as AliasEventType;
    const mixpanel = new Mixpanel('123');
    const analytics = plugin.analytics!;

    alias(payload, mixpanel, analytics);

    expect(mixpanel.getDistinctId).toBeCalled();
    // need to fix this one
    // expect(mixpanel.alias).toBeCalled();
  });
});
