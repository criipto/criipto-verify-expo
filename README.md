# criipto-verify-expo

Accept MitID, NemID, Swedish BankID, Norwegian BankID and more logins in your Expo (React-Native) app with `@criipto/verify-expo`.

Both platforms delegate to the native Idura Verify SDKs ([iOS](https://github.com/criipto/idura-verify-ios), [Android](https://github.com/criipto/idura-verify-android)). OIDC discovery, PKCE, browser-tab selection (Auth Tab where supported, Custom Tab / ASWebAuthenticationSession otherwise), MitID / BankID / Freja app-switching, and token exchange all happen natively. The JS layer is a thin wrapper that forwards `acr_values` to the right SDK and decodes the returned `id_token`.

## Requirements

- **Expo SDK 54 or newer** (ships React Native 0.81 / Kotlin 2.1.20 / AGP 8.11 / iOS 17.4 floor).
- Android `minSdkVersion` **29 or newer**. Expo's prebuild default is 24, so you must opt in explicitly via [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/).
- iOS deployment target **17.4 or newer**, with `useFrameworks: "dynamic"` enabled. Same plugin handles both.
- iOS consumers also need an `appleTeamId` set in `app.json` so the Idura-hosted `apple-app-site-association` file can authorise your app for the `applinks:` / `webcredentials:` associated domains.

Consumers on older Expo releases should stay on `@criipto/verify-expo` 3.x.

## App switch

The native SDKs handle app-switching for Danish MitID, Swedish BankID, and Swedish FrejaID. The redirect URLs (`https://{YOUR_CRIIPTO_DOMAIN}/android/callback` and `https://{YOUR_CRIIPTO_DOMAIN}/ios/callback`) are wired up automatically by the Expo plugin — the Android intent-filter goes into `AndroidManifest.xml` via `tools:node="replace"`, the iOS `applinks:` entry goes into the `.entitlements` file. No extra configuration on your side beyond the `domain` plugin option.

For Danish MitID app-switching to work on iOS, the AASA file at `https://{YOUR_CRIIPTO_DOMAIN}/.well-known/apple-app-site-association` needs to authorise your app — Idura hosts and serves this for `*.criipto.id` and `*.idura.broker` domains as long as your bundle ID and Apple Team ID are configured in the [Idura dashboard](https://dashboard.idura.app). Consumers using a custom domain must host this file themselves.

### Expo Go

Neither MitID on Android nor app-switch on iOS works in Expo Go — both require entitlements / manifest changes that only land in a real build. Use `npx expo run:ios` / `npx expo run:android` or EAS Build.

## Installation

```sh
npm install @criipto/verify-expo expo-build-properties
```

Then configure both plugins in `app.json`. `expo-build-properties` must appear **before** `@criipto/verify-expo` so its overrides are applied first:

```json
"ios": {
  "bundleIdentifier": "com.example.yourapp",
  "appleTeamId": "ABCDE12345"
},
"android": {
  "package": "com.example.yourapp"
},
"plugins": [
  ["expo-build-properties", {
    "android": { "minSdkVersion": 29 },
    "ios": { "deploymentTarget": "17.4", "useFrameworks": "dynamic" }
  }],
  ["@criipto/verify-expo", {
    "domain": "YOUR_CRIIPTO_DOMAIN",
    "clientID": "urn:my:application:identifier:XXXX"
  }]
]
```

The plugin fails `expo prebuild` with a clear error if any of the `expo-build-properties` requirements are missing.

### Side effect: `useFrameworks: "dynamic"`

The iOS SDK is distributed only via Swift Package Manager. CocoaPods bridges it via `spm_dependency` in our podspec, and that mechanism only works when the consumer app uses `use_frameworks! :linkage => :dynamic`. This propagates project-wide — every other native module in your app builds as a dynamic framework. Most modules tolerate this; some older ones depending on static `.a` libraries may not. If you hit unexpected linker errors after adding `@criipto/verify-expo`, this is the first thing to check.

## Getting Started

Wrap your application in `CriiptoVerifyProvider`:

```jsx
// src/App.jsx
import { View, Button, Text } from "react-native";
import { CriiptoVerifyProvider, useCriiptoVerify } from "@criipto/verify-expo";

export default function App() {
  return (
    <CriiptoVerifyProvider>
      <LoginButton />
    </CriiptoVerifyProvider>
  );
}

function LoginButton() {
  const { login, claims, error } = useCriiptoVerify();

  const handlePress = async (acrValues) => {
    try {
      await login(acrValues);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Button
        onPress={() => handlePress("urn:grn:authn:dk:mitid:substantial")}
        title="Login with Danish MitID"
      />
      <Button
        onPress={() => handlePress("urn:grn:authn:se:bankid:same-device")}
        title="Login with Swedish BankID"
      />
      <Button
        onPress={() => handlePress("urn:grn:authn:fi:bank-id")}
        title="Login with Finnish BankID"
      />
      <Button
        onPress={() => handlePress("urn:grn:authn:no:bankid:substantial")}
        title="Login with Norwegian BankID"
      />

      {error && <Text>An error occurred: {error.toString()}</Text>}
      {claims && <Text>{JSON.stringify(claims, null, 2)}</Text>}
    </>
  );
}
```

`domain` and `clientID` come from the plugin config in `app.json` — there's no JSX prop for them, since the values have to be baked into the native build (Android meta-data + iOS Info.plist) for the SDKs to read at startup.

## Migration from 3.x

Breaking changes in 4.x:

- `@criipto/verify-expo` plugin options: `androidAppLinks: string[]` → `{ domain, clientID }`.
- `CriiptoVerifyProvider` props: `domain` and `clientID` removed (now sourced from the plugin config).
- `login()` signature: `login(acrValues, redirectUri, params)` → `login(acrValues, params)`. The redirect URI is fixed by the SDK at `https://{domain}/{platform}/callback`.
- Peer dependencies: `expo` floor raised to `>=54`, `react` to `>=19`, `react-native` to `>=0.81`.
- Android `minSdkVersion` raised from 21 to 29; iOS deployment target raised to 17.4.

## Local development

```sh
# in root
npm link

# in example
npm link @criipto/verify-expo
npm start
```

## Criipto

Learn more about Criipto and sign up for your free developer account at [criipto.com](https://www.criipto.com).
