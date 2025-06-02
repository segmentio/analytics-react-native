import type { CategoryConsentStatusProvider } from '@segment/analytics-react-native';

enum ConsentStatus {
  Granted = 1,
  Denied = 0,
  Unknown = -1,
}

type OnConsentChangeCb = (v: Record<string, boolean>) => void;

/** Interface derived from https://www.npmjs.com/package/react-native-onetrust-cmp */
export interface OTPublishersNativeSDK {
  getConsentStatusForCategory(categoryId: string): Promise<ConsentStatus>;
  setBroadcastAllowedValues(categoryIds: string[]): void;
  listenForConsentChanges(
    categoryId: string,
    callback: (cid: string, status: ConsentStatus) => void
  ): void;
  stopListeningForConsentChanges(): void;
}

export class OneTrustConsentProvider implements CategoryConsentStatusProvider {
  getConsentStatus!: () => Promise<Record<string, boolean>>;
  private onConsentChangeCallback!: OnConsentChangeCb;

  constructor(private oneTrust: OTPublishersNativeSDK) {
    console.log('[OneTrustConsentProvider] Initialized with OneTrust instance');
  }

  onConsentChange(cb: (updConsent: Record<string, boolean>) => void): void {
    console.log('[onConsentChange] Callback registered');
    this.onConsentChangeCallback = cb;
  }

  setApplicableCategories(categories: string[]): void {
    console.log('[setApplicableCategories] Called with categories:', categories);
    
    const initialStatusesP = Promise.all(
      categories.map((categoryId) => {
        console.log(`[getConsentStatusForCategory] Fetching for categoryId: ${categoryId}`);
        return this.oneTrust
          .getConsentStatusForCategory(categoryId)
          .then<[string, boolean]>((status) => {
            const granted = status === ConsentStatus.Granted;
            console.log(`[getConsentStatusForCategory] Status for ${categoryId}:`, status, `(granted: ${granted})`);
            return [categoryId, granted];
          });
      })
    ).then((entries) => {
      const entriesObj = Object.fromEntries(entries);
      console.log('[initialStatusesP] Consent entries:', entriesObj);
      return entriesObj;
    });

    let latestStatuses: Record<string, boolean> | null;

    this.getConsentStatus = () => {
      const toReturn = latestStatuses ?? initialStatusesP;
      console.log('[getConsentStatus] Returning:', toReturn);
      return Promise.resolve(toReturn);
    };

    console.log('[setApplicableCategories] Stopping any existing listeners');
    this.oneTrust.stopListeningForConsentChanges();

    console.log('[setApplicableCategories] Setting allowed values for categories');
    this.oneTrust.setBroadcastAllowedValues(categories);

    categories.forEach((categoryId) => {
      console.log(`[setApplicableCategories] Listening for consent changes for ${categoryId}`);
      this.oneTrust.listenForConsentChanges(categoryId, (_, status) => {
        console.log(`[listenForConsentChanges] Detected change for ${categoryId}:`, status);
        initialStatusesP
          .then((initialStatuses) => {
            latestStatuses = {
              ...initialStatuses,
              ...latestStatuses,
              [categoryId]: status === ConsentStatus.Granted,
            };
            console.log('[Consent Change] Updated latestStatuses:', latestStatuses);
            this.onConsentChangeCallback(latestStatuses);
          })
          .catch((e) => {
            console.error('[Consent Change Error]', e);
            throw e;
          });
      });
    });
  }

  shutdown() {
    console.log('[shutdown] Stopping all consent listeners');
    this.oneTrust.stopListeningForConsentChanges();
  }
}
