import type { CategoryConsentStatusProvider } from '@segment/analytics-react-native';

import {
  Subject,
  map,
  Observable,
  combineLatest,
  tap,
  switchMap,
  takeUntil,
  finalize,
  firstValueFrom,
  shareReplay,
  from,
  merge,
  withLatestFrom,
  scan,
  take,
  concat,
} from 'rxjs';

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
  private onConsentChangeCallback!: OnConsentChangeCb;
  private shutdown$ = new Subject<void>();
  private categories$ = new Subject<string[]>();
  private categoriesStatuses$!: Observable<Record<string, boolean>>;

  constructor(oneTrust: OTPublishersNativeSDK) {
    const initialCategoryStatuses$ = this.categories$.pipe(
      switchMap((categories) => {
        const statuses$: Observable<[string, boolean]>[] = categories.map(
          (id) =>
            from(oneTrust.getConsentStatusForCategory(id)).pipe(
              map((status) => [id, status === ConsentStatus.Granted])
            )
        );

        return combineLatest(statuses$).pipe(
          map((statuses) => Object.fromEntries(statuses))
        );
      }),
      shareReplay(1)
    );

    const dynamicCategoryStatuses$ = this.categories$.pipe(
      tap((categories) => {
        oneTrust.stopListeningForConsentChanges();
        oneTrust.setBroadcastAllowedValues(categories);
      }),
      switchMap((categories) => {
        const statusUpdates$: Observable<[string, boolean]>[] = categories.map(
          (id) =>
            new Observable<[string, boolean]>((subscriber) => {
              oneTrust.listenForConsentChanges(id, (_, status) => {
                subscriber.next([id, status === ConsentStatus.Granted]);
              });
            })
        );

        return merge(...statusUpdates$).pipe(
          scan((acc, [id, updStatus]) => ({ ...acc, [id]: updStatus }), {}),
          withLatestFrom(initialCategoryStatuses$),
          map(([accruedUpdates, initialStatuses]) => ({
            ...initialStatuses,
            ...accruedUpdates,
          }))
        );
      }),
      finalize(() => oneTrust.stopListeningForConsentChanges()),
      shareReplay(1)
    );

    dynamicCategoryStatuses$.pipe(takeUntil(this.shutdown$)).subscribe({
      next: (updConsent) => this.onConsentChangeCallback(updConsent),
    });

    this.categoriesStatuses$ = concat(
      initialCategoryStatuses$.pipe(take(1)),
      dynamicCategoryStatuses$
    ).pipe(shareReplay(1));

    this.categoriesStatuses$.pipe(takeUntil(this.shutdown$)).subscribe();
  }

  getConsentStatus(): Promise<Record<string, boolean>> {
    return firstValueFrom(this.categoriesStatuses$);
  }

  onConsentChange(cb: (updConsent: Record<string, boolean>) => void): void {
    this.onConsentChangeCallback = cb;
  }

  setApplicableCategories(categories: string[]): void {
    this.categories$.next(categories);
  }

  shutdown() {
    this.shutdown$.next();
  }
}
