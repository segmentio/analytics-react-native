export const init = jest.fn(() => Promise.resolve());
export const start = jest.fn(() => Promise.resolve());
export const registerSessionReadyListener = jest.fn(() => Promise.resolve());
export const registerConversionListener = jest.fn(() => Promise.resolve());
export const registerDeepLinkListener = jest.fn(() => Promise.resolve());
export const logEvent = jest.fn(() => Promise.resolve());
export const setCurrencyCode = jest.fn(() => Promise.resolve());
export const setCustomerUserId = jest.fn(() => Promise.resolve());
export const setAdditionalData = jest.fn(() => Promise.resolve());

export default {
  init,
  start,
  registerSessionReadyListener,
  registerConversionListener,
  registerDeepLinkListener,
  logEvent,
  setCurrencyCode,
  setCustomerUserId,
  setAdditionalData,
};
