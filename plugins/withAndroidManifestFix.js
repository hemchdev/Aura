const { createRunOncePlugin, withAndroidManifest } = require('@expo/config-plugins');

const withAndroidManifestFix = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    
    // Ensure the manifest structure exists
    if (!androidManifest.manifest) {
      androidManifest.manifest = {};
    }
    
    if (!androidManifest.manifest.$) {
      androidManifest.manifest.$ = {};
    }
    
    if (!androidManifest.manifest.application) {
      androidManifest.manifest.application = [{}];
    }
    
    if (!androidManifest.manifest.application[0].$) {
      androidManifest.manifest.application[0].$ = {};
    }
    
    // Add tools namespace to manifest root
    androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    
    // Fix manifest merger conflicts by adding tools:replace
    androidManifest.manifest.application[0].$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';
    androidManifest.manifest.application[0].$['tools:replace'] = 'android:appComponentFactory';
    
    return config;
  });
};

module.exports = createRunOncePlugin(withAndroidManifestFix, 'withAndroidManifestFix');
