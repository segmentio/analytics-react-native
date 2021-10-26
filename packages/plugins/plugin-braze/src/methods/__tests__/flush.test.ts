import flush from '../flush';
import { requestImmediateDataFlush } from '../__mocks__/react-native-appboy-sdk';

describe('#flush', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls requestImmediateDataFlush', () => {
    flush();

    expect(requestImmediateDataFlush).toHaveBeenCalledTimes(1);
    expect(requestImmediateDataFlush).toHaveBeenCalledWith();
  });
});
