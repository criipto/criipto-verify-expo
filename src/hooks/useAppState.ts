import React, { useRef, useState, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

export default function useAppState(onForeground?: () => void, deps: React.DependencyList = []) {
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", _handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, deps);

  const _handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      if (onForeground) onForeground();
    }

    appState.current = nextAppState;
    setAppStateVisible(appState.current);
  };

  return appStateVisible;
}
