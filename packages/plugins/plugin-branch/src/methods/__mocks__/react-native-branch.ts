export default {
  setIdentity: jest.fn(),
  createBranchUniversalObject: jest
    .fn()
    .mockImplementation(async (ident: unknown, options: unknown) => {
      return Promise.resolve({ ident, options });
    }),
};

export const mockLogEvent = jest.fn();

export const BranchEvent = jest.fn().mockImplementation(() => {
  return {
    logEvent: mockLogEvent,
  };
});
