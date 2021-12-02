//
//  EventEmitter.swift
//  AnalyticsReactNativePluginDeepLinking
//
//  Created by Alan Charles on 12/1/21.
//  Copyright © 2021 Facebook. All rights reserved.
//

import Foundation

class EventEmitter

    /// Shared Instance.
    public static var sharedInstance = EventEmitter()

    // ReactNativeEventEmitter is instantiated by React Native with the bridge.
    private static var eventEmitter: ReactNativeEventEmitter!

    private init() {}

    // When React Native instantiates the emitter it is registered here.
    func registerEventEmitter(eventEmitter: ReactNativeEventEmitter) {
        EventEmitter.eventEmitter = eventEmitter
    }

    func dispatch(name: String, body: Any?) {
        eventEmitter.sendEvent(withName: name, body: body)
    }

    /// All Events which must be support by React Native.
    lazy var allEvents: [String] = {
        var allEventNames: [String] = []

        // Append all events here
        
        return allEventNames
    }()

}
