export const removeGlobalPartnerParameters = jest.fn();
export const addGlobalPartnerParameter = jest.fn();
export const trackEvent = jest.fn();

export const Adjust = {
  removeGlobalPartnerParameters,
  addGlobalPartnerParameter,
  trackEvent,
};

export const addCallbackParameter = jest.fn();
export const setRevenue = jest.fn();
export const setTransactionId = jest.fn();

export class AdjustEvent {
  addCallbackParameter = addCallbackParameter;
  setRevenue = setRevenue;
  setTransactionId = setTransactionId;
}
