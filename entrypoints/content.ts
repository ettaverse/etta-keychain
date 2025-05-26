import type { 
  SteemKeychain, 
  RequestCallback, 
  KeyType, 
  KeychainRequest,
  KeychainResponse
} from './interfaces/keychain-api.interface';

const REQUEST_TIMEOUT = 30000; // 30 seconds

class EttaKeychainAPI implements SteemKeychain {
  current_id = 1;
  requests: Record<number, RequestCallback> = {};
  timeouts: Record<number, NodeJS.Timeout> = {};
  handshake_callback: (() => void) | null = null;

  private dispatchCustomEvent(name: string, data: any, callback?: RequestCallback): void {
    const requestId = this.current_id;
    
    if (callback) {
      this.requests[requestId] = callback;
      
      // Add timeout handling
      this.timeouts[requestId] = setTimeout(() => {
        if (this.requests[requestId]) {
          this.requests[requestId]({
            success: false,
            error: 'Request timeout',
            message: 'The request timed out after 30 seconds'
          });
          delete this.requests[requestId];
          delete this.timeouts[requestId];
        }
      }, REQUEST_TIMEOUT);
    }

    const requestData = {
      ...data,
      request_id: requestId
    };

    // Use WXT's browser messaging instead of DOM events
    browser.runtime.sendMessage({
      type: 'keychain_request',
      event: name,
      data: requestData
    }).catch((error: any) => {
      console.error('Failed to send message to background:', error);
      if (callback) {
        callback({
          success: false,
          error: 'Communication error',
          message: 'Failed to communicate with extension background'
        });
        // Clean up on error
        delete this.requests[requestId];
        if (this.timeouts[requestId]) {
          clearTimeout(this.timeouts[requestId]);
          delete this.timeouts[requestId];
        }
      }
    });

    this.current_id++;
  }

  requestHandshake(callback: () => void): void {
    this.handshake_callback = callback;
    this.dispatchCustomEvent('swHandshake', {});
  }

  requestVerifyKey(account: string, message: string, keyType: KeyType, callback: RequestCallback): void {
    const request = {
      type: 'decode',
      username: account,
      message: message,
      method: keyType
    };
    this.dispatchCustomEvent('swRequest', request, callback);
  }

  requestCustomJson(
    account: string | null,
    id: string,
    keyType: KeyType,
    json: string,
    displayName: string,
    callback: RequestCallback,
    rpc?: string
  ): void {
    const request = {
      type: 'custom',
      username: account,
      id: id,
      method: keyType || 'Posting',
      json: json,
      display_msg: displayName,
      rpc
    };
    this.dispatchCustomEvent('swRequest', request, callback);
  }

  requestTransfer(
    account: string,
    to: string,
    amount: string,
    memo: string,
    currency: string,
    callback: RequestCallback,
    enforce?: boolean,
    rpc?: string
  ): void {
    const request = {
      type: 'transfer',
      username: account,
      to,
      amount,
      memo,
      enforce: enforce || false,
      currency,
      rpc
    };
    this.dispatchCustomEvent('swRequest', request, callback);
  }

  requestVote(
    account: string,
    permlink: string,
    author: string,
    weight: number,
    callback: RequestCallback,
    rpc?: string
  ): void {
    const request = {
      type: 'vote',
      username: account,
      permlink,
      author,
      weight,
      rpc
    };
    this.dispatchCustomEvent('swRequest', request, callback);
  }

  requestBroadcast(
    account: string,
    operations: any[],
    keyType: KeyType,
    callback: RequestCallback,
    rpc?: string
  ): void {
    const request = {
      type: 'broadcast',
      username: account,
      operations,
      method: keyType,
      rpc
    };
    this.dispatchCustomEvent('swRequest', request, callback);
  }

  requestSignTx(
    account: string,
    tx: any,
    keyType: KeyType,
    callback: RequestCallback,
    rpc?: string
  ): void {
    const request = {
      type: 'signTx',
      username: account,
      tx,
      method: keyType,
      rpc
    };
    this.dispatchCustomEvent('swRequest', request, callback);
  }

  requestEncodeMessage(
    username: string,
    receiver: string,
    message: string,
    keyType: KeyType,
    callback: RequestCallback
  ): void {
    const request = {
      type: 'encode',
      username,
      receiver,
      message,
      method: keyType
    };
    this.dispatchCustomEvent('swRequest', request, callback);
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    // Create and inject the steem_keychain object
    const ettaKeychain = new EttaKeychainAPI();
    
    // Inject into the page's window object
    window.steem_keychain = ettaKeychain;

    // Listen for responses from background script
    browser.runtime.onMessage.addListener((message: any) => {
      if (message.type === 'keychain_response') {
        const response = message.response;
        if (response && response.request_id) {
          const requestId = response.request_id;
          if (ettaKeychain.requests[requestId]) {
            ettaKeychain.requests[requestId](response);
            delete ettaKeychain.requests[requestId];
            // Clear timeout since we got a response
            if (ettaKeychain.timeouts[requestId]) {
              clearTimeout(ettaKeychain.timeouts[requestId]);
              delete ettaKeychain.timeouts[requestId];
            }
          }
        }
      } else if (message.type === 'keychain_handshake') {
        if (ettaKeychain.handshake_callback) {
          ettaKeychain.handshake_callback();
        }
      }
    });

    console.log('Etta Keychain API injected successfully');
  },
});
