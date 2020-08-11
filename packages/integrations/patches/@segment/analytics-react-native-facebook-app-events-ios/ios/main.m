//
//  main.m
//  RNAnalyticsIntegration
//
//  Created by fathy on 05/08/2018.
//  Copyright © 2020 Segment.io, Inc. All rights reserved.
//

#import <React/RCTBridgeModule.h>
#import <RNAnalytics/RNAnalytics.h>
#if defined(__has_include) && __has_include(<Segment_FacebookAppEvents/SEGFacebookAppEventsIntegrationFactory.h>)
#import <Segment_FacebookAppEvents/SEGFacebookAppEventsIntegrationFactory.h>
#elif defined(__has_include) && __has_include(<Segment-Facebook-App-Events/SEGFacebookAppEventsIntegrationFactory.h>)
#import <Segment-Facebook-App-Events/SEGFacebookAppEventsIntegrationFactory.h>
#else
#import <Segment-FacebookAppEvents/SEGFacebookAppEventsIntegrationFactory.h>
#endif

@interface RNAnalyticsIntegration_Facebook_App_Events: NSObject<RCTBridgeModule>
@end

@implementation RNAnalyticsIntegration_Facebook_App_Events

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(setup) {
    [RNAnalytics addIntegration:SEGFacebookAppEventsIntegrationFactory.instance];
}

@end
