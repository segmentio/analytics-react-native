import { BranchEvent } from 'react-native-branch';

export default {
  setIdentity: jest.fn(),
  createBranchUniversalObject: jest
    .fn()
    .mockImplementation(async (ident, options) => {
      return { ident, options };
    }),
};

export { BranchEvent };
