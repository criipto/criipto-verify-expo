import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { StyleSheet, Text, View, Button } from 'react-native';

import {CriiptoVerifyProvider, useCriiptoVerify} from '@criipto/verify-expo';

export default function App() {
  return (
    <CriiptoVerifyProvider
      domain="samples.criipto.id"
      clientID="urn:criipto:samples:criipto-verify-expo"
    >
      <View style={styles.container}>
        <Text>Open up App.js to start working on your app!</Text>
        <StatusBar style="auto" />
        <LoginButton />
      </View>
    </CriiptoVerifyProvider>
  );
}

function LoginButton() {
  const {login, claims, error} = useCriiptoVerify();

  const handlePress = async (acrValues) => {
    const redirectUri = Linking.createURL('/auth/criipto');
    const result = await login(acrValues, redirectUri);
    console.log(result);
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
