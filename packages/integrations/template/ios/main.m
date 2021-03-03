//
//  main.m
//  RNAnalyticsIntegration
//
//  Created by fathy on 05/08/2018.
//  Copyright © 2020 Segment.io, Inc. All rights reserved.
//

#import <React/RCTBridgeModule.h>
#import <RNAnalytics/RNAnalytics.h>
#if defined(__has_include) && __has_include({{{factory_header_alt}}})
#import {{{factory_header_alt}}}
#else
#import {{{factory_header}}}
#endif

@interface {{{integration_class_name}}}: NSObject<RCTBridgeModule>
@end

@implementation {{{integration_class_name}}}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(setup) {
    [RNAnalytics addIntegration:{{{factory_class_name}}}.instance];
}

@end
