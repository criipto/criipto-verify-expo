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
    if (url.startsWith(this.redirectUri)) {
      this.onComplete();
    }
  }
}

export class DanishMitIDTransaction implements Transaction {
  redirectUri: string
  onComplete: () => void

  constructor(redirectUri: string, onComplete: () => void) {
    this.redirectUri = redirectUri;
    this.onComplete = onComplete;
  }

  onForeground() {
  }

  onUrl(url: string) {
    if (url.startsWith(this.redirectUri)) {
      console.log(url);
    }
  }
}