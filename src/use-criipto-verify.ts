import { useContext, useMemo } from "react";
import CriiptoVerifyContext from "./context";

export default function useCriiptoVerify() {
  const {login, claims, error} = useContext(CriiptoVerifyContext);

  return useMemo(() => ({
    login,
    claims,
    error
  }), [login, claims, error]);
}