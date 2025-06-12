export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    // Inject immediately before any other scripts run
    if (document.readyState === 'loading') {
      console.log('Injecting keychain early during document loading');
    }
    
    console.log('Current document state:', document.readyState);
    console.log('URL:', window.location.href);
    // This script gets injected into the page's main world
    const REQUEST_TIMEOUT = 30000;

    class EttaKeychainAPI {
      current_id = 1;
      requests: Record<number, any> = {};
      timeouts: Record<number, any> = {};
      handshake_callback: ((response: any) => void) | null = null;
      
      // Properties that dApps might check
      isConnected = true;
      hasAccounts = true;
      isInstalled = true;
      version = '1.0.0';
      name = 'Etta Keychain';
      
      // Add accounts property that some dApps check
      accounts = ['testuser', 'demouser'];
      
      // Add a method to check if accounts are available
      hasKeychain = true;
      available = true;

      dispatchCustomEvent(name: string, data: any, callback?: any): void {
        console.log('🔍 Keychain method called:', name, 'with data:', data);
        const requestId = this.current_id;
        
        if (callback) {
          this.requests[requestId] = callback;
          console.log('📝 Callback registered for request:', requestId);
          
          this.timeouts[requestId] = setTimeout(() => {
            if (this.requests[requestId]) {
              console.log('⏰ Request timed out:', requestId);
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

        console.log('📤 Sending to background:', {
          type: 'keychain_request_from_page',
          event: name,
          data: requestData
        });

        // Send message to content script via window events
        window.postMessage({
          type: 'keychain_request_from_page',
          event: name,
          data: requestData
        }, '*');

        this.current_id++;
      }

      requestHandshake(callback: (response: any) => void): void {
        console.log('Handshake requested from page');
        this.handshake_callback = callback;
        this.dispatchCustomEvent('swHandshake', {});
      }

      requestVerifyKey(account: string, message: string, keyType: string, callback: any): void {
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
        keyType: string,
        json: string,
        displayName: string,
        callback: any,
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
        callback: any,
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
        callback: any,
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
        keyType: string,
        callback: any,
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
        keyType: string,
        callback: any,
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
        keyType: string,
        callback: any
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

      // Additional methods that might be expected
      requestSignBuffer(
        account: string,
        message: string,
        keyType: string,
        callback: any
      ): void {
        const request = {
          type: 'signBuffer',
          username: account,
          message,
          method: keyType
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestAddAccountAuthority(
        account: string,
        authorizedAccount: string,
        role: string,
        weight: number,
        callback: any
      ): void {
        const request = {
          type: 'addAccountAuthority',
          username: account,
          authorized_account: authorizedAccount,
          role,
          weight
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestAddKeyAuthority(
        account: string,
        key: string,
        role: string,
        weight: number,
        callback: any
      ): void {
        const request = {
          type: 'addKeyAuthority',
          username: account,
          key,
          role,
          weight
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestRemoveAccountAuthority(
        account: string,
        authorizedAccount: string,
        role: string,
        callback: any
      ): void {
        const request = {
          type: 'removeAccountAuthority',
          username: account,
          authorized_account: authorizedAccount,
          role
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      // Methods that steemitwallet might use for login/account management
      requestLogin(callback: any): void {
        console.log('🔐 Login requested');
        this.dispatchCustomEvent('swLogin', {}, callback);
      }

      requestAccounts(callback: any): void {
        console.log('👥 Accounts requested');
        this.dispatchCustomEvent('swAccounts', {}, callback);
      }

      requestGetAccount(account: string, callback: any): void {
        console.log('👤 Get account requested:', account);
        const request = {
          type: 'getAccount',
          username: account
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestGetKeys(account: string, keyType: string, callback: any): void {
        console.log('🔑 Get keys requested:', account, keyType);
        const request = {
          type: 'getKeys',
          username: account,
          method: keyType
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      // Legacy method names that might be used
      login(callback: any): void {
        console.log('🔐 Legacy login called');
        this.requestLogin(callback);
      }

      getAccounts(callback: any): void {
        console.log('👥 Legacy getAccounts called');
        this.requestAccounts(callback);
      }

      // Method that steemitwallet might call to check account availability
      checkAccounts(): string[] {
        console.log('🔍 checkAccounts called');
        return this.accounts;
      }

      // Method to check if keychain is ready
      isReady(): boolean {
        console.log('✅ isReady called');
        return this.isConnected && this.hasAccounts;
      }

      // Additional methods from official Steem Keychain API
      requestAddAccount(account: string, keys: any, callback: any): void {
        const request = {
          type: 'addAccount',
          username: account,
          keys
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestCreateClaimedAccount(account: string, creator: string, callback: any): void {
        const request = {
          type: 'createClaimedAccount',
          username: account,
          creator
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestDelegation(account: string, delegatee: string, amount: string, callback: any): void {
        const request = {
          type: 'delegation',
          username: account,
          delegatee,
          amount
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestConversion(account: string, amount: string, callback: any): void {
        const request = {
          type: 'conversion',
          username: account,
          amount
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestPost(account: string, title: string, body: string, parentAuthor: string, parentPermlink: string, jsonMetadata: string, permlink: string, callback: any): void {
        const request = {
          type: 'post',
          username: account,
          title,
          body,
          parent_author: parentAuthor,
          parent_perm: parentPermlink,
          json_metadata: jsonMetadata,
          permlink
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestPowerDown(account: string, amount: string, callback: any): void {
        const request = {
          type: 'powerDown',
          username: account,
          amount
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestPowerUp(account: string, to: string, amount: string, callback: any): void {
        const request = {
          type: 'powerUp',
          username: account,
          to,
          amount
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestProxy(account: string, proxy: string, callback: any): void {
        const request = {
          type: 'proxy',
          username: account,
          proxy
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }


      requestRemoveKeyAuthority(account: string, key: string, role: string, callback: any): void {
        const request = {
          type: 'removeKeyAuthority',
          username: account,
          key,
          role
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestRemoveProposal(account: string, proposalId: string, callback: any): void {
        const request = {
          type: 'removeProposal',
          username: account,
          proposal_id: proposalId
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestSendToken(account: string, to: string, amount: string, symbol: string, memo: string, callback: any): void {
        const request = {
          type: 'sendToken',
          username: account,
          to,
          amount,
          symbol,
          memo
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestSignedCall(account: string, method: string, params: any, keyType: string, callback: any): void {
        const request = {
          type: 'signedCall',
          username: account,
          method,
          params,
          key_type: keyType
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestSwap(account: string, fromToken: string, toToken: string, amount: string, callback: any): void {
        const request = {
          type: 'swap',
          username: account,
          from_token: fromToken,
          to_token: toToken,
          amount
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestUpdateProposalVote(account: string, proposalId: string, approve: boolean, callback: any): void {
        const request = {
          type: 'updateProposalVote',
          username: account,
          proposal_id: proposalId,
          approve
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestWitnessVote(account: string, witness: string, approve: boolean, callback: any): void {
        const request = {
          type: 'witnessVote',
          username: account,
          witness,
          approve
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

      requestEncodeWithKeys(account: string, receiver: string, message: string, keyType: string, callback: any): void {
        const request = {
          type: 'encodeWithKeys',
          username: account,
          receiver,
          message,
          method: keyType
        };
        this.dispatchCustomEvent('swRequest', request, callback);
      }

    }

    // Create and expose the API
    const ettaKeychain = new EttaKeychainAPI();
    (window as any).steem_keychain = ettaKeychain;
    
    // Also set it in alternative locations that some dApps might check
    (window as any).steemKeychain = ettaKeychain;
    (window as any).keychain = ettaKeychain;

    // Listen for responses from content script
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'keychain_response_to_page') {
        const response = event.data.response;
        console.log('📨 Received response from background:', response);
        if (response && response.request_id) {
          const requestId = response.request_id;
          const keychain = (window as any).steem_keychain;
          if (keychain.requests[requestId]) {
            console.log('✅ Calling callback for request:', requestId, 'with response:', response);
            keychain.requests[requestId](response);
            delete keychain.requests[requestId];
            if (keychain.timeouts[requestId]) {
              clearTimeout(keychain.timeouts[requestId]);
              delete keychain.timeouts[requestId];
            }
          } else {
            console.log('❌ No callback found for request:', requestId);
          }
        }
      } else if (event.data.type === 'keychain_handshake_to_page') {
        console.log('🤝 Handshake response received from content script');
        const keychain = (window as any).steem_keychain;
        if (keychain.handshake_callback) {
          console.log('✅ Calling handshake callback with response:', event.data.response);
          keychain.handshake_callback(event.data.response);
        } else {
          console.log('❌ No handshake callback found');
        }
      }
    });

    console.log('Etta Keychain API injected successfully into main world');
    
    // Set all flags that dApps check (matching original Steem Keychain)
    (window as any).steemKeychain = true;
    (window as any).steem_keychain_extension = {
      version: '1.0.0',
      name: 'Etta Keychain',
      available: true
    };
    
    // Set additional detection flags
    (window as any).steem_keychain_available = true;
    (window as any).keychainAvailable = true;
    
    // Dispatch events immediately (no delay)
    window.dispatchEvent(new CustomEvent('steemKeychainLoaded', {
      detail: { 
        loaded: true,
        extension: 'etta-keychain' 
      }
    }));
    
    window.dispatchEvent(new CustomEvent('keychainLoaded'));
    window.dispatchEvent(new CustomEvent('steemKeychainAvailable'));
    window.dispatchEvent(new CustomEvent('keychain-loaded'));
    
    // Also dispatch with a slight delay for dApps that listen after initialization
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('steemKeychainLoaded', {
        detail: { 
          loaded: true,
          extension: 'etta-keychain' 
        }
      }));
      
      // Also dispatch the legacy event name some dApps might listen for
      window.dispatchEvent(new CustomEvent('keychainLoaded'));
      
      // Dispatch additional events that might be expected
      window.dispatchEvent(new CustomEvent('steemKeychainAvailable'));
      window.dispatchEvent(new CustomEvent('keychain-loaded'));
      
      // Try automatic handshake to trigger detection
      const keychain = (window as any).steem_keychain;
      if (keychain && keychain.requestHandshake) {
        keychain.requestHandshake(() => {
          console.log('Auto-handshake completed for dApp detection');
          
          // Dispatch post-handshake events
          window.dispatchEvent(new CustomEvent('steemKeychainReady'));
          window.dispatchEvent(new CustomEvent('keychain-ready'));
        });
      }
    }, 100);
    
    // Enhanced debugging for steemitwallet - intercept all method calls
    if (window.location.hostname.includes('steemitwallet')) {
      console.log('🔍 Setting up enhanced steemitwallet debugging');
      
      // Intercept all property access on the keychain API
      const originalKeychain = ettaKeychain;
      const interceptedKeychain = new Proxy(originalKeychain, {
        get(target: any, prop: string | symbol) {
          const value = target[prop];
          
          // Log any property access that might indicate login attempts
          if (typeof prop === 'string' && prop.startsWith('request')) {
            console.log('🎯 Steemitwallet accessing method:', prop);
          }
          
          // If it's a function, wrap it to log calls
          if (typeof value === 'function') {
            return function(...args: any[]) {
              console.log('📞 Steemitwallet calling:', prop, 'with args:', args);
              return value.apply(target, args);
            };
          }
          
          return value;
        }
      });
      
      // Replace the global keychain with our intercepted version
      (window as any).steem_keychain = interceptedKeychain;
      (window as any).steemKeychain = interceptedKeychain;
      (window as any).keychain = interceptedKeychain;
      
      // Add mutation observer to detect when steemitwallet's scripts are loaded
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'SCRIPT' || 
                  element.querySelector?.('script') ||
                  element.textContent?.includes('keychain') ||
                  element.textContent?.includes('steem_keychain')) {
                
                console.log('Steemitwallet script detected, re-announcing keychain');
                
                // Re-announce keychain availability
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('steemKeychainLoaded'));
                  window.dispatchEvent(new CustomEvent('keychainLoaded'));
                  
                  // Force set all detection flags again
                  (window as any).steemKeychain = interceptedKeychain;
                  (window as any).steem_keychain = interceptedKeychain;
                  (window as any).keychain = interceptedKeychain;
                  (window as any).steem_keychain_available = true;
                  (window as any).keychainAvailable = true;
                  
                  console.log('Keychain re-announced for steemitwallet');
                }, 50);
              }
            }
          });
        });
      });
      
      observer.observe(document, {
        childList: true,
        subtree: true
      });
      
      // Stop observing after 10 seconds to avoid performance issues
      setTimeout(() => observer.disconnect(), 10000);
      
      // Monitor DOM events that might indicate login button interactions
      document.addEventListener('click', (event) => {
        const target = event.target as Element;
        if (target && (target.textContent?.toLowerCase().includes('login') || 
                      target.textContent?.toLowerCase().includes('keychain') ||
                      target.classList?.toString().includes('login'))) {
          console.log('🖱️ Login-related click detected:', target.textContent, target.className);
          
          // Check if keychain is still properly set after a short delay
          setTimeout(() => {
            console.log('🔍 Post-click keychain status:');
            console.log('- window.steem_keychain:', !!(window as any).steem_keychain);
            console.log('- window.steemKeychain:', !!(window as any).steemKeychain);
            console.log('- window.steem_keychain_available:', !!(window as any).steem_keychain_available);
          }, 100);
        }
      }, true);
    }
  }
});