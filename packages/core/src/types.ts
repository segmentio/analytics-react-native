import type { Persistor } from '@segment/sovran-react-native';

export type JsonValue =
  | boolean
  | number
  | string
  | null
  | JsonList
  | JsonMap
  | undefined;
export interface JsonMap {
  [key: string]: JsonValue;
  [index: number]: JsonValue;
}
export interface JsonList extends Array<JsonValue> {}

export type SegmentEvent =
  | TrackEventType
  | ScreenEventType
  | IdentifyEventType
  | GroupEventType
  | AliasEventType;

interface BaseEventType {
  anonymousId?: string;
  messageId?: string;
  userId?: string;
  timestamp?: string;

  context?: PartialContext;
  integrations?: SegmentAPIIntegrations;
  _metadata?: DestinationMetadata;
}

export interface TrackEventType extends BaseEventType {
  type: EventType.TrackEvent;
  event: string;
  properties?: JsonMap;
}

export interface ScreenEventType extends BaseEventType {
  type: EventType.ScreenEvent;
  name: string;
  properties: JsonMap;
}

export interface IdentifyEventType extends BaseEventType {
  type: EventType.IdentifyEvent;
  traits: UserTraits;
}

export interface GroupEventType extends BaseEventType {
  type: EventType.GroupEvent;
  groupId: string;
  traits: GroupTraits;
}

export interface AliasEventType extends BaseEventType {
  type: EventType.AliasEvent;
  userId?: string;
  previousId: string;
}

export type UserTraits = JsonMap & {
  address?: {
    city?: string;
    country?: string;
    postalCode?: string;
    state?: string;
    street?: string;
  };
  age?: number;
  avatar?: string;
  birthday?: string;
  company?: {
    name?: string;
    id?: string | number;
    industry?: string;
    employee_count?: number;
    plan?: string;
  };
  createdAt?: string;
  description?: string;
  email?: string;
  firstName?: string;
  gender?: string;
  id?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  title?: string;
  username?: string;
  website?: string;
};

export type GroupTraits = JsonMap & {
  address?: {
    city?: string;
    country?: string;
    postalCode?: string;
    state?: string;
    street?: string;
  };
  avatar?: string;
  createdAt?: string;
  description?: string;
  email?: string;
  employees?: string;
  id?: string;
  industry?: string;
  name?: string;
  phone?: string;
  website?: string;
  plan?: string;
};

export type Config = {
  writeKey: string;
  debug?: boolean;
  flushAt?: number;
  flushInterval?: number;
  trackAppLifecycleEvents?: boolean;
  maxBatchSize?: number;
  trackDeepLinks?: boolean;
  defaultSettings?: SegmentAPISettings;
  autoAddSegmentDestination?: boolean;
  collectDeviceId?: boolean;
  storePersistor?: Persistor;
};

export type ClientMethods = {
  screen: (name: string, properties?: JsonMap) => void;
  track: (event: string, properties?: JsonMap) => void;
  identify: (userId?: string, userTraits?: UserTraits) => void;
  flush: () => Promise<void>;
  group: (groupId: string, groupTraits?: GroupTraits) => void;
  alias: (newUserId: string) => void;
  reset: (resetAnonymousId?: boolean) => void;
};

type ContextApp = {
  build: string;
  name: string;
  namespace: string;
  version: string;
};

export type ContextDevice = {
  id?: string;
  manufacturer: string;
  model: string;
  name: string;
  type: string;

  adTrackingEnabled?: boolean; // ios only
  advertisingId?: string; // ios only
  trackingStatus?: string;
  token?: string;
};

type ContextLibrary = {
  name: string;
  version: string;
};

type ContextNetwork = {
  cellular: boolean;
  wifi: boolean;
};

type ContextOS = {
  name: string;
  version: string;
};

type ContextScreen = {
  height: number;
  width: number;
  density?: number; // android only
};

export type Context = {
  app: ContextApp;
  device: ContextDevice;
  library: ContextLibrary;
  locale: string;
  network: ContextNetwork;
  os: ContextOS;
  screen: ContextScreen;
  timezone: string;
  traits: UserTraits;
};

/**
 * Makes all the properties in an object optional
 */
export type DeepPartial<T> = {
  [Property in keyof T]?: Property extends {}
    ? DeepPartial<T[Property]>
    : T[Property];
};

export type PartialContext = DeepPartial<Context>;

export type NativeContextInfo = {
  appName: string;
  appVersion: string;
  buildNumber: string;
  bundleId: string;
  locale: string;
  networkType: string;
  osName: string;
  osVersion: string;
  screenHeight: number;
  screenWidth: number;
  screenDensity?: number; // android only
  timezone: string;
  manufacturer: string;
  model: string;
  deviceName: string;
  deviceId?: string;
  deviceType: string;
  adTrackingEnabled?: boolean; // ios only
  advertisingId?: string; // ios only
};

export type SegmentAPIIntegration = {
  apiKey: string;
  apiHost: string;
};

type SegmentAmplitudeIntegration = {
  session_id: number;
};

export type SegmentAdjustSettings = {
  appToken: string;
  setEnvironmentProduction?: boolean;
  setEventBufferingEnabled?: boolean;
  trackAttributionData?: boolean;
  setDelay?: boolean;
  customEvents?: { [key: string]: string };
  delayTime?: number;
};

export type IntegrationSettings =
  // Strongly typed known integration settings
  | SegmentAPIIntegration
  | SegmentAmplitudeIntegration
  | SegmentAdjustSettings
  // Support any kind of configuration in the future
  | Record<string, any>
  // enable/disable the integration at cloud level
  | boolean;

export type SegmentAPIIntegrations = {
  [key: string]: IntegrationSettings;
};

export type SegmentAPISettings = {
  integrations: SegmentAPIIntegrations;
};

export type DestinationMetadata = {
  bundled: string[];
  unbundled: string[];
  bundledIds: string[];
};

export enum PluginType {
  // Executed before event processing begins.
  'before' = 'before',
  // Executed as the first level of event processing.
  'enrichment' = 'enrichment',
  // Executed as events begin to pass off to destinations.
  'destination' = 'destination',
  // Executed after all event processing is completed.  This can be used to perform cleanup operations, etc.
  'after' = 'after',
  // Executed only when called manually, such as Logging.
  'utility' = 'utility',
}

export enum UpdateType {
  'initial' = 'initial',
  'refresh' = 'refresh',
}

export enum EventType {
  'TrackEvent' = 'track',
  'IdentifyEvent' = 'identify',
  'ScreenEvent' = 'screen',
  'GroupEvent' = 'group',
  'AliasEvent' = 'alias',
}

export type UserInfoState = {
  anonymousId: string;
  userId?: string;
  traits?: UserTraits;
};
