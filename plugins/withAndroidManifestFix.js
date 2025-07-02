const { createRunOncePlugin, withAndroidManifest } = require('@expo/config-plugins');

const withAndroidManifestFix = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    
    // Fix manifest merger conflicts
    if (androidManifest.manifest.application) {
      // Add tools:replace for appComponentFactory
      androidManifest.manifest.application.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';
      androidManifest.manifest.application.$['tools:replace'] = 'android:appComponentFactory';
      
      // Ensure xmlns:tools is added to manifest
      if (!androidManifest.manifest.$['xmlns:tools']) {
        androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
      }
    }
    
    return config;
  });
};

module.exports = createRunOncePlugin(withAndroidManifestFix, 'withAndroidManifestFix');
