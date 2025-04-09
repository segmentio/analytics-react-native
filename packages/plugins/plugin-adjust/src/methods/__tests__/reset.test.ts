import reset from '../reset';
import { removeGlobalPartnerParameters } from '../__mocks__/react-native-adjust';

describe('#reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls resetSessionPartnerParameters', () => {
    reset();

    expect(removeGlobalPartnerParameters).toHaveBeenCalledTimes(1);
    expect(removeGlobalPartnerParameters).toHaveBeenCalledWith();
  });
});
