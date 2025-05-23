export default class Logger {
  private static isDev = import.meta.env.DEV;

  static log(...args: any[]) {
    if (this.isDev) {
      console.log('[Etta Keychain]', ...args);
    }
  }

  static info(...args: any[]) {
    if (this.isDev) {
      console.info('[Etta Keychain]', ...args);
    }
  }

  static warn(...args: any[]) {
    if (this.isDev) {
      console.warn('[Etta Keychain]', ...args);
    }
  }

  static error(...args: any[]) {
    console.error('[Etta Keychain]', ...args);
  }
}