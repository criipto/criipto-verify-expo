const {
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
} = require("expo/config-plugins");

const META_DOMAIN = "criipto.verify.domain";
const META_CLIENT_ID = "criipto.verify.clientId";
const REDIRECT_ACTIVITY_NAME = "eu.idura.verify.RedirectUriReceiverActivity";
const TOOLS_NS = "http://schemas.android.com/tools";
const INFO_PLIST_DOMAIN = "IDURA_DOMAIN";
const INFO_PLIST_CLIENT_ID = "IDURA_CLIENT_ID";
const ASSOCIATED_DOMAINS_KEY = "com.apple.developer.associated-domains";

const REQUIRED_MIN_SDK = 29;
const REQUIRED_IOS_DEPLOYMENT_TARGET = "17.4";
const REQUIRED_IOS_USE_FRAMEWORKS = "dynamic";

const modifier = (config, options) => {
  const domain = options?.domain ?? process.env.CRIIPTO_DOMAIN;
  const clientID = options?.clientID ?? options?.clientId;

  if (!domain) {
    throw new Error(
      "@criipto/verify-expo: missing 'domain' plugin option. Add it to app.json under plugins.",
    );
  }
  if (!clientID) {
    throw new Error(
      "@criipto/verify-expo: missing 'clientID' plugin option. Add it to app.json under plugins.",
    );
  }

  validateBuildProperties(config);

  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // The activity override below uses `tools:node="replace"`. Declaring the tools namespace
    // on the manifest root is required; Expo's default manifest doesn't always include it.
    if (manifest.$["xmlns:tools"] !== TOOLS_NS) {
      manifest.$["xmlns:tools"] = TOOLS_NS;
    }

    const application = manifest.application?.find(
      (a) => a.$["android:name"] === ".MainApplication",
    );
    if (!application) {
      throw new Error(
        '@criipto/verify-expo: could not find <application android:name=".MainApplication"> in AndroidManifest.xml',
      );
    }

    // <meta-data> entries so CriiptoVerifyPackage can read domain + clientID at host-Activity
    // onCreate time, without the module having to round-trip them through JavaScript.
    const metaData = (application["meta-data"] ?? []).filter(
      (entry) =>
        entry.$["android:name"] !== META_DOMAIN && entry.$["android:name"] !== META_CLIENT_ID,
    );
    metaData.push(
      { $: { "android:name": META_DOMAIN, "android:value": domain } },
      { $: { "android:name": META_CLIENT_ID, "android:value": clientID } },
    );
    application["meta-data"] = metaData;

    // Override the SDK's templated RedirectUriReceiverActivity intent-filter with one where
    // `android:host` is already resolved to the consumer's domain. The SDK's own AAR manifest
    // declares the activity with `android:host="${iduraDomain}"`, relying on AGP manifest
    // placeholders. Using `tools:node="replace"` in the consumer manifest short-circuits that
    // dance entirely — no build.gradle string-mutation, no coupling to `manifestPlaceholders`.
    const activities = (application.activity ?? []).filter(
      (a) => a.$["android:name"] !== REDIRECT_ACTIVITY_NAME,
    );
    activities.push({
      $: {
        "android:name": REDIRECT_ACTIVITY_NAME,
        "android:exported": "true",
        "tools:node": "replace",
      },
      "intent-filter": [
        {
          $: { "android:autoVerify": "true" },
          action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
            { $: { "android:name": "android.intent.category.BROWSABLE" } },
          ],
          data: [
            { $: { "android:scheme": "https" } },
            { $: { "android:host": domain } },
            { $: { "android:path": "/android/callback" } },
          ],
        },
      ],
    });
    application.activity = activities;

    return config;
  });

  // Inject IDURA_DOMAIN / IDURA_CLIENT_ID as Info.plist string entries — CriiptoVerifyExpoModule
  // reads them from `Bundle.main.infoDictionary` at OnCreate time. Same approach as the iOS
  // SDK README's recommended xcconfig + Info.plist pairing, just done declaratively from
  // app.json so consumers don't have to touch native config.
  config = withInfoPlist(config, (config) => {
    config.modResults[INFO_PLIST_DOMAIN] = domain;
    config.modResults[INFO_PLIST_CLIENT_ID] = clientID;
    return config;
  });

  // Add the SDK's redirect domain to the app's associated-domains entitlement. `webcredentials:`
  // is required for Apple to validate the AASA file at https://{domain}/.well-known/apple-app-site-association
  // (Idura hosts this for *.criipto.id / *.idura.broker domains; consumers using their own
  // domain must host their own). `applinks:` is required for MitID / BankID app-switch
  // redirection back into the consumer's app.
  config = withEntitlementsPlist(config, (config) => {
    const existing = config.modResults[ASSOCIATED_DOMAINS_KEY] ?? [];
    const domains = new Set(existing);
    domains.add(`webcredentials:${domain}`);
    domains.add(`applinks:${domain}`);
    config.modResults[ASSOCIATED_DOMAINS_KEY] = Array.from(domains);
    return config;
  });

  return config;
};

/**
 * The Idura Verify SDKs require their consumers to set a few native build properties that
 * are not Expo defaults. expo-build-properties is the canonical place for those.
 *
 * - Android `minSdkVersion >= 29`: the Android SDK depends on AppAuth / androidx.browser
 *   1.9, which require API 29+.
 * - iOS `deploymentTarget >= 17.4`: the iOS SDK targets iOS 17.4 as its floor.
 * - iOS `useFrameworks: "dynamic"`: the SPM `IduraVerify` package is bridged into CocoaPods
 *   via `spm_dependency` in our podspec, and that mechanism only registers SPM refs into
 *   the consumer's Pods.xcodeproj when the consumer has `use_frameworks!` enabled with
 *   dynamic linking.
 *
 * Validate at prebuild time. The errors deeper in the build pipeline (manifest merger
 * complaining about minSdk, xcodebuild complaining about deployment target, SPM warnings
 * silently failing) are correct but unfriendly first-time experiences, easily avoided.
 */
function validateBuildProperties(config) {
  const buildPropertiesPlugin = (config.plugins ?? []).find(
    (entry) => Array.isArray(entry) && entry[0] === "expo-build-properties",
  );
  const buildProperties = buildPropertiesPlugin?.[1] ?? {};
  const errors = [];

  const androidMinSdk = buildProperties.android?.minSdkVersion;
  if (typeof androidMinSdk !== "number" || androidMinSdk < REQUIRED_MIN_SDK) {
    errors.push(
      `android.minSdkVersion: ${androidMinSdk ?? "<not set>"} → required >= ${REQUIRED_MIN_SDK}`,
    );
  }

  const iosTarget = buildProperties.ios?.deploymentTarget;
  if (
    typeof iosTarget !== "string" ||
    parseFloat(iosTarget) < parseFloat(REQUIRED_IOS_DEPLOYMENT_TARGET)
  ) {
    errors.push(
      `ios.deploymentTarget: ${iosTarget ?? "<not set>"} → required >= "${REQUIRED_IOS_DEPLOYMENT_TARGET}"`,
    );
  }

  const iosFrameworks = buildProperties.ios?.useFrameworks;
  if (iosFrameworks !== REQUIRED_IOS_USE_FRAMEWORKS) {
    errors.push(
      `ios.useFrameworks: ${iosFrameworks ? `"${iosFrameworks}"` : "<not set>"} → required "${REQUIRED_IOS_USE_FRAMEWORKS}"`,
    );
  }

  if (errors.length === 0) return;

  throw new Error(
    `@criipto/verify-expo: native build properties don't satisfy the Idura Verify SDK requirements:\n` +
      errors.map((e) => `  - ${e}`).join("\n") +
      `\n\nAdd expo-build-properties to your plugins in app.json, BEFORE @criipto/verify-expo:\n\n` +
      `  "plugins": [\n` +
      `    ["expo-build-properties", {\n` +
      `      "android": { "minSdkVersion": ${REQUIRED_MIN_SDK} },\n` +
      `      "ios": { "deploymentTarget": "${REQUIRED_IOS_DEPLOYMENT_TARGET}", "useFrameworks": "${REQUIRED_IOS_USE_FRAMEWORKS}" }\n` +
      `    }],\n` +
      `    ["@criipto/verify-expo", { "domain": "...", "clientID": "..." }]\n` +
      `  ]\n`,
  );
}

module.exports = modifier;
