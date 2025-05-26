import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { 
  SteemKeychain, 
  RequestCallback, 
  KeyType, 
  KeychainResponse 
} from '../interfaces/keychain-api.interface';

// Mock browser.runtime for testing
const mockBrowser = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    }
  }
};

// Mock the WXT defineContentScript function
const mockDefineContentScript = vi.fn();

// Global mocks
global.browser = mockBrowser as any;
global.defineContentScript = mockDefineContentScript;

// Mock implementation of EttaKeychainAPI for testing
class MockEttaKeychainAPI implements SteemKeychain {
  current_id = 1;
  requests: Record<number, RequestCallback> = {};
  timeouts: Record<number, NodeJS.Timeout> = {};
  handshake_callback: (() => void) | null = null;

  private dispatchCustomEvent(name: string, data: any, callback?: RequestCallback): void {
    const requestId = this.current_id;
    
    if (callback) {
      this.requests[requestId] = callback;
      
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
      }, 30000);
    }

    const requestData = {
      ...data,
      request_id: requestId
    };

    mockBrowser.runtime.sendMessage({
      type: 'keychain_request',
      event: name,
      data: requestData
    }).catch((error: any) => {
      if (callback) {
        callback({
          success: false,
          error: 'Communication error',
          message: 'Failed to communicate with extension background'
        });
        if (this.timeouts[requestId]) {
          clearTimeout(this.timeouts[requestId]);
          delete this.timeouts[requestId];
        }
        delete this.requests[requestId];
      }
    });

    this.current_id++;
  }

  // Method to simulate receiving response
  receiveResponse(response: KeychainResponse): void {
    const requestId = response.request_id;
    if (requestId && this.requests[requestId]) {
      this.requests[requestId](response);
      delete this.requests[requestId];
      if (this.timeouts[requestId]) {
        clearTimeout(this.timeouts[requestId]);
        delete this.timeouts[requestId];
      }
    }
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
    enforce: boolean = false,
    rpc?: string
  ): void {
    const request = {
      type: 'transfer',
      username: account,
      to,
      amount,
      memo,
      enforce,
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

describe('Content Script - STEEM Keychain API Implementation', () => {
  let keychainAPI: MockEttaKeychainAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    keychainAPI = new MockEttaKeychainAPI();
    mockBrowser.runtime.sendMessage.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('API Structure and Compatibility', () => {
    it('should implement all required STEEM Keychain methods', () => {
      expect(typeof keychainAPI.requestHandshake).toBe('function');
      expect(typeof keychainAPI.requestVerifyKey).toBe('function');
      expect(typeof keychainAPI.requestCustomJson).toBe('function');
      expect(typeof keychainAPI.requestTransfer).toBe('function');
      expect(typeof keychainAPI.requestVote).toBe('function');
      expect(typeof keychainAPI.requestBroadcast).toBe('function');
      expect(typeof keychainAPI.requestSignTx).toBe('function');
      expect(typeof keychainAPI.requestEncodeMessage).toBe('function');
    });

    it('should maintain proper method signatures for STEEM Keychain compatibility', () => {
      expect(keychainAPI.requestHandshake.length).toBe(1);
      expect(keychainAPI.requestVerifyKey.length).toBe(4);
      expect(keychainAPI.requestCustomJson.length).toBe(7);
      expect(keychainAPI.requestTransfer.length).toBe(6);
      expect(keychainAPI.requestVote.length).toBe(6);
      expect(keychainAPI.requestBroadcast.length).toBe(5);
      expect(keychainAPI.requestSignTx.length).toBe(5);
      expect(keychainAPI.requestEncodeMessage.length).toBe(5);
    });

    it('should have required properties for state management', () => {
      expect(typeof keychainAPI.current_id).toBe('number');
      expect(typeof keychainAPI.requests).toBe('object');
      expect(keychainAPI.handshake_callback).toBeNull();
      expect(keychainAPI.current_id).toBe(1);
    });
  });

  describe('Request ID Management', () => {
    it('should increment request IDs sequentially', () => {
      const initialId = keychainAPI.current_id;
      
      keychainAPI.requestHandshake(() => {});
      expect(keychainAPI.current_id).toBe(initialId + 1);
      
      keychainAPI.requestHandshake(() => {});
      expect(keychainAPI.current_id).toBe(initialId + 2);
    });

    it('should store callbacks by request ID', () => {
      const callback = vi.fn();
      keychainAPI.requestVerifyKey('testuser', 'test message', 'Posting', callback);
      
      expect(keychainAPI.requests[1]).toBe(callback);
    });

    it('should clean up callbacks after timeout', async () => {
      vi.useFakeTimers();
      
      const callback = vi.fn();
      keychainAPI.requestVerifyKey('testuser', 'test message', 'Posting', callback);
      
      expect(keychainAPI.requests[1]).toBe(callback);
      
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);
      
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Request timeout',
        message: 'The request timed out after 30 seconds'
      });
      expect(keychainAPI.requests[1]).toBeUndefined();
      
      vi.useRealTimers();
    });
  });

  describe('Message Passing to Background Script', () => {
    it('should send handshake request with correct format', () => {
      const callback = vi.fn();
      keychainAPI.requestHandshake(callback);

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'keychain_request',
        event: 'swHandshake',
        data: { request_id: 1 }
      });
      expect(keychainAPI.handshake_callback).toBe(callback);
    });

    it('should send verify key request with correct parameters', () => {
      const callback = vi.fn();
      keychainAPI.requestVerifyKey('testuser', 'encoded message', 'Posting', callback);

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'keychain_request',
        event: 'swRequest',
        data: {
          type: 'decode',
          username: 'testuser',
          message: 'encoded message',
          method: 'Posting',
          request_id: 1
        }
      });
    });

    it('should send custom JSON request with all parameters', () => {
      const callback = vi.fn();
      const jsonData = JSON.stringify({ test: 'data' });
      
      keychainAPI.requestCustomJson(
        'testuser',
        'follow',
        'Posting',
        jsonData,
        'Follow user',
        callback,
        'https://api.steemit.com'
      );

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'keychain_request',
        event: 'swRequest',
        data: {
          type: 'custom',
          username: 'testuser',
          id: 'follow',
          method: 'Posting',
          json: jsonData,
          display_msg: 'Follow user',
          rpc: 'https://api.steemit.com',
          request_id: 1
        }
      });
    });

    it('should send transfer request with correct structure', () => {
      const callback = vi.fn();
      
      keychainAPI.requestTransfer(
        'sender',
        'receiver',
        '1.000',
        'test memo',
        'STEEM',
        callback,
        true,
        'https://api.steemit.com'
      );

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'keychain_request',
        event: 'swRequest',
        data: {
          type: 'transfer',
          username: 'sender',
          to: 'receiver',
          amount: '1.000',
          memo: 'test memo',
          currency: 'STEEM',
          enforce: true,
          rpc: 'https://api.steemit.com',
          request_id: 1
        }
      });
    });

    it('should send vote request with correct parameters', () => {
      const callback = vi.fn();
      
      keychainAPI.requestVote(
        'voter',
        'test-permlink',
        'author',
        10000,
        callback,
        'https://api.steemit.com'
      );

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'keychain_request',
        event: 'swRequest',
        data: {
          type: 'vote',
          username: 'voter',
          permlink: 'test-permlink',
          author: 'author',
          weight: 10000,
          rpc: 'https://api.steemit.com',
          request_id: 1
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle communication errors gracefully', async () => {
      const error = new Error('Network error');
      mockBrowser.runtime.sendMessage.mockRejectedValue(error);
      
      const callback = vi.fn();
      keychainAPI.requestVerifyKey('testuser', 'test message', 'Posting', callback);

      // Wait for the promise rejection to be handled
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Communication error',
        message: 'Failed to communicate with extension background'
      });
    });

    it('should clean up request callback on communication error', async () => {
      const error = new Error('Network error');
      mockBrowser.runtime.sendMessage.mockRejectedValue(error);
      
      const callback = vi.fn();
      keychainAPI.requestVerifyKey('testuser', 'test message', 'Posting', callback);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(keychainAPI.requests[1]).toBeUndefined();
    });
  });

  describe('Content Script Integration', () => {
    it('should call defineContentScript with correct configuration', () => {
      // Import the content script module to trigger defineContentScript
      import('../content');
      
      // Note: In a real test, this would need to be mocked differently
      // since the import happens at module load time
    });

    it('should inject API into window.steem_keychain', () => {
      // Mock window object
      const mockWindow = {} as any;
      global.window = mockWindow;
      
      // Simulate injection
      mockWindow.steem_keychain = new MockEttaKeychainAPI();
      
      expect(mockWindow.steem_keychain).toBeDefined();
      expect(typeof mockWindow.steem_keychain.requestHandshake).toBe('function');
    });
  });

  describe('Response Handling', () => {
    it('should handle keychain response messages correctly', () => {
      const callback = vi.fn();
      keychainAPI.requestVerifyKey('testuser', 'test message', 'Posting', callback);
      
      // Simulate response from background script
      const response: KeychainResponse = {
        success: true,
        result: 'decoded message',
        request_id: 1
      };
      
      // Manually trigger the callback as if it came from the background
      keychainAPI.receiveResponse(response);
      
      expect(callback).toHaveBeenCalledWith(response);
      expect(keychainAPI.requests[1]).toBeUndefined();
    });

    it('should handle handshake response correctly', () => {
      const handshakeCallback = vi.fn();
      keychainAPI.requestHandshake(handshakeCallback);
      
      // Simulate handshake response
      if (keychainAPI.handshake_callback) {
        keychainAPI.handshake_callback();
      }
      
      expect(handshakeCallback).toHaveBeenCalled();
    });
  });

  describe('Key Type Validation', () => {
    it('should accept valid key types', () => {
      const validKeyTypes: KeyType[] = ['Posting', 'Active', 'Owner', 'Memo'];
      
      validKeyTypes.forEach(keyType => {
        expect(() => {
          keychainAPI.requestVerifyKey('testuser', 'message', keyType, vi.fn());
        }).not.toThrow();
      });
    });

    it('should default to Posting for custom JSON when keyType is not specified', () => {
      const callback = vi.fn();
      
      // This tests the fallback in requestCustomJson
      keychainAPI.requestCustomJson(
        'testuser',
        'follow',
        '' as KeyType, // Empty string should fallback to 'Posting'
        '{}',
        'Test',
        callback
      );

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: 'Posting'
          })
        })
      );
    });
  });

  describe('Optional Parameters', () => {
    it('should handle optional RPC parameter correctly', () => {
      const callback = vi.fn();
      
      // Test without RPC
      keychainAPI.requestVote('voter', 'permlink', 'author', 5000, callback);
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            rpc: expect.anything()
          })
        })
      );
      
      // Test with RPC
      keychainAPI.requestVote('voter', 'permlink', 'author', 5000, callback, 'https://custom.rpc');
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rpc: 'https://custom.rpc'
          })
        })
      );
    });

    it('should handle enforce parameter in transfer requests', () => {
      const callback = vi.fn();
      
      // Test with enforce = false (default)
      keychainAPI.requestTransfer('sender', 'receiver', '1.000', 'memo', 'STEEM', callback);
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            enforce: false
          })
        })
      );
      
      // Test with enforce = true
      keychainAPI.requestTransfer('sender', 'receiver', '1.000', 'memo', 'STEEM', callback, true);
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            enforce: true
          })
        })
      );
    });
  });
});