import React

struct Action {
    var action: String
    var payload: Any!
}

@objc(Sovran)
public class Sovran: RCTEventEmitter {

    @objc public static var emitter: RCTEventEmitter?
    
    private static var isInitialized = false
    
    private static var queue: [Action] = []

    private static let onStoreActionEvent = "onStoreAction"

    @objc override init() {
        super.init()
        Sovran.emitter = self
    }
    
    @objc public override func constantsToExport() -> [AnyHashable : Any]! {
        return ["ON_STORE_ACTION": Sovran.onStoreActionEvent]
    }

    override public static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc open override func supportedEvents() -> [String] {
        [Sovran.onStoreActionEvent]
    }
    
    private static func sendStoreAction(_ action: Action) -> Void {
        if let emitter = self.emitter {
            emitter.sendEvent(withName: onStoreActionEvent, body: [
                "type": action.action,
                "payload": action.payload
            ])
        }
    }

    @objc public static func dispatch(action: String, payload: Any!) -> Void {
        let actionObj = Action(action: action, payload: payload)
        if isInitialized {
            self.sendStoreAction(actionObj)
        } else {
            self.queue.append(actionObj)
        }
    }
    
    @objc public override func startObserving() -> Void {
        // Replay event queue
        Sovran.isInitialized = true
        for event in Sovran.queue {
            Sovran.sendStoreAction(event)
        }
        Sovran.queue = []
    }
    
    @objc public override func stopObserving() -> Void {
        Sovran.isInitialized = false
    }
}

