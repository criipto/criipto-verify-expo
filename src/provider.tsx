import React, { useCallback, useMemo, useState, ReactElement } from "react";
import jwtDecode from "jwt-decode";

import CriiptoVerifyContext, {
  CriiptoVerifyContextInterface,
  OAuth2Error,
  Claims,
} from "./context";

import * as CriiptoVerifyExpoModule from "./CriiptoVerifyExpoModule";

interface CriiptoVerifyProviderOptions {
  children: React.ReactNode;
}

const CriiptoVerifyProvider = (props: CriiptoVerifyProviderOptions): ReactElement => {
  const [error, setError] = useState<OAuth2Error | Error | null>(null);
  const [claims, setClaims] = useState<Claims | null>(null);

  const login: CriiptoVerifyContextInterface["login"] = useCallback(async (acrValues, params) => {
    const { id_token } = await CriiptoVerifyExpoModule.login({
      acrValues,
      ...params,
      loginHint: params?.login_hint,
    });
    return {
      id_token,
      claims: jwtDecode<Claims>(id_token),
    };
  }, []);

  const context = useMemo<CriiptoVerifyContextInterface>(() => {
    return {
      login: async (...args) => {
        return login(...args)
          .then((result) => {
            if ("claims" in result) {
              setError(null);
              setClaims(result.claims);
            }
            if (result instanceof Error) {
              setError(result);
              setClaims(null);
            }
            return result;
          })
          .catch((error) => {
            setError(error);
            setClaims(null);
            throw error;
          });
      },
      logout: async () => {
        setClaims(null);
        setError(null);
      },
      claims,
      error,
    };
  }, [login, claims, error]);

  return (
    <CriiptoVerifyContext.Provider value={context}>{props.children}</CriiptoVerifyContext.Provider>
  );
};

export default CriiptoVerifyProvider;
