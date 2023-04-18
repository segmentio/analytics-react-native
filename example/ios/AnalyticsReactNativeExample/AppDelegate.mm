#import "AppDelegate.h"
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTAppSetupUtils.h>
#import <segment_analytics_react_native-Swift.h>
//  #import <Firebase.h>

// #import <CleverTap-iOS-SDK/CleverTap.h>
// #import <clevertap-react-native/CleverTapReactManager.h>

//#import "BrazeReactUtils.h"
//#import "BrazeReactBridge.h"
//#import <BrazeKit/BrazeKit-Swift.h>

#if RCT_NEW_ARCH_ENABLED
#import <React/CoreModulesPlugins.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTFabricSurfaceHostingProxyRootView.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <react/config/ReactNativeConfig.h>
#import "RNBootSplash.h"
static NSString *const kRNConcurrentRoot = @"concurrentRoot";
@interface AppDelegate () <RCTCxxBridgeDelegate, RCTTurboModuleManagerDelegate> {
  RCTTurboModuleManager *_turboModuleManager;
  RCTSurfacePresenterBridgeAdapter *_bridgeAdapter;
  std::shared_ptr<const facebook::react::ReactNativeConfig> _reactNativeConfig;
  facebook::react::ContextContainer::Shared _contextContainer;
}
@end
#endif


@implementation AppDelegate

//enable for Braze Plugin
//static NSString *const apiKey = @"<YOUR API KEY>";
//static NSString *const endpoint = @"<YOUR ENDPOINT>";


- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  
// enable for Braze Plugin
//  id<RCTBridgeDelegate> moduleInitializer = [[BrazeReactBridge alloc] init];
  RCTAppSetupPrepareApp(application);
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  
  
#if RCT_NEW_ARCH_ENABLED
  _contextContainer = std::make_shared<facebook::react::ContextContainer const>();
  _reactNativeConfig = std::make_shared<facebook::react::EmptyReactNativeConfig const>();
  _contextContainer->insert("ReactNativeConfig", _reactNativeConfig);
  _bridgeAdapter = [[RCTSurfacePresenterBridgeAdapter alloc] initWithBridge:bridge contextContainer:_contextContainer];
  bridge.surfacePresenter = _bridgeAdapter.surfacePresenter;
#endif
  
  NSDictionary *initProps = [self prepareInitialProps];
  UIView *rootView = RCTAppSetupDefaultRootView(bridge, @"AnalyticsReactNativeExample", initProps);
  if (@available(iOS 13.0, *)) {
    rootView.backgroundColor = [UIColor systemBackgroundColor];
  } else {
    rootView.backgroundColor = [UIColor whiteColor];
  }

  
  
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  // enable for firebase plugin
  // [FIRApp configure];
  
  // integrate CleverTap SDK using the autoIntegrate option
  // [CleverTap autoIntegrate]; 
  // [[CleverTapReactManager sharedInstance] applicationDidLaunchWithOptions:launchOptions];
  
//  enable for braze plugin
//  BRZConfiguration *configuration = [[BRZConfiguration alloc] initWithApiKey:apiKey
//                                                                    endpoint:endpoint];
  // - Enable logging and customize the configuration here
//  configuration.logger.level = BRZLoggerLevelInfo;
//  Braze *braze = [BrazeReactBridge initBraze:configuration];
//  AppDelegate.braze = braze;

  return YES;
}


- (BOOL)application:(UIApplication *)application
            openURL: (NSURL *)url
            options:(nonnull NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
  
//  [AnalyticsReactNative trackDeepLink:url withOptions:options];
  return YES;
}
/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feture is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
  // Switch this bool to turn on and off the concurrent root
  return true;
}
- (NSDictionary *)prepareInitialProps
{
  NSMutableDictionary *initProps = [NSMutableDictionary new];
#ifdef RCT_NEW_ARCH_ENABLED
  initProps[kRNConcurrentRoot] = @([self concurrentRootEnabled]);
#endif
  return initProps;
}
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}
#if RCT_NEW_ARCH_ENABLED
#pragma mark - RCTCxxBridgeDelegate
- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge *)bridge
{
  _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge
                                                             delegate:self
                                                            jsInvoker:bridge.jsCallInvoker];
  return RCTAppSetupDefaultJsExecutorFactory(bridge, _turboModuleManager);
}
#pragma mark RCTTurboModuleManagerDelegate
- (Class)getModuleClassFromName:(const char *)name
{
  return RCTCoreModulesClassProvider(name);
}
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                      jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
  return nullptr;
}
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::string &)name
                                                     initParams:
                                                         (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return nullptr;
}
- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
  return RCTAppSetupDefaultModuleFromClass(moduleClass);
}
#endif

// enable for Braze Plugin

//#pragma mark - AppDelegate.braze
//
//static Braze *_braze = nil;
//
//+ (Braze *)braze {
//  return _braze;
//}
//
//+ (void)setBraze:(Braze *)braze {
//  _braze = braze;
//}

@end
