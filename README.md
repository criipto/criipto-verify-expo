# criipto-verify-expo

Accept MitID, NemID, Swedish BankID, Norwegian BankID and more logins in your Expo (React-Native) app with @criipto/verify-expo.

## Requirements

- Expo SDK **54 or newer** (ships React Native 0.81 / Kotlin 2.1.20 / AGP 8.11).
- Android `minSdkVersion` **29 or newer**. Expo's prebuild default is 24, so you must opt in explicitly via [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/) — see [Installation](#installation).
- iOS 13 or newer.

The Android implementation delegates to the native [Idura Verify Android SDK](https://github.com/criipto/idura-verify-android), which has these floor requirements. Consumers on older Expo releases should stay on `@criipto/verify-expo` 3.x.

## App switch support

`@criipto/verify-expo` supports app switching for Swedish BankID and Danish MitID.

### Danish MitID + Android

Switchback is handled natively by the Idura Verify Android SDK using a universal link at `https://{YOUR_CRIIPTO_DOMAIN}/android/callback`. No extra configuration is needed — the Expo plugin wires up the intent filter and the SDK takes care of the app-switch dance.

#### Expo Go

Danish MitID on Android will not work with Expo Go. You must use a build, for instance `npx expo run:android` or EAS Build.

## Installation

Using [npm](https://npmjs.org/)

```sh
npm install @criipto/verify-expo expo-build-properties
```

Then configure both plugins in `app.json`. `expo-build-properties` must appear **before** `@criipto/verify-expo` so the minSdk override is applied first:

```json
"plugins": [
  ["expo-build-properties", {
    "android": { "minSdkVersion": 29 }
  }],
  ["@criipto/verify-expo", {
    "domain": "YOUR_CRIIPTO_DOMAIN",
    "clientID": "urn:my:application:identifier:XXXX"
  }]
]
```

The plugin fails `expo prebuild` with a clear error if `expo-build-properties` is missing or sets a lower `minSdkVersion` — there is no way to use the Android SDK below API 29.

## Getting Started

Setup the Criipto Verify SDK by wrapping your application in `CriiptoVerifyProvider`:

```jsx
// src/App.jsx
import { StyleSheet, Text, View, Button } from 'react-native';
import {CriiptoVerifyProvider, useCriiptoVerify} from '@criipto/verify-expo';

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
  const {login, claims, error} = useCriiptoVerify();

  const handlePress = async (acrValues) => {
    // The generated redirectUri must be registered as an allowed URL on your application via the Criipto Dashboard.
    // Use a https:// universal/app link if you wish to support appswitch with Danish MitID
    const redirectUri = Linking.createURL('/auth/criipto');
    const result = await login(acrValues, redirectUri);
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
