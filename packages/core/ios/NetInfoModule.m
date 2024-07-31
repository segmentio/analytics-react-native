// NetInfoModule.m
#import "NetInfoModule.h"
#import <SystemConfiguration/SystemConfiguration.h>
#import <netinet/in.h>

@implementation NetInfoModule {
    SCNetworkReachabilityRef reachability;
}

RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
    return @[@"networkStatusChanged"];
}

- (instancetype)init {
    self = [super init];
    if (self) {
        struct sockaddr_in address;
        memset(&address, 0, sizeof(address));
        address.sin_len = sizeof(address);
        address.sin_family = AF_INET;

        reachability = SCNetworkReachabilityCreateWithAddress(kCFAllocatorDefault, (const struct sockaddr*)&address);

        SCNetworkReachabilityContext context = {0, (__bridge void *)(self), NULL, NULL, NULL};
        SCNetworkReachabilitySetCallback(reachability, ReachabilityCallback, &context);
        SCNetworkReachabilityScheduleWithRunLoop(reachability, CFRunLoopGetCurrent(), kCFRunLoopDefaultMode);
    }
    return self;
}

static void ReachabilityCallback(SCNetworkReachabilityRef target, SCNetworkReachabilityFlags flags, void* info) {
    NetInfoModule *self = (__bridge NetInfoModule *)info;
    [self sendNetworkChangeEvent:flags];
}

- (void)sendNetworkChangeEvent:(SCNetworkReachabilityFlags)flags {
    BOOL isConnected = (flags & kSCNetworkReachabilityFlagsReachable) &&
                       !(flags & kSCNetworkReachabilityFlagsConnectionRequired);

    // Use NSNumber to box the BOOL value
    [self sendEventWithName:@"networkStatusChanged" body:@{@"isConnected": @(isConnected)}];
}

RCT_EXPORT_METHOD(startNetworkListening) {
    // Re-schedule reachability callback to ensure it's active
    SCNetworkReachabilityScheduleWithRunLoop(reachability, CFRunLoopGetCurrent(), kCFRunLoopDefaultMode);
}

RCT_EXPORT_METHOD(stopNetworkListening) {
    // Unschedule reachability callback
    SCNetworkReachabilityUnscheduleFromRunLoop(reachability, CFRunLoopGetCurrent(), kCFRunLoopDefaultMode);
}

RCT_EXPORT_METHOD(isNetworkConnected:(RCTPromiseResolveBlock)resolve
                          rejecter:(RCTPromiseRejectBlock)reject) {
    SCNetworkReachabilityFlags flags;
    if (SCNetworkReachabilityGetFlags(reachability, &flags)) {
        BOOL isConnected = (flags & kSCNetworkReachabilityFlagsReachable) &&
                           !(flags & kSCNetworkReachabilityFlagsConnectionRequired);
        resolve(@(isConnected));
    } else {
        reject(@"no_network", @"Unable to fetch network status", nil);
    }
}

- (void)dealloc {
    if (reachability) {
        CFRelease(reachability);
    }
}

@end
