import { useContext, useMemo } from "react";
import CriiptoVerifyContext from "./context";

export default function useCriiptoVerify() {
  const {login, logout, claims, error} = useContext(CriiptoVerifyContext);

  return useMemo(() => ({
    login,
    logout,
    claims,
    error
  }), [login, claims, error]);
}