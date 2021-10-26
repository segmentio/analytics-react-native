#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AnalyticsReactNative, NSObject)

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getUUIDSync) {
    return [[NSUUID UUID] UUIDString];
}

RCT_EXTERN_METHOD(getContextInfo: (NSDictionary)configuration resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
