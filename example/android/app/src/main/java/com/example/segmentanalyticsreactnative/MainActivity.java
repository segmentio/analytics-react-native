package com.example.segmentanalyticsreactnative;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.os.Build;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.segmentanalyticsreactnative.AnalyticsReactNativeModule;
import com.sovranreactnative.SovranModule;
import com.zoontek.rnbootsplash.RNBootSplash;

import java.util.Hashtable;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is
   * used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "AnalyticsReactNativeExample";
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    RNBootSplash.init(R.drawable.bootsplash, MainActivity.this);
  }

  @Override
  protected void onResume() {
    super.onResume();
  }
}
