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

package com.segment.analytics.reactnative.integration.adjust

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.segment.analytics.reactnative.core.RNAnalytics
import com.segment.analytics.Analytics
import android.util.Log
import com.segment.analytics.android.integrations.adjust.AdjustIntegration

class RNAnalyticsIntegration_AdjustModule(context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
    override fun getName() = "RNAnalyticsIntegration_Adjust"

    @ReactMethod
    fun setup() {
        RNAnalytics.addIntegration(AdjustIntegration.FACTORY)
        RNAnalytics.addOnReadyCallback("Adjust", Analytics.Callback { instance ->
            Log.v("RNAnalyticsIntegration_Adjust", "Adjust integration ready.")
            if (instance is com.adjust.sdk.AdjustInstance) {
                instance.onResume()
            }
        })
    }
}
