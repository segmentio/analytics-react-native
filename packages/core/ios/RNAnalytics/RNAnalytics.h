//
//  RNAnalytics.h
//  RNAnalytics
//
//  Created by fathy on 05/08/2018.
//  Copyright © 2020 Segment.io, Inc. All rights reserved.
//

#if __has_include("RCTBridgeModule.h")
#import "RCTBridgeModule.h"
#else
#import <React/RCTBridgeModule.h>
#endif

@interface RNAnalytics: NSObject<RCTBridgeModule>

+(void)addIntegration:(id)factory;

@end
