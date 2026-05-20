# criipto-verify-expo

Accept MitID, NemID, Swedish BankID, Norwegian BankID and more logins in your Expo (React-Native) app with @criipto/verify-expo.
The SDK supports app switching for Swedish BankID, FrejaID, and Danish MitID on both iOS and Android.

## Requirements

- Expo SDK **54 or newer** (ships React Native 0.81 / Kotlin 2.1.20 / AGP 8.11).
- Android `minSdkVersion` **26 or newer**. Expo's prebuild default is 24, so you must opt in explicitly via [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/) — see [Installation](#installation).
- iOS **17.4 or newer**, with `use_frameworks! :linkage => :dynamic`. The Idura Verify iOS SDK is distributed as a Swift Package, which requires dynamic framework linkage. The Expo plugin verifies both via `expo-build-properties`.
- This module includes native code, so it will not work with Expo Go. You must use a build, for instance `npx expo run:ios` / `npx expo run:android` or EAS Build.

Both platforms delegate to the native Idura Verify SDKs ([Android](https://github.com/criipto/idura-verify-android), [iOS](https://github.com/criipto/idura-verify-ios)). Consumers on older Expo releases should stay on `@criipto/verify-expo` 3.x.

## Installation

```sh
npm install @criipto/verify-expo expo-build-properties
```

## Initialization

The SDK needs to be configured with two pieces of information:

- Your Idura domain.
- Your Idura client ID.

The SDK assumes that:

- You will be using your [Idura domain](https://docs.idura.app/verify/getting-started/glossary/#domain-idura-domain) to host your redirect URL (both custom domains, \*.criipto.id, and \*.idura.broker domains can be used).
- Your redirect URL will be `https://[YOUR IDURA DOMAIN]/[ios|android]/callback`. Currently, custom redirect URLs are not supported. Open an issue if you need it.

You should register the callback URLs in the [Idura dashboard](https://dashboard.idura.app). If your domain is `https://samples.criipto.id`, you should register both `https://samples.criipto.id/ios/callback` and `https://samples.criipto.id/android/callback`.

Then configure both plugins in `app.json`. `expo-build-properties` must appear **before** `@criipto/verify-expo` so its overrides are applied first:

```json
"plugins": [
  ["expo-build-properties", {
    "android": { "minSdkVersion": 26 },
    "ios": { "useFrameworks": "dynamic", "deploymentTarget": "17.4" }
  }],
  ["@criipto/verify-expo", {
    "domain": "YOUR_IDURA_DOMAIN",
    "clientID": "urn:my:application:identifier:XXXX"
  }]
]
```

The plugin fails `expo prebuild` with copy-paste-friendly errors if any of these requirements are unmet.

## Getting Started

Call `login()` directly — there's no provider or hook to wire up. Configuration (`domain`, `clientID`) lives in `app.json` and is read by the native modules. Hold the result in your own state (`useState`, zustand, react-query — your call) since the package doesn't keep one for you:

```jsx
// src/LoginButton.jsx
import { useState } from "react";
import { Button, Text } from "react-native";
import { login, OAuth2Error, UserCancelledError } from "@criipto/verify-expo";

export default function LoginButton() {
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState(null);

  const handlePress = async (acrValues) => {
    try {
      const { id_token, trace_id, claims } = await login({ acrValues });
      setClaims(claims);
      setError(null);
    } catch (e) {
      if (e instanceof UserCancelledError) return; // expected; not an error condition
      setError(e);
      setClaims(null);
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
      <Button onPress={() => handlePress("urn:grn:authn:se:frejaid")} title="Login with Freja ID" />
      <Button
        onPress={() => handlePress("urn:grn:authn:no:bankid:substantial")}
        title="Login with Norwegian BankID"
      />

      {error ? <Text>An error occurred: {error.toString()}</Text> : null}
      {claims ? <Text>{JSON.stringify(claims, null, 2)}</Text> : null}
    </>
  );
}
```

On failure `login()` throws a typed error: `UserCancelledError` for the user dismissing the flow, `OAuth2Error` for IdP errors, `NoSuitableBrowserError` (Android-only) when no Custom Tab-capable browser is installed, plus `ModuleNotConfiguredError` / `UnknownPromptError` / `IduraVerifyInternalError`. All carry the SDK's `trace_id` where available, for correlation in the Idura dashboard.

## Ephemeral sessions (iOS only)

The web view used to display the login page lets you choose between an ephemeral or a shared browser session.

- **An ephemeral session** shares no cookies with the user's default browser, so the user may have to enter their login details. This is the default.
- **A shared session** shares cookies with the user's default browser, so login details may be remembered between logins. However, the system presents a permission dialog ("'Your App' wants to use 'idura.broker' to sign in") each time the user logs in.

The default value is to use an ephemeral session.

It is up to you to decide which flow is better, based on the UX requirements of your application. Not all eIDs require the user to enter anything in the webview — for example, Swedish BankID takes the user directly to their authenticator app. For this reason, you may also want to use a shared session for some eIDs but not others. Pass `preferEphemeralSession` on the `login()` call to override per-flow:

```ts
await login({
  acrValues: "urn:grn:authn:dk:mitid:substantial",
  preferEphemeralSession: false, // opt into a shared browser session
});
```

Danish MitID supports a [re-authentication flow](https://docs.idura.app/verify/e-ids/danish-mitid/#reauthentication), so you do not need to rely on a shared browser session if you need to re-authenticate the user with MitID.

On Android the parameter is silently ignored: Custom Tab sessions don't share cookies with the browser, and the Android SDK doesn't expose the choice.

## Idura

Learn more about Idura and sign up for your free developer account at [idura.eu](https://www.idura.eu).
