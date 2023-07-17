# criipto-verify-expo

Accept MitID, NemID, Swedish BankID, Norwegian BankID and more logins in your Expo (React-Native) app with @criipto/verify-expo.

## App switch support

`@criipto/verify-react` supports app switching for Swedish BankID and Danish MitID.

Switchback from the Danish MitID mobile application will only work if you are using a universal link / app link as your redirect_uri.

[Guide to Expo universal links](https://docs.expo.dev/guides/deep-linking/)

### Expo Go + Android + Danish MitID

Danish MitID on Android will not work with Expo Go due to the use of `createTask: false`. You must use a build to test, for instance with `npx expo run:android`

## Installation

Using [npm](https://npmjs.org/)

```sh
npm install @criipto/verify-expo
```

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
npm run build && npm run pack

#in example
npm install ../criipto-verify-expo-1.0.0.tgz
npm start
```

## Criipto

Learn more about Criipto and sign up for your free developer account at [criipto.com](https://www.criipto.com).
