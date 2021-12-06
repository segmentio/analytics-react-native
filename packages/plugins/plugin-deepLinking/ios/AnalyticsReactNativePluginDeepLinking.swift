import Foundation


@objc(AnalyticsReactNativePluginDeepLinking) 
public class AnalyticsReactNativePluginDeepLinking: NSObject {
//    public static var emitter: RCTEventEmitter!
//
//    override init() {
//        super.init()
//        AnalyticsReactNativePluginDeepLinking.emitter = self
//    }
    

    static var referring_application: String?
    static var url: String?

    @objc public static func setReferrer(referringApplication: String, url: String) -> Bool {
        AnalyticsReactNativePluginDeepLinking.referring_application = referringApplication
        AnalyticsReactNativePluginDeepLinking.url = url
        return true
    }
    
//    open override func supportedEvents() -> [String] {
//        ["onDeepLinkOpen"]
//      }
   
}
