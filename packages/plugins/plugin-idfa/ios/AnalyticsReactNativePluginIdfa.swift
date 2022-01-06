import AdSupport
import AppTrackingTransparency

@objc(AnalyticsReactNativePluginIdfa)
class AnalyticsReactNativePluginIdfa: RCTEventEmitter {
    
    @objc
    override static func requiresMainQueueSetup() -> Bool {
       return true
     }
    
    @available(iOS 14, *)

    @objc
    func getTrackingAuthorizationStatus(
        _ resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) -> Void {
        let status = ATTrackingManager.trackingAuthorizationStatus
        if status == .notDetermined {
            // we don't know, so should ask the user.
            askForPermission()
        }
        
        let trackingStatus = statusToString(status)
        var idfa = fallbackValue
        var adTrackingEnabled = false
        
        if status == .authorized {
            adTrackingEnabled = true
            idfa = ASIdentifierManager.shared().advertisingIdentifier.uuidString
        }
        
        let context: [String: Any] = [
            "adTrackingEnabled": adTrackingEnabled,
            "advertisingId": idfa!,
            "trackingStatus": trackingStatus
        ]
        
        _ = JSONSerialization.isValidJSONObject(context)
        
        resolve(context);
    }
}

extension AnalyticsReactNativePluginIdfa {
    
    // we need to override this method and
    // return an array of event names that we can listen to
    override func supportedEvents() -> [String]! {
        return ["IDFAQuery"]
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
    
    @available(iOS 14, *)
    func askForPermission() {
        ATTrackingManager.requestTrackingAuthorization { status in
            // send a track event that shows the results of asking the user for permission.
            self.sendEvent(withName: "IDFAQuery", body: ["result": self.statusToString(status)])
        }
    }
}
