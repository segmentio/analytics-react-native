//
//  RNAnalytics.m
//  Analytics
//
//  Created by fathy on 06/08/2018.
//

#import "RNAnalytics.h"

#if defined(__has_include) && __has_include(<Analytics/SEGAnalytics.h>)
#import <Analytics/SEGAnalytics.h>
#else
#import <Segment/SEGAnalytics.h>
#endif

#import <React/RCTBridge.h>

static NSMutableSet* RNAnalyticsIntegrations = nil;
static NSLock* RNAnalyticsIntegrationsLock = nil;
static NSString* RNAnalyticsAdvertisingId = nil;
static BOOL RNAnalyaticsUseAdvertisingId = NO;

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

@synthesize bridge = _bridge;

static NSString* singletonJsonConfig = nil;

RCT_EXPORT_METHOD(
     setup:(NSDictionary*)options
          :(RCTPromiseResolveBlock)resolver
          :(RCTPromiseRejectBlock)rejecter
) {
    NSString* json = options[@"json"];

    if(singletonJsonConfig != nil) {
        if([json isEqualToString:singletonJsonConfig]) {
            return resolver(nil);
        }
        else {
            #if DEBUG
                return resolver(self);
            #else
                return rejecter(@"E_SEGMENT_RECONFIGURED", @"Segment Analytics Client was allocated multiple times, please check your environment.", nil);
            #endif
        }
    }

    SEGAnalyticsConfiguration* config = [SEGAnalyticsConfiguration configurationWithWriteKey:options[@"writeKey"]];

    config.recordScreenViews = [options[@"recordScreenViews"] boolValue];
    config.trackApplicationLifecycleEvents = [options[@"trackAppLifecycleEvents"] boolValue];
    config.flushAt = [options[@"flushAt"] integerValue];
    config.enableAdvertisingTracking = RNAnalyaticsUseAdvertisingId = [options[@"ios"][@"trackAdvertising"] boolValue];
    config.defaultSettings = options[@"defaultProjectSettings"];

    // set this block regardless.  the data will come in after the fact most likely.
    config.adSupportBlock = ^NSString * _Nonnull{
        return RNAnalyticsAdvertisingId;
    };

    if ([options valueForKey:@"proxy"]) {
        NSDictionary *proxyOptions = (NSDictionary *)[options valueForKey:@"proxy"];

        config.requestFactory = ^(NSURL *url) {
            NSURLComponents *components = [NSURLComponents componentsWithURL:url resolvingAgainstBaseURL:NO];

            if ([proxyOptions valueForKey:@"scheme"]) {
                components.scheme = proxyOptions[@"scheme"];
            }

            if ([proxyOptions valueForKey:@"host"]) {
                components.host = proxyOptions[@"host"];
            }

            if ([proxyOptions valueForKey:@"port"]) {
                components.port = [NSNumber numberWithInt:[proxyOptions[@"port"] intValue]];
            }

            if ([proxyOptions valueForKey:@"path"]) {
                components.path = [proxyOptions[@"path"] stringByAppendingString:components.path];
            }

            NSURL *transformedURL = components.URL;
            return [NSMutableURLRequest requestWithURL:transformedURL];
        };
    }

    for(id factory in RNAnalyticsIntegrations) {
        [config use:factory];
    }

    [SEGAnalytics debug:[options[@"debug"] boolValue]];

    @try {
        [SEGAnalytics setupWithConfiguration:config];
    }
    @catch(NSError* error) {
        return rejecter(@"E_SEGMENT_ERROR", @"Unexpected native Analtyics error", error);
    }

    // On iOS we use method swizzling to intercept lifecycle events
    // However, React-Native calls our library after applicationDidFinishLaunchingWithOptions: is called
    // We fix this by manually calling this method at setup-time
    // TODO(fathyb): We should probably implement a dedicated API on the native part
    if(config.trackApplicationLifecycleEvents) {
        SEL selector = @selector(_applicationDidFinishLaunchingWithOptions:);

        if ([SEGAnalytics.sharedAnalytics respondsToSelector:selector]) {
            [SEGAnalytics.sharedAnalytics performSelector:selector
                                               withObject:_bridge.launchOptions];
        }
    }

    singletonJsonConfig = json;
    return resolver(nil);
}

- (NSDictionary*)withContextAndIntegrations :(NSDictionary*)context :(NSDictionary*)integrations {
    return @{ @"context": context, @"integrations": integrations ?: @{}};
}

RCT_EXPORT_METHOD(setIDFA:(NSString *)idfa) {
    RNAnalyticsAdvertisingId = idfa;
}


RCT_EXPORT_METHOD(track:(NSString*)name :(NSDictionary*)properties :(NSDictionary*)integrations :(NSDictionary*)context) {
    [SEGAnalytics.sharedAnalytics track:name
                             properties:properties
                                options:[self withContextAndIntegrations :context :integrations]];
}

RCT_EXPORT_METHOD(screen:(NSString*)name :(NSDictionary*)properties :(NSDictionary*)integrations :(NSDictionary*)context) {
    [SEGAnalytics.sharedAnalytics screen:name
                              properties:properties
                                 options:[self withContextAndIntegrations :context :integrations]];
}

RCT_EXPORT_METHOD(identify:(NSString*)userId
                          :(NSDictionary * _Nullable)traits
                          :(NSDictionary *)options
                          :(NSDictionary *)integrations
                          :(NSDictionary *)context) {
    NSMutableDictionary *mergedOptions = [[self withContextAndIntegrations :context :integrations] mutableCopy];
    [mergedOptions addEntriesFromDictionary: options ?: @{}];
    [SEGAnalytics.sharedAnalytics identify: userId
                                    traits: traits
                                   options: mergedOptions];
}

RCT_EXPORT_METHOD(group:(NSString*)groupId :(NSDictionary*)traits :(NSDictionary*)integrations :(NSDictionary*)context) {
    [SEGAnalytics.sharedAnalytics group:groupId
                                 traits:traits
                                options:[self withContextAndIntegrations :context :integrations]];
}

RCT_EXPORT_METHOD(alias:(NSString*)newId :(NSDictionary*)integrations :(NSDictionary*)context) {
    [SEGAnalytics.sharedAnalytics alias:newId
                                options:[self withContextAndIntegrations :context :integrations]];
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

RCT_EXPORT_METHOD(
    getAnonymousId:(RCTPromiseResolveBlock)resolver
                  :(RCTPromiseRejectBlock)rejecter)
{
  NSString *anonymousId = [SEGAnalytics.sharedAnalytics getAnonymousId];
  resolver(anonymousId);
}

@end
