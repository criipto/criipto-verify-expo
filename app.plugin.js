const withAndroidManifest = require('expo/config-plugins').withAndroidManifest;

const modifier = (config, options) => {
    options = options || {};

    const androidPackage = config.android?.package;
    const criiptoDomain = process.env.CRIIPTO_DOMAIN ?? options?.domain;
    const androidAppLinks = (options?.androidAppLinks ?? []).concat(
      criiptoDomain && androidPackage ? [
        `https://${criiptoDomain}/android/${androidPackage}/callback`
      ] : []
    );

    return withAndroidManifest(config, config => {
      const application = config.modResults.manifest.application.find(s => s.$['android:name'] === '.MainApplication');
      if (!application) throw new Error('Unable to find MainApplication in manifest');
      if (!androidAppLinks.length) return config;

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
              'android:host': new URL(href).host,
              'android:pathPrefix': new URL(href).pathname
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