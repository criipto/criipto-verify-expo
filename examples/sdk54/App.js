import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { StyleSheet, Text, View, Button } from "react-native";

import { CriiptoVerifyProvider, useCriiptoVerify } from "@criipto/verify-expo";

export default function App() {
  return (
    <CriiptoVerifyProvider
      domain="samples.criipto.id"
      clientID="urn:criipto:samples:criipto-verify-expo"
    >
      <View style={styles.container}>
        <Text>CI fixture — SDK 54</Text>
        <StatusBar style="auto" />
        <LoginButton />
      </View>
    </CriiptoVerifyProvider>
  );
}

function LoginButton() {
  const { login } = useCriiptoVerify();
  const handlePress = async (acrValues) => {
    const redirectUri = Linking.createURL("/auth/criipto");
    await login(acrValues, redirectUri);
  };
  return (
    <Button
      onPress={() => handlePress("urn:grn:authn:dk:mitid:substantial")}
      title="Login with Danish MitID"
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
});
