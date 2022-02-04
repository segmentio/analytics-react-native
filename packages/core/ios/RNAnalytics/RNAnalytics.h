//
//  RNAnalytics.h
//  RNAnalytics
//
//  Created by fathy on 05/08/2018.
//  Copyright © 2020 Segment.io, Inc. All rights reserved.
//

#import <React/RCTBridgeModule.h>

@interface RNAnalytics: NSObject<RCTBridgeModule>

+(void)addIntegration:(id)factory;

@end
