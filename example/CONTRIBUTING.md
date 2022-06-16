# Contributing

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project.

## Adding Android Packages

Add necessary Gradle Dependencies

```sh
    implementation project(':segmentanalyticsreactnative')
    implementation "com.google.android.gms:play-services-ads-identifier:18.0.1"
    implementation project(':analyticsreactnativepluginadvertisingid')
```


Add project to `settings.gradle` 

```sh
include ':analyticsreactnativepluginadvertisingid'
project(':analyticsreactnativepluginadvertisingid').projectDir = new File(rootProject.projectDir, '../../packages/plugins/plugin-advertising-id/android')
```

Add package to `MainActivity.java`

```sh
    @Override
    protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
      List<ReactPackage> packages = new PackageList(this).getPackages();
      // Packages that cannot be autolinked yet can be added manually here, for
      // AnalyticsReactNativeExample:
      // packages.add(new MyReactNativePackage());
      packages.add(new AnalyticsReactNativePackage());
      packages.add(new AnalyticsReactNativePluginAdvertisingIdPackage());
      return packages;
    }
```