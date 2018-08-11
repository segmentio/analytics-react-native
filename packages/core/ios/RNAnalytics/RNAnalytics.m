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
    config.shouldUseBluetooth = [options[@"ios"][@"recordBluetooth"] boolValue];
    config.enableAdvertisingTracking = [options[@"ios"][@"trackAdvertising"] boolValue];
    
    for(id factory in RNAnalyticsIntegrations) {
        [config use:factory];
    }
    
    [SEGAnalytics debug:[options[@"debug"] boolValue]];
    [SEGAnalytics setupWithConfiguration:config];
}

RCT_EXPORT_METHOD(track:(NSString*)name :(NSDictionary*)properties) {
    [SEGAnalytics.sharedAnalytics track:name properties:properties];
}

RCT_EXPORT_METHOD(screen:(NSString*)name :(NSDictionary*)properties) {
    [SEGAnalytics.sharedAnalytics screen:name properties:properties];
}

RCT_EXPORT_METHOD(identify:(NSString*)userId :(NSDictionary*)traits) {
    [SEGAnalytics.sharedAnalytics identify:userId traits:traits];
}

RCT_EXPORT_METHOD(group:(NSString*)groupId :(NSDictionary*)traits) {
    [SEGAnalytics.sharedAnalytics group:groupId traits:traits];
}

RCT_EXPORT_METHOD(alias:(NSString*)newId) {
    [SEGAnalytics.sharedAnalytics alias:newId];
}

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
