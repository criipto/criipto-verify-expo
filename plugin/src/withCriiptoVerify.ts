import {
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
  AndroidConfig,
  type ConfigPlugin,
} from "expo/config-plugins";

const { addMetaDataItemToMainApplication, ensureToolsAvailable, getMainApplicationOrThrow } =
  AndroidConfig.Manifest;

const META_DOMAIN = "criipto.verify.domain";
const META_CLIENT_ID = "criipto.verify.clientId";
const REDIRECT_ACTIVITY_NAME = "eu.idura.verify.RedirectUriReceiverActivity";
const REQUIRED_ANDROID_MIN_SDK = 26;

const INFO_PLIST_DOMAIN_KEY = "IDURA_DOMAIN";
const INFO_PLIST_CLIENT_ID_KEY = "IDURA_CLIENT_ID";
const REQUIRED_IOS_DEPLOYMENT_TARGET = "17.4";

type Props = {
  domain?: string;
  clientID?: string;
};

type BuildPropertiesEntry = [
  string,
  {
    android?: { minSdkVersion?: number };
    ios?: { deploymentTarget?: string; useFrameworks?: "static" | "dynamic" };
  },
];

const findBuildPropertiesEntry = (
  config: Parameters<ConfigPlugin<Props | void>>[0],
): BuildPropertiesEntry | undefined =>
  (config.plugins ?? []).find(
    (entry): entry is BuildPropertiesEntry =>
      Array.isArray(entry) && entry[0] === "expo-build-properties",
  );

const compareIOSDeploymentTarget = (a: string, b: string): number => {
  const [aMajor, aMinor = 0] = a.split(".").map((part) => parseInt(part, 10));
  const [bMajor, bMinor = 0] = b.split(".").map((part) => parseInt(part, 10));
  if (aMajor !== bMajor) return aMajor - bMajor;
  return aMinor - bMinor;
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

  const buildPropertiesEntry = findBuildPropertiesEntry(config);
  const buildProperties = buildPropertiesEntry?.[1];

  // ── Android: Idura Verify Android SDK floor ────────────────────────────────
  // The SDK requires minSdkVersion 26. Expo's prebuild default is 24, so consumers
  // must opt in via expo-build-properties. We check at prebuild time rather than
  // letting the manifest merger error at first Android build — the latter error
  // is correct but intimidating, and easily avoidable.
  const buildPropertiesMinSdk = buildProperties?.android?.minSdkVersion;
  if (
    typeof buildPropertiesMinSdk !== "number" ||
    buildPropertiesMinSdk < REQUIRED_ANDROID_MIN_SDK
  ) {
    throw new Error(
      `@criipto/verify-expo: the Idura Verify Android SDK requires android.minSdkVersion >= ${REQUIRED_ANDROID_MIN_SDK}. Add expo-build-properties to your plugins in app.json, BEFORE @criipto/verify-expo:\n` +
        `\n  "plugins": [\n` +
        `    ["expo-build-properties", { "android": { "minSdkVersion": ${REQUIRED_ANDROID_MIN_SDK} } }],\n` +
        `    ["@criipto/verify-expo", { "domain": "...", "clientID": "..." }]\n` +
        `  ]\n\n` +
        `Current value: ${buildPropertiesMinSdk ?? "<not set>"}.`,
    );
  }

  // ── iOS: SwiftPM-only Idura Verify SDK ──────────────────────────────────────
  // The Idura Verify iOS SDK ships only as a Swift Package. Our podspec links it
  // via `spm_dependency`, which on the consumer side requires dynamic-framework
  // linkage — static linkage produces duplicate-symbol errors when the same
  // Swift module is reached through both the SPM and CocoaPods graphs. The SDK
  // also targets iOS 17.4 as its deployment floor; passing this through to the
  // app's `IPHONEOS_DEPLOYMENT_TARGET` keeps the App Store submission consistent.
  const buildPropertiesUseFrameworks = buildProperties?.ios?.useFrameworks;
  const buildPropertiesIOSDeploymentTarget = buildProperties?.ios?.deploymentTarget;
  if (
    buildPropertiesUseFrameworks !== "dynamic" ||
    !buildPropertiesIOSDeploymentTarget ||
    compareIOSDeploymentTarget(buildPropertiesIOSDeploymentTarget, REQUIRED_IOS_DEPLOYMENT_TARGET) <
      0
  ) {
    throw new Error(
      `@criipto/verify-expo: the Idura Verify iOS SDK requires ios.useFrameworks "dynamic" and ios.deploymentTarget >= ${REQUIRED_IOS_DEPLOYMENT_TARGET}. Update your expo-build-properties config:\n` +
        `\n  "plugins": [\n` +
        `    ["expo-build-properties", {\n` +
        `      "android": { "minSdkVersion": ${REQUIRED_ANDROID_MIN_SDK} },\n` +
        `      "ios": { "useFrameworks": "dynamic", "deploymentTarget": "${REQUIRED_IOS_DEPLOYMENT_TARGET}" }\n` +
        `    }],\n` +
        `    ["@criipto/verify-expo", { "domain": "...", "clientID": "..." }]\n` +
        `  ]\n\n` +
        `Current values: useFrameworks=${buildPropertiesUseFrameworks ?? "<not set>"}, deploymentTarget=${buildPropertiesIOSDeploymentTarget ?? "<not set>"}.`,
    );
  }

  config = withAndroidConfig(config, { domain, clientID });
  config = withIOSConfig(config, { domain, clientID });
  return config;
};

const withAndroidConfig: ConfigPlugin<{ domain: string; clientID: string }> = (
  config,
  { domain, clientID },
) =>
  withAndroidManifest(config, (config) => {
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

const withIOSConfig: ConfigPlugin<{ domain: string; clientID: string }> = (
  config,
  { domain, clientID },
) => {
  // The iOS SDK reads its config from Info.plist (matching the Android meta-data
  // pattern), so the JS module never has to know domain/clientID. The
  // associated-domains entitlement is required for the browser callback to be
  // delivered back into the app via universal link — both `webcredentials` (used
  // by ASWebAuthenticationSession for callback host matching) and `applinks`
  // (used by the OS to route `/ios/callback` taps to the app, including the
  // app-switch return from MitID/BankID).
  config = withInfoPlist(config, (config) => {
    config.modResults[INFO_PLIST_DOMAIN_KEY] = domain;
    config.modResults[INFO_PLIST_CLIENT_ID_KEY] = clientID;
    return config;
  });
  config = withEntitlementsPlist(config, (config) => {
    const existing =
      (config.modResults["com.apple.developer.associated-domains"] as string[]) ?? [];
    const additions = [`webcredentials:${domain}`, `applinks:${domain}`];
    config.modResults["com.apple.developer.associated-domains"] = Array.from(
      new Set([...existing, ...additions]),
    );
    return config;
  });
  return config;
};

export default withCriiptoVerify;
