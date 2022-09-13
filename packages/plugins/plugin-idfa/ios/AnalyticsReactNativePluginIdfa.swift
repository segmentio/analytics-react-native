import AdSupport
import AppTrackingTransparency

@objc(AnalyticsReactNativePluginIdfa)
class AnalyticsReactNativePluginIdfa: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
       return true
     }

    @objc
    func getTrackingAuthorizationStatus(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        if #available(iOS 14, *) {
            ATTrackingManager.requestTrackingAuthorization { status in
                let idfa = status == .authorized ? ASIdentifierManager.shared().advertisingIdentifier.uuidString : self.fallbackValue
                resolve([
                    "adTrackingEnabled": status == .authorized,
                    "advertisingId": idfa!,
                    "trackingStatus": self.statusToString(status)
                ])
            }
        } else {
            let adTrackingEnabled: Bool = true
            let trackingStatus: String = "authorized"
            let idfa = adTrackingEnabled ? ASIdentifierManager.shared().advertisingIdentifier.uuidString : fallbackValue
            
            let context: [String: Any] = [
                "adTrackingEnabled": adTrackingEnabled,
                "advertisingId": idfa!,
                "trackingStatus": trackingStatus
            ]
            
            assert(JSONSerialization.isValidJSONObject(context))
            
            resolve(context);
        }
    }
    
    var fallbackValue: String? {
        get {
            // fallback to the IDFV value.
            // this is also sent in event.context.device.id,
            // feel free to use a value that is more useful to you.
            return UIDevice.current.identifierForVendor?.uuidString
        }
    }
    
    @available(iOS 14, *)
    func statusToString(_ status: ATTrackingManager.AuthorizationStatus) -> String {
        var result = "unknown"
        switch status {
        case .notDetermined:
            result = "notDetermined"
        case .restricted:
            result = "restricted"
        case .denied:
            result = "denied"
        case .authorized:
            result = "authorized"
        @unknown default:
            break
        }
        return result
    }
}
