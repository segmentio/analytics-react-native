export const initMock = jest.fn();
export const setServerMock = jest.fn();
export const identifyMock = jest.fn();
export const aliasMock = jest.fn();
export const trackMock = jest.fn();
export const trackWithGroupsMock = jest.fn();
export const setGroupMock = jest.fn();

export class Mixpanel {
  public token: string;

  constructor(token: string) {
    this.token = token;
  }

  init = initMock;
  setServerURL = setServerMock;
  setLoggingEnabled = jest.fn();
  setUseIpAddressForGeolocation = jest.fn();
  hasOptedOutTracking = jest.fn();
  optInTracking = jest.fn();
  optOutTracking = jest.fn();
  identify = identifyMock;
  alias = aliasMock;
  track = trackMock;
  getPeople = () => new People();
  trackWithGroups = trackWithGroupsMock;
  setGroup = setGroupMock;
  getGroup = () => new MixpanelGroup();
  addGroup = jest.fn();
  removeGroup = jest.fn();
  deleteGroup = jest.fn();
  registerSuperProperties = jest.fn();
  registerSuperPropertiesOnce = jest.fn();
  unregisterSuperProperty = jest.fn();
  getSuperProperties = jest.fn();
  clearSuperProperties = jest.fn();
  timeEvent = jest.fn();
  eventElapsedTime = jest.fn();
  reset = jest.fn();
  getDistinctId = jest.fn(() => Promise.resolve('mixpanelId'));
  flush = jest.fn();
}

export class People {
  set = jest.fn();
  setOnce = jest.fn();
  increment = jest.fn();
  append = jest.fn();
  union = jest.fn();
  remove = jest.fn();
  unset = jest.fn();
  trackCharge = jest.fn();
  clearCharges = jest.fn();
  deleteUser = jest.fn();
}

export class MixpanelGroup {
  set = jest.fn();
  setOnce = jest.fn();
  unset = jest.fn();
  remove = jest.fn();
  union = jest.fn();
}
