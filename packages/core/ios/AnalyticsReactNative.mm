#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(AnalyticsReactNative, RCTEventEmitter)

RCT_EXTERN_METHOD(getContextInfo: (NSDictionary)configuration resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(supportedEvents)

@end

