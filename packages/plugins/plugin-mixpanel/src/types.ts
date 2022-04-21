export type SegmentMixpanelSettings = {
  enableEuropeanEndpoint?: boolean;
  token: string;
  consolidatedPageCalls?: boolean;
  trackAllPages?: boolean;
  trackNamedPages?: boolean;
  trackCategorizedPages?: boolean;
  people?: boolean;
  setAllTraitsByDefault?: boolean;
  superProperties?: string[];
  peopleProperties?: string[];
  groupIdentifierTraits?: string[];
  eventIncrements?: string[];
  propIncrements?: string[];
};
