import { useContext, useMemo } from "react";
import CriiptoVerifyContext from "./context";

export default function useCriiptoVerify() {
  const {login} = useContext(CriiptoVerifyContext);

  return useMemo(() => ({
    login
  }), [login]);
}