const { createRunOncePlugin, withAndroidManifest, withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidManifestFix = (config) => {
  // Note: Build properties are handled in gradle files, not in app.json
  // Keep existing android config as is to avoid expo doctor schema errors

  // Fix Android manifest merger conflicts
  config = withAndroidManifest(config, (config) => {
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
    
    // Add hardwareAccelerated for better performance
    androidManifest.manifest.application[0].$['android:hardwareAccelerated'] = 'true';
    
    // Add largeHeap for better memory management
    androidManifest.manifest.application[0].$['android:largeHeap'] = 'true';
    
    return config;
  });

  // Add gradle configuration to exclude old support libraries
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Add configurations to exclude old support libraries
      const gradleConfig = `
allprojects {
    configurations.all {
        exclude group: 'com.android.support', module: 'support-compat'
        exclude group: 'com.android.support', module: 'support-annotations'
        exclude group: 'com.android.support', module: 'support-v4'
        exclude group: 'com.android.support', module: 'animated-vector-drawable'
        exclude group: 'com.android.support', module: 'support-vector-drawable'
        exclude group: 'com.android.support', module: 'versionedparcelable'
        
        resolutionStrategy {
            force 'androidx.core:core:1.13.1'
            force 'androidx.appcompat:appcompat:1.6.1'
            force 'androidx.activity:activity:1.8.0'
            force 'androidx.fragment:fragment:1.6.2'
            force 'androidx.vectordrawable:vectordrawable:1.1.0'
            force 'androidx.vectordrawable:vectordrawable-animated:1.1.0'
            force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
        }
    }
}`;

      if (!config.modResults.contents.includes('configurations.all')) {
        config.modResults.contents += gradleConfig;
      }
    }
    return config;
  });
  
  return config;
};

module.exports = createRunOncePlugin(withAndroidManifestFix, 'withAndroidManifestFix');
