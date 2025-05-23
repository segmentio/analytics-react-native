const mockReset = jest.fn();

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn().mockImplementation(() => ({
    resetAnalyticsData: mockReset,
  })),
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(),
}));

import reset from '../reset';

describe('#reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the reset event', async () => {
    await reset();

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith();
  });
});
