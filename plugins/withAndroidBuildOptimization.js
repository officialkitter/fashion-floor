const { withGradleProperties } = require('@expo/config-plugins');

const ANDROID_BUILD_PROPERTIES = {
  reactNativeArchitectures: 'armeabi-v7a,arm64-v8a',
  'android.enableProguardInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

module.exports = function withAndroidBuildOptimization(config) {
  return withGradleProperties(config, (config) => {
    for (const [key, value] of Object.entries(ANDROID_BUILD_PROPERTIES)) {
      const property = config.modResults.find((entry) => entry.key === key);
      if (property) {
        property.value = value;
      } else {
        config.modResults.push({ type: 'property', key, value });
      }
    }

    return config;
  });
};
