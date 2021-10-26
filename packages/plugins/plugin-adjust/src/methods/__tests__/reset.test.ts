import reset from '../reset';
import { resetSessionPartnerParameters } from '../__mocks__/react-native-adjust';

describe('#reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls resetSessionPartnerParameters', () => {
    reset();

    expect(resetSessionPartnerParameters).toHaveBeenCalledTimes(1);
    expect(resetSessionPartnerParameters).toHaveBeenCalledWith();
  });
});
