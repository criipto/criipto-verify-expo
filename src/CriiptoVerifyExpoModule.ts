import { requireNativeModule } from 'expo-modules-core';

export async function start(params: {
  authorizeUrl: string;
  redirectUri: string;
}): Promise<string | null> {
  // It loads the native module object from the JSI or falls back to
  // the bridge module (from NativeModulesProxy) if the remote debugger is on.
  const module = requireNativeModule('CriiptoVerifyExpo');
  const response = await module.startAsync(params);
  return response;
}
