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
                let idfa = status == .authorized ? ASIdentifierManager.shared().advertisingIdentifier.uuidString : nil
                if let authorizedIDFA = idfa {
                    resolve([
                        "adTrackingEnabled": status == .authorized,
                        "advertisingId": authorizedIDFA,
                        "trackingStatus": self.statusToString(status)
                    ])
                } else {
                    resolve([
                        "adTrackingEnabled": false,
                        "trackingStatus": self.statusToString(status)
                    ])
                }
            }
        } else {
            let adTrackingEnabled: Bool = true
            let trackingStatus: String = "authorized"
            let idfa =  ASIdentifierManager.shared().advertisingIdentifier.uuidString
            
            let context: [String: Any] = [
                "adTrackingEnabled": adTrackingEnabled,
                "advertisingId": idfa,
                "trackingStatus": trackingStatus
            ]
            
            assert(JSONSerialization.isValidJSONObject(context))
            
            resolve(context);
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