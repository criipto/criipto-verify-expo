import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Button } from "react-native";

import { login } from "@criipto/verify-expo";

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <StatusBar style="auto" />
      <LoginButton />
    </View>
  );
}

function LoginButton() {
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState(null);

  const handlePress = async (acrValues) => {
    try {
      const result = await login({ acrValues, prompt: "login" });
      console.log(result);
      setClaims(result.claims);
      setError(null);
    } catch (e) {
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
      <Button
        onPress={() => handlePress("urn:grn:authn:fi:bank-id")}
        title="Login with Finnish BankID"
      />
      <Button
        onPress={() => handlePress("urn:grn:authn:no:bankid:substantial")}
        title="Login with Norwegian BankID"
      />
      <Button
        onPress={() => handlePress("urn:grn:authn:no:vipps")}
        title="Login with Vipps MobilePay"
      />
      <Button onPress={() => handlePress("urn:grn:authn:mock")} title="Login with Mock" />

      {error ? <Text>An error occurred: {error.toString()}</Text> : null}

      {claims ? <Text>{JSON.stringify(claims, null, 2)}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
