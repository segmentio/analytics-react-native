//
//  RNAnalytics.m
//  Analytics
//
//  Created by fathy on 06/08/2018.
//

#import "RNAnalytics.h"

#import <Analytics/SEGAnalytics.h>

static NSMutableSet* RNAnalyticsIntegrations = nil;
static NSLock* RNAnalyticsIntegrationsLock = nil;

@implementation RNAnalytics

+(void)addIntegration:(id)factory {
    [RNAnalyticsIntegrationsLock lock];
    [RNAnalyticsIntegrations addObject:factory];
    [RNAnalyticsIntegrationsLock unlock];
}

+(void)initialize {
    [super initialize];
    
    RNAnalyticsIntegrations = [NSMutableSet new];
    RNAnalyticsIntegrationsLock = [NSLock new];
}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(setup:(NSDictionary*)options) {
    SEGAnalyticsConfiguration* config = [SEGAnalyticsConfiguration configurationWithWriteKey:options[@"ios"][@"writeKey"]];

    config.recordScreenViews = [options[@"recordScreenViews"] boolValue];
    config.trackApplicationLifecycleEvents = [options[@"trackAppLifecycleEvents"] boolValue];
    config.trackAttributionData = [options[@"trackAttributionData"] boolValue];
    config.flushAt = [options[@"flushAt"] integerValue];
    config.enableAdvertisingTracking = [options[@"ios"][@"trackAdvertising"] boolValue];
    
    for(id factory in RNAnalyticsIntegrations) {
        [config use:factory];
    }
    
    [SEGAnalytics debug:[options[@"debug"] boolValue]];
    [SEGAnalytics setupWithConfiguration:config];
}

#define withContext(context) @{@"context": context}

RCT_EXPORT_METHOD(track:(NSString*)name :(NSDictionary*)properties :(NSDictionary*)context) {
    [SEGAnalytics.sharedAnalytics track:name
                             properties:properties
                                options:withContext(context)];
}

RCT_EXPORT_METHOD(screen:(NSString*)name :(NSDictionary*)properties :(NSDictionary*)context) {
    [SEGAnalytics.sharedAnalytics screen:name
                              properties:properties
                                 options:withContext(context)];
}

RCT_EXPORT_METHOD(identify:(NSString*)userId :(NSDictionary*)traits :(NSDictionary*)context) {
    [SEGAnalytics.sharedAnalytics identify:userId
                                    traits:traits
                                   options:withContext(context)];
}

RCT_EXPORT_METHOD(group:(NSString*)groupId :(NSDictionary*)traits :(NSDictionary*)context) {
    [SEGAnalytics.sharedAnalytics group:groupId
                                 traits:traits
                                options:withContext(context)];
}

RCT_EXPORT_METHOD(alias:(NSString*)newId :(NSDictionary*)context) {
    [SEGAnalytics.sharedAnalytics alias:newId
                                options:withContext(context)];
}

#undef withContext

RCT_EXPORT_METHOD(reset) {
    [SEGAnalytics.sharedAnalytics reset];
}

RCT_EXPORT_METHOD(flush) {
    [SEGAnalytics.sharedAnalytics flush];
}

RCT_EXPORT_METHOD(enable) {
    [SEGAnalytics.sharedAnalytics enable];
}

RCT_EXPORT_METHOD(disable) {
    [SEGAnalytics.sharedAnalytics disable];
}

@end
