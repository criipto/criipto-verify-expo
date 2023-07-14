import React, { useMemo } from 'react';
import CriiptoVerifyContext from './context';

interface CriiptoVerifyProviderOptions {
  domain: string
  clientID: string,
  children: React.ReactNode
}

const CriiptoVerifyProvider = (props: CriiptoVerifyProviderOptions) : JSX.Element => {
  const context = useMemo(() => {
    return {
      async login() {

      }
    }
  }, []);

  return (
    <CriiptoVerifyContext.Provider value={context}>
      {props.children}
    </CriiptoVerifyContext.Provider>
  );
}

export default CriiptoVerifyProvider;