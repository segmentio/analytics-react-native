//
//  main.m
//  RNAnalyticsIntegration
//
//  Created by fathy on 05/08/2018.
//  Copyright © 2018 Segment.io, Inc. All rights reserved.
//

#import <React/RCTBridgeModule.h>
#import <RNAnalytics/RNAnalytics.h>
#import {{{factory_header}}}

@interface {{{integration_class_name}}}: NSObject<RCTBridgeModule>
@end

@implementation {{{integration_class_name}}}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(setup) {
    [RNAnalytics addIntegration:{{{factory_class_name}}}.instance];
}

@end
