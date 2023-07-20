const withAndroidManifest = require('expo/config-plugins').withAndroidManifest;

const modifier = (config, options) => {
    options = options || {};
    const androidAppLinks = options?.androidAppLinks ?? [];
    return withAndroidManifest(config, config => {
      const application = config.modResults.manifest.application.find(s => s.$['android:name'] === '.MainApplication');
      if (!application) throw new Error('Unable to find MainApplication in manifest');
      const criiptoVerifyActivity = {
        '$': {
          'android:name': 'expo.modules.criiptoverify.CriiptoVerifyActivity',
          'android:exported': 'true',
          'android:launchMode': 'singleTop'
        },
        'intent-filter': androidAppLinks.map(href => ({
          '$': {
            'android:autoVerify': 'true',
            'data-generated': 'true'
          },
          action: {
            '$': {
              'android:name': 'android.intent.action.VIEW'
            }
          },
          data: {
            '$': {
              'android:scheme': "https",
              'android:host': "criipto-samples-applinks.netlify.app",
              'android:pathPrefix': "/auth/criipto"
            }
          },
          category: [
            {
              '$': {
                'android:name': 'android.intent.category.BROWSABLE'
              }
            },
            {
              '$': {
                'android:name': 'android.intent.category.DEFAULT'
              }
            }
          ]
        }))
      }
      application.activity = 
        application.activity.filter(s => s['$']['android:name'] !== 'expo.modules.criiptoverify.CriiptoVerifyActivity').concat([criiptoVerifyActivity]);
      return config;
    });
};
module.exports = modifier;