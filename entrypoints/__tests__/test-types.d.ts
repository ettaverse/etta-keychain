// Test environment type declarations

declare global {
  var browser: any;
  var defineContentScript: any;
  
  namespace NodeJS {
    interface Global {
      browser: any;
      defineContentScript: any;
    }
  }
}

export {};