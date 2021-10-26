const defaultReduxState = {
  userInfo: {
    anonymousId: 'some-id',
    userId: 'userId-123-456',
    userTraits: {},
  },
  main: {
    events: [],
    eventsToRetry: [],
  },
  system: {
    settings: {},
  },
};

export const getMockStore = () => ({
  dispatch: jest.fn(),
  subscribe: jest.fn(),
  getState: jest.fn().mockReturnValue(defaultReduxState),
});
