import Foundation

//@objc(AnalyticsReactNativePluginDeepLinking)
//class AnalyticsReactNativePluginDeepLinking: NSObject {
//
//    @objc(multiply:withB:withResolver:withRejecter:)
//    func multiply(a: Float, b: Float, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
//        resolve(a*b)
//    }
//}


@objc(AnalyticsReactNativePluginDeepLinking)
class AnalyticsReactNativePluginDeepLinking: RCTEventEmitter {
    
    override init() {
        super.init()
        EventEmitter.sharedInstance.registerEventEmitter(eventEmitter: self)
    }
    

    var referring_application = "";
    var url = "";

@objc(setReferrer:url:)
func setReferrer(referring_application: String, url: String){
    self.referring_application = referring_application;
    self.url = url;
}
   
}
