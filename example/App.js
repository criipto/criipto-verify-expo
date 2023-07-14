import { StatusBar } from 'expo-status-bar';
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
  const {login} = useCriiptoVerify();

  const handlePress = () => {
    login();
  };

  return (
    <Button onPress={handlePress} title="Login" />
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
