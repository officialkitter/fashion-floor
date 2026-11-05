# Mobile startup and download size

The customer app starts catalogue requests for the Boutique, Lounge, and building directory while the native splash is visible. The native splash yields after 900 ms at the latest so a slow or offline connection cannot block app startup. Each resource shows its MMKV cache immediately, then refreshes in the background.

Lists request 40 records at a time and fetch another page as the user scrolls. Product and directory data are stored locally for offline reopening. Remote images are not bundled or downloaded as a full catalogue: visible list cells load them on demand, the first welcome image is warmed at startup, and appropriately sized editorial images use Expo Image's disk cache.

Android release builds use phone ABIs only and enable R8/resource shrinking. After changing Expo config, regenerate the native project and create an Android App Bundle:

```powershell
npx expo prebuild --platform android --no-install
.\android\gradlew.bat bundleRelease
```

The bundle is written under `android/app/build/outputs/bundle/release/`. Google Play delivers device-specific splits from an App Bundle; the size of a universal debug APK or the installed app is not the download size. Confirm the actual compressed download size for each target device in Play Console's App Bundle Explorer. A strict 20 MB download limit depends on the final release bundle, Android ABI, Play splits, and included native libraries, so it must be confirmed from that generated delivery rather than inferred from the source tree.
