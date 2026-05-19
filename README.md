# criipto-verify-expo

Accept MitID, NemID, Swedish BankID, Norwegian BankID and more logins in your Expo (React-Native) app with @criipto/verify-expo.

## Requirements

- Expo SDK **54 or newer** (ships React Native 0.81 / Kotlin 2.1.20 / AGP 8.11).
- Android `minSdkVersion` **26 or newer**. Expo's prebuild default is 24, so you must opt in explicitly via [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/) — see [Installation](#installation).
- iOS **17.4 or newer**, with `use_frameworks! :linkage => :dynamic`. The Idura Verify iOS SDK is distributed as a Swift Package; the Podspec links it via React Native's `spm_dependency` helper, which requires dynamic framework linkage. The Expo plugin verifies both via `expo-build-properties`.

Both platforms delegate to the native Idura Verify SDKs ([Android](https://github.com/criipto/idura-verify-android), [iOS](https://github.com/criipto/idura-verify-ios)). Consumers on older Expo releases should stay on `@criipto/verify-expo` 3.x.

## App switch support

`@criipto/verify-expo` supports app switching for Swedish BankID and Danish MitID on both platforms; the native SDKs own the app-switch dance — there is no extra configuration in JavaScript.

### Android

Switchback is handled via a universal link at `https://{YOUR_CRIIPTO_DOMAIN}/android/callback`. The Expo plugin wires up the intent filter and the SDK takes care of the rest.

### iOS

Switchback is handled via a universal link at `https://{YOUR_CRIIPTO_DOMAIN}/ios/callback`. The plugin adds `webcredentials:{domain}` and `applinks:{domain}` to your `.entitlements` file. Your Criipto domain must serve a matching `apple-app-site-association` file — if you use a `*.criipto.id` or `*.idura.broker` domain this is handled for you, otherwise see the [Idura Verify iOS SDK docs](https://github.com/criipto/idura-verify-ios#using-a-custom-callback-domain).

#### Expo Go

Danish MitID on iOS and Android will not work with Expo Go. You must use a build, for instance `npx expo run:ios` / `npx expo run:android` or EAS Build.

## Installation

Using [npm](https://npmjs.org/)

```sh
npm install @criipto/verify-expo expo-build-properties
```

Then configure both plugins in `app.json`. `expo-build-properties` must appear **before** `@criipto/verify-expo` so its overrides are applied first:

```json
"plugins": [
  ["expo-build-properties", {
    "android": { "minSdkVersion": 26 },
    "ios": { "useFrameworks": "dynamic", "deploymentTarget": "17.4" }
  }],
  ["@criipto/verify-expo", {
    "domain": "YOUR_CRIIPTO_DOMAIN",
    "clientID": "urn:my:application:identifier:XXXX"
  }]
]
```

The plugin fails `expo prebuild` with copy-paste-friendly errors if any of these requirements are unmet.

## Getting Started

Wrap your application in `CriiptoVerifyProvider`:

```jsx
// src/App.jsx
import { View, Button, Text } from 'react-native';
import { CriiptoVerifyProvider, useCriiptoVerify } from '@criipto/verify-expo';

import LoginButton from './LoginButton.jsx';

export default function App() {
  return (
    <CriiptoVerifyProvider
      domain="{YOUR_CRIIPTO_DOMAIN}"
      clientID="{YOUR_CRIIPTO_APPLICATION_CLIENT_ID}"
    >
      <View>
        <LoginButton />
      </View>
    </CriiptoVerifyProvider>
  );
}

// src/LoginButton.jsx
export default function LoginButton() {
  const { login, claims, error } = useCriiptoVerify();

  const handlePress = async (acrValues) => {
    // The `redirectUri` argument is ignored: the native SDKs use
    // https://{domain}/{platform}/callback, wired up by the Expo plugin.
    const result = await login(acrValues, '');
  };

  return (
    <>
      <Button onPress={() => handlePress('urn:grn:authn:dk:mitid:substantial')} title="Login with Danish MitID" />
      <Button onPress={() => handlePress('urn:grn:authn:se:bankid:same-device')} title="Login with Swedish BankID" />
      <Button onPress={() => handlePress('urn:grn:authn:fi:bank-id')} title="Login with Finnish BankID" />
      <Button onPress={() => handlePress('urn:grn:authn:no:bankid:substantial')} title="Login with Norwegian BankID" />

      {error ? (
        <Text>An error occurred: {error.toString()}</Text>
      ) : null}

      {claims ? (
        <Text>{JSON.stringify(claims, null, 2)}</Text>
      ) : null}
    </>
  )
}
```

## Local development

```sh
#in root
npm link

#in example
npm link @criipto/verify-expo
npm start
```

## Criipto

Learn more about Criipto and sign up for your free developer account at [criipto.com](https://www.criipto.com).
