import reset from '../reset';
import * as Taplytics from 'taplytics-react-native';

jest.mock('taplytics-react-native', () => ({
  resetAppUser: jest.fn(),
}));

describe('#reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards reset event', () => {
    reset();

    expect(Taplytics.resetAppUser).toHaveBeenCalledTimes(1);
  });
});
