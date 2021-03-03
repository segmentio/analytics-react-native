//
//  main.m
//  RNAnalyticsIntegration
//
//  Created by fathy on 05/08/2018.
//  Copyright © 2018 Segment.io, Inc. All rights reserved.
//

#import <React/RCTBridgeModule.h>
#import <RNAnalytics/RNAnalytics.h>
#if defined(__has_include) && __has_include(<segment-appsflyer-ios/SEGAppsFlyerIntegrationFactory.h>)
#import <segment-appsflyer-ios/SEGAppsFlyerIntegrationFactory.h>
#elif defined(__has_include) && __has_include(<segment_appsflyer_ios/SEGAppsFlyerIntegrationFactory.h>)
#import <segment_appsflyer_ios/SEGAppsFlyerIntegrationFactory.h>
#else
#import <segment-appsflyer-ios/SEGAppsFlyerIntegrationFactory.h>
#endif

@interface RNAnalyticsIntegration_AppsFlyer: NSObject<RCTBridgeModule>
@end

@implementation RNAnalyticsIntegration_AppsFlyer

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(setup) {
    [RNAnalytics addIntegration:SEGAppsFlyerIntegrationFactory.instance];
}

@end
