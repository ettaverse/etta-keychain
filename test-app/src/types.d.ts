// Type definitions for the test app
declare global {
  interface Window {
    steem_keychain?: {
      version?: string;
      requestHandshake: (callback: (response: any) => void) => void;
      requestVerifyKey: (username: string, message: string, keyType: string, callback: (response: any) => void) => void;
      requestSignBuffer: (username: string, message: string, keyType: string, callback: (response: any) => void) => void;
      requestTransfer: (username: string, to: string, amount: string, memo: string, currency: string, callback: (response: any) => void) => void;
      requestVote: (username: string, permlink: string, author: string, weight: number, callback: (response: any) => void) => void;
      requestPost: (username: string, title: string, body: string, parentPermlink: string, tags: string[], callback: (response: any) => void) => void;
      requestWitnessVote: (username: string, witness: string, approve: boolean, callback: (response: any) => void) => void;
      requestPowerUp: (username: string, to: string, amount: string, callback: (response: any) => void) => void;
      requestCustomJson: (username: string, id: string, keyType: string, json: string, displayName: string, callback: (response: any) => void) => void;
      // Asset operation methods
      requestAssetCreate?: (
        account: string,
        assetRequest: any,
        callback: (response: any) => void,
        displayMsg?: string,
        rpc?: string
      ) => void;
      requestAssetTransfer?: (
        account: string,
        universalId: string,
        toUser: string,
        transferType: string,
        callback: (response: any) => void,
        options?: any,
        rpc?: string
      ) => void;
      requestAssetConversion?: (
        account: string,
        universalId: string,
        fromGame: string,
        toGame: string,
        callback: (response: any) => void,
        conversionOptions?: any,
        displayMsg?: string,
        rpc?: string
      ) => void;
    };
  }
}

export {};