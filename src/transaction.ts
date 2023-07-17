import { Platform } from 'react-native';


export interface Transaction {
  redirectUri: string
  onForeground(): void | Promise<void>
  onUrl(url: string): void | Promise<void>
}


export class SwedishBankIDTransaction implements Transaction {
  redirectUri: string
  onComplete: () => void
  onCancel: () => void

  constructor(redirectUri: string, onComplete: () => void, onCancel: () => void) {
    this.redirectUri = redirectUri;
    this.onComplete = onComplete;
    this.onCancel = onCancel;
  }

  onForeground() {
    if (Platform.OS === 'android') {
      this.onComplete();
    } else {
      this.onCancel();
    }
  }

  onUrl(url: string) {
    if (isRedirectURI(url, this.redirectUri)) {
      this.onComplete();
    }
  }
}

export class DanishMitIDTransaction implements Transaction {
  redirectUri: string
  resumeUrl: string  | null
  onComplete: (url: string) => void

  constructor(
    redirectUri: string,
    resumeUrl: string | null,
    onComplete: (url: string) => void
  ) {
    this.redirectUri = redirectUri;
    this.resumeUrl = resumeUrl;
    this.onComplete = onComplete;
  }

  onForeground() {

  }

  onUrl(url: string) {
    if (isRedirectURI(url, this.redirectUri)) {
      if (url.includes('code=') || url.includes('error=')) {
        this.onComplete(url);
      }
    }
  }
}

function isRedirectURI(url: string | URL, redirectUri: string | URL) {
  if (!(url instanceof URL)) url = new URL(url);
  if (!(redirectUri instanceof URL)) redirectUri = new URL(redirectUri);

  return url.protocol === redirectUri.protocol && url.origin === redirectUri.origin && url.pathname === redirectUri.pathname;
}