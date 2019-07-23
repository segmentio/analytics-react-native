/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 Segment, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

package com.segment.analytics.reactnative.core

import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import com.facebook.react.bridge.*
import com.segment.analytics.Analytics
import com.segment.analytics.Properties
import com.segment.analytics.Options
import com.segment.analytics.Traits
import com.segment.analytics.ValueMap
import com.segment.analytics.internal.Utils.getSegmentSharedPreferences
import java.util.concurrent.TimeUnit
import com.facebook.react.bridge.ReadableMap



class RNAnalyticsModule(context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
    override fun getName() = "RNAnalytics"

    private val analytics
        get() = Analytics.with(reactApplicationContext)

    companion object {
        private var singletonJsonConfig: String? = null
        private var versionKey = "version"
        private var buildKey = "build"
    }

    private fun getPackageInfo(): PackageInfo {
        val packageManager = reactApplicationContext.packageManager
        try {
            return packageManager.getPackageInfo(reactApplicationContext.packageName, 0)
        } catch (e: PackageManager.NameNotFoundException) {
            throw AssertionError("Package not found: " + reactApplicationContext.packageName)
        }
    }

    /**
     * Builds Options with integrations
     * The format for the integrations variable is { String: Boolean | Map }
     */
    private fun getOptions(integrations: ReadableMap?): Options {
        var options = Options()

        if (integrations !== null) {
            val iterator = integrations.keySetIterator()
            while (iterator.hasNextKey()) {
                val nextKey = iterator.nextKey()
                when (integrations.getType(nextKey)) {
                    ReadableType.Boolean -> options.setIntegration(nextKey, integrations.getBoolean(nextKey))
                    ReadableType.Map -> {
                        options.setIntegration(nextKey, true)
                        options.setIntegrationOptions(nextKey, integrations.getMap(nextKey)?.toHashMap())
                    }
                }
            }
        }
        return options
    }

    /**
     * Tracks application lifecycle events - Application Installed, Application Updated and Application Opened
     * This is built to exactly mirror the application lifecycle tracking in analytics-android
     */
    private fun trackApplicationLifecycleEvents(writeKey: String?) {
        // Get the current version.
        var packageInfo = this.getPackageInfo()
        val currentVersion = packageInfo.versionName
        val currentBuild = packageInfo.versionCode

        // Get the previous recorded version.
        val sharedPreferences = getSegmentSharedPreferences(reactApplicationContext, writeKey)
        val previousVersion = sharedPreferences.getString(versionKey, null)
        val previousBuild = sharedPreferences.getInt(buildKey, -1)

        // Check and track Application Installed or Application Updated.
        if (previousBuild == -1) {
            var installedProperties = Properties()
            installedProperties[versionKey] = currentVersion
            installedProperties[buildKey] = currentBuild
            analytics.track("Application Installed", installedProperties)
        } else if (currentBuild != previousBuild) {
            var updatedProperties = Properties()
            updatedProperties[versionKey] = currentVersion
            updatedProperties[buildKey] = currentBuild
            updatedProperties["previous_$versionKey"] = previousVersion
            updatedProperties["previous_$buildKey"] = previousBuild
            analytics.track("Application Updated", updatedProperties)
        }

        // Track Application Opened.
        var appOpenedProperties = Properties()
        appOpenedProperties[versionKey] = currentVersion
        appOpenedProperties[buildKey] = currentBuild
        analytics.track("Application Opened", appOpenedProperties)

        // Update the recorded version.
        val editor = sharedPreferences.edit()
        editor.putString(versionKey, currentVersion)
        editor.putInt(buildKey, currentBuild)
        editor.apply()
    }

    @ReactMethod
    fun setup(options: ReadableMap, promise: Promise) {
        val json = options.getString("json")
        val writeKey = options.getString("writeKey")

        if(singletonJsonConfig != null) {
            if(json == singletonJsonConfig) {
                return promise.resolve(null)
            }
            else {
                return promise.reject("E_SEGMENT_RECONFIGURED", "Duplicate Analytics client")
            }
        }

        val builder = Analytics
                .Builder(reactApplicationContext, writeKey)
                .flushQueueSize(options.getInt("flushAt"))

        if(options.getBoolean("recordScreenViews")) {
            builder.recordScreenViews()
        }


        if(options.getBoolean("trackAttributionData")) {
            builder.trackAttributionInformation()
        }

        if(options.hasKey("flushInterval")) {
            builder.flushInterval(
                options.getInt("flushInterval").toLong(),
                TimeUnit.MILLISECONDS
            )
        }

        if(options.getBoolean("debug")) {
            builder.logLevel(Analytics.LogLevel.VERBOSE)
        }

        if(options.getBoolean("trackAppLifecycleEvents")) {
            builder.trackApplicationLifecycleEvents()
        }

        try {
            Analytics.setSingletonInstance(
                RNAnalytics.buildWithIntegrations(builder)
            )
        } catch(e: Exception) {
            return promise.reject("E_SEGMENT_ERROR", e)
        }

        if(options.getBoolean("trackAppLifecycleEvents")) {
            this.trackApplicationLifecycleEvents(writeKey)
        }

        singletonJsonConfig = json
        promise.resolve(null)
    }

    @ReactMethod
    fun track(event: String, properties: ReadableMap, integrations: ReadableMap, context: ReadableMap) =
        analytics.track(event, Properties() from properties, this.getOptions(integrations))

    @ReactMethod
    fun screen(name: String, properties: ReadableMap, integrations: ReadableMap, context: ReadableMap) =
        analytics.screen(null, name, Properties() from properties, this.getOptions(integrations))

    @ReactMethod
    fun identify(userId: String, traits: ReadableMap, integrations: ReadableMap, context: ReadableMap) =
        analytics.identify(userId, Traits() from traits, this.getOptions(integrations))

    @ReactMethod
    fun group(groupId: String, traits: ReadableMap, integrations: ReadableMap, context: ReadableMap) =
        analytics.group(groupId, Traits() from traits, this.getOptions(integrations))

    @ReactMethod
    fun alias(newId: String, context: ReadableMap, integrations: ReadableMap) =
        analytics.alias(newId, this.getOptions(integrations))

    @ReactMethod
    fun reset() =
        analytics.reset()

    @ReactMethod()
    fun flush() =
        analytics.flush()

    @ReactMethod
    fun enable() =
        analytics.optOut(false)

    @ReactMethod
    fun disable() =
        analytics.optOut(true)

    @ReactMethod
    fun getAnonymousId(promise: Promise) =
        promise.resolve(analytics.getAnalyticsContext().traits().anonymousId())
}

private infix fun<T: ValueMap> T.from(source: ReadableMap): T {
    putAll(source.toHashMap())

    return this
}
