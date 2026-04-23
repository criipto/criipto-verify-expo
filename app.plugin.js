const { withAndroidManifest } = require("expo/config-plugins");

const META_DOMAIN = "criipto.verify.domain";
const META_CLIENT_ID = "criipto.verify.clientId";
const REDIRECT_ACTIVITY_NAME = "eu.idura.verify.RedirectUriReceiverActivity";
const TOOLS_NS = "http://schemas.android.com/tools";
const REQUIRED_MIN_SDK = 29;

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

  // The Idura Verify Android SDK requires minSdkVersion 29 (AppAuth / androidx.browser).
  // Expo's prebuild default is 24, so consumers must opt in via expo-build-properties.
  // Check at prebuild time rather than letting the manifest merger error at first Android
  // build — the latter error is correct but intimidating, and easily avoidable.
  const buildPropertiesPlugin = (config.plugins ?? []).find(
    (entry) => Array.isArray(entry) && entry[0] === "expo-build-properties",
  );
  const buildPropertiesMinSdk = buildPropertiesPlugin?.[1]?.android?.minSdkVersion;
  if (typeof buildPropertiesMinSdk !== "number" || buildPropertiesMinSdk < REQUIRED_MIN_SDK) {
    throw new Error(
      `@criipto/verify-expo: the Idura Verify Android SDK requires android.minSdkVersion >= ${REQUIRED_MIN_SDK}. Add expo-build-properties to your plugins in app.json, BEFORE @criipto/verify-expo:\n` +
        `\n  "plugins": [\n` +
        `    ["expo-build-properties", { "android": { "minSdkVersion": ${REQUIRED_MIN_SDK} } }],\n` +
        `    ["@criipto/verify-expo", { "domain": "...", "clientID": "..." }]\n` +
        `  ]\n\n` +
        `Current value: ${buildPropertiesMinSdk ?? "<not set>"}.`,
    );
  }

  return withAndroidManifest(config, (config) => {
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
};

module.exports = modifier;
