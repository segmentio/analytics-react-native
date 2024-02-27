import CoreTelephony
import SystemConfiguration
import UIKit

enum EmitterEvent: String, CaseIterable {
    case setAnonymousId = "SET_ANONYMOUS_ID"
    case setDeeplink = "SET_DEEPLINK"
    
    var event: String {
        switch self {
        case .setAnonymousId:
            "add-anonymous-id"
        case .setDeeplink:
            "add-deepLink-data"
        }
    }
}

enum ConnectionType: String {
    case wifi = "wifi"
    case cellular = "cellular"
    case unknown = "unknown"
}

struct Action {
    var event: EmitterEvent
    var payload: Any!
}

@objc(AnalyticsReactNative)
public class AnalyticsReactNative: RCTEventEmitter {
    
    @objc public static var emitter: RCTEventEmitter?
    
    @objc
    override public static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc
    override init() {
        super.init()
        AnalyticsReactNative.emitter = self
    }
    
    func getAppName() -> String {
        guard let displayName = Bundle.main.infoDictionary!["CFBundleDisplayName"] else {
            return Bundle.main.infoDictionary!["CFBundleName"] as! String
        }
        return displayName as! String
    }
    
    func getDeviceModel() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machineMirror = Mirror(reflecting: systemInfo.machine)
        return machineMirror.children.reduce("") { identifier, element in
            guard let value = element.value as? Int8, value != 0 else { return identifier }
            return identifier + String(UnicodeScalar(UInt8(value)))
        }
    }
    
    func getDeviceId() -> String {
        guard let deviceId = UIDevice.current.identifierForVendor else {
            return "UNKNOWN_ID"
        }
        return deviceId.uuidString
    }
    
    func getNetworkType() -> ConnectionType {
        guard let reachability = SCNetworkReachabilityCreateWithName(kCFAllocatorDefault, "google.com") else {
            return ConnectionType.unknown
        }
        
        var flags = SCNetworkReachabilityFlags()
        SCNetworkReachabilityGetFlags(reachability, &flags)
        
        let isReachable = flags.contains(.reachable)
        let isWWAN = flags.contains(.isWWAN)
        
        if isReachable {
            if isWWAN {
                let networkInfo = CTTelephonyNetworkInfo()
                
                if #available(iOS 12.1, *) {
                    let carrierType = networkInfo.serviceCurrentRadioAccessTechnology
                    guard let _ = carrierType?.first?.value else {
                        return ConnectionType.unknown
                    }
                    return ConnectionType.cellular
                } else {
                    let carrierType = networkInfo.currentRadioAccessTechnology
                    if (carrierType == nil) {
                        return ConnectionType.unknown
                    }
                    return ConnectionType.cellular
                }
            } else {
                return ConnectionType.wifi
            }
        }
        
        return ConnectionType.unknown
    }
    
    @objc(getContextInfo:resolver:rejecter:)
    func getContextInfo(config: NSDictionary, resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
        let infoDictionary = Bundle.main.infoDictionary!
        
        let appName = getAppName()
        let appVersion = infoDictionary["CFBundleShortVersionString"] as? String ?? ""
        let bundleId = Bundle.main.bundleIdentifier ?? ""
        let buildNumber = infoDictionary["CFBundleVersion"] as? String ?? ""
        
        let connectionType: ConnectionType = getNetworkType()
        var locale = ""
        if let languageCode = NSLocale.current.languageCode,
           let regionCode = NSLocale.current.regionCode {
            locale = "\(languageCode)-\(regionCode)"
        }
        let timezone = TimeZone.current.identifier
        
        let osName = UIDevice.current.systemName
        let osVersion = UIDevice.current.systemVersion
        
        let screenWidth = Int(UIScreen.main.bounds.size.width)
        let screenHeight = Int(UIScreen.main.bounds.size.height)
        
        let context: [String: Any] = [
            "appName": appName,
            "appVersion": appVersion,
            "buildNumber": buildNumber,
            "bundleId": bundleId,
            
            "deviceId": getDeviceId(),
            "deviceName": UIDevice.current.model,
            "deviceType": "ios",
            "manufacturer": "Apple",
            "model": getDeviceModel(),
            
            "locale": locale,
            "networkType": "\(connectionType)",
            "timezone": timezone,
            
            "osName": osName,
            "osVersion": osVersion,
            
            "screenWidth": screenWidth,
            "screenHeight": screenHeight
        ]
        resolve(context)
    }
    
    @objc(trackDeepLink:withOptions:)
    public static func trackDeepLink(url: NSURL, options: Dictionary<UIApplication.OpenURLOptionsKey, Any>) -> Void {
        let urlString = url.absoluteString
        let referringApp = options[.sourceApplication] as? String ?? ""
        AnalyticsReactNative.dispatch(event: EmitterEvent.setDeeplink, payload: [ "referring_application": referringApp, "url":urlString])
    }
    
    @objc(setAnonymousId:)
    public static func setAnonymousId(anonymousId: String) -> Void {
        AnalyticsReactNative.dispatch(event: EmitterEvent.setAnonymousId, payload: ["anonymousId": anonymousId])
    }
}

/// Emitter
extension AnalyticsReactNative {

    /// Tracks when the module has finished initializing and is ready to listen to events
    private static var isInitialized = false
    private static var queue: [Action] = []
    
    @objc public override func startObserving() -> Void {
        // Replay event queue
        AnalyticsReactNative.isInitialized = true
        /// Send all events in queue
        for event in AnalyticsReactNative.queue {
            AnalyticsReactNative.emit(event)
        }
        AnalyticsReactNative.queue = []
    }
    
    @objc public override func stopObserving() -> Void {
        AnalyticsReactNative.isInitialized = false
    }
    
    static func dispatch(event: EmitterEvent, payload: Any!) -> Void {
        let actionObj = Action(event: event, payload: payload)
        if isInitialized {
            AnalyticsReactNative.emit(actionObj)
        } else {
            AnalyticsReactNative.queue.append(actionObj)
        }
    }
    
    private static func emit(_ action: Action) -> Void {
        if let emitter = AnalyticsReactNative.emitter {
            emitter.sendEvent(withName: action.event.event, body: action.payload)
        }
    }

    @objc public override func constantsToExport() -> [AnyHashable : Any]! {
        var events: [String: String] = [:]
        // The mapping is from constants key to event name
        for event in EmitterEvent.allCases {
            events[event.rawValue] = event.event
        }
        return events
    }

    @objc open override func supportedEvents() -> [String] {
        EmitterEvent.allCases.map { $0.event }
    }
}
