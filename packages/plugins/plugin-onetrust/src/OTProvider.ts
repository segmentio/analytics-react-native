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

export class OTCategoryConsentProvider
  implements CategoryConsentStatusProvider
{
  getConsentStatus!: () => Promise<Record<string, boolean>>;
  private onConsentChangeCallback!: OnConsentChangeCb;

  constructor(private oneTrust: OTPublishersNativeSDK) {}

  onConsentChange(cb: (updConsent: Record<string, boolean>) => void): void {
    this.onConsentChangeCallback = cb;
  }

  setApplicableCategories(categories: string[]): void {
    const initialStatusesP = Promise.all(
      categories.map((categoryId) =>
        this.oneTrust
          .getConsentStatusForCategory(categoryId)
          .then<[string, boolean]>((status) => [
            categoryId,
            status === ConsentStatus.Granted,
          ])
      )
    ).then((entries) => Object.fromEntries(entries));

    let latestStatuses: Record<string, boolean> | null;

    this.getConsentStatus = () =>
      Promise.resolve(latestStatuses ?? initialStatusesP);

    this.oneTrust.stopListeningForConsentChanges();
    this.oneTrust.setBroadcastAllowedValues(categories);

    categories.forEach((categoryId) => {
      this.oneTrust.listenForConsentChanges(categoryId, (_, status) => {
        initialStatusesP
          .then((initialStatuses) => {
            latestStatuses = {
              ...initialStatuses,
              ...latestStatuses,
              [categoryId]: status === ConsentStatus.Granted,
            };

            this.onConsentChangeCallback(latestStatuses);
          })
          .catch((e) => {
            throw e;
          });
      });
    });
  }

  shutdown() {
    this.oneTrust.stopListeningForConsentChanges();
  }
}
