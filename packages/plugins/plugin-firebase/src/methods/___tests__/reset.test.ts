import reset from '../reset';

const mockReset = jest.fn();

jest.mock('@react-native-firebase/analytics', () => () => ({
  resetAnalyticsData: mockReset,
}));

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
