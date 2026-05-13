import { withAndroidManifest, AndroidConfig, type ConfigPlugin } from "expo/config-plugins";

const { addMetaDataItemToMainApplication, ensureToolsAvailable, getMainApplicationOrThrow } =
  AndroidConfig.Manifest;

const META_DOMAIN = "criipto.verify.domain";
const META_CLIENT_ID = "criipto.verify.clientId";
const REDIRECT_ACTIVITY_NAME = "eu.idura.verify.RedirectUriReceiverActivity";
const REQUIRED_MIN_SDK = 26;

type Props = {
  domain?: string;
  clientID?: string;
};

const withCriiptoVerify: ConfigPlugin<Props | void> = (config, options) => {
  const domain = options?.domain;
  const clientID = options?.clientID;

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

  // The Idura Verify Android SDK requires minSdkVersion 26. Expo's prebuild default is 24,
  // so consumers must opt in via expo-build-properties. Check at prebuild time rather than
  // letting the manifest merger error at first Android build — the latter error is correct
  // but intimidating, and easily avoidable.
  const buildPropertiesPlugin = (config.plugins ?? []).find(
    (entry): entry is [string, { android?: { minSdkVersion?: number } }] =>
      Array.isArray(entry) && entry[0] === "expo-build-properties",
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
    ensureToolsAvailable(config.modResults);

    const application = getMainApplicationOrThrow(config.modResults);

    // <meta-data> entries so CriiptoVerifyPackage can read domain + clientID at host-Activity
    // onCreate time, without the module having to round-trip them through JavaScript.
    addMetaDataItemToMainApplication(application, META_DOMAIN, domain);
    addMetaDataItemToMainApplication(application, META_CLIENT_ID, clientID);

    // Override the SDK's templated RedirectUriReceiverActivity intent-filter with one where
    // `android:host` is already resolved to the consumer's domain. The SDK's own AAR manifest
    // declares the activity with `android:host="${iduraDomain}"`, relying on AGP manifest
    // placeholders. Using `tools:node="replace"` in the consumer manifest short-circuits that
    // dance entirely — no build.gradle string-mutation, no coupling to `manifestPlaceholders`.
    // No Expo helper exists for activity overrides, so this stays hand-rolled.
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

export default withCriiptoVerify;
