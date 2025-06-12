import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SteemKeychain, RequestCallback, KeychainResponse } from '../interfaces/keychain-api.interface';

/**
 * Comprehensive Error Handling and Timeout Tests for Content Script
 * Tests all error scenarios and edge cases that could occur during API usage
 */

const mockBrowser = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() }
  }
};

// Mock API implementation for error testing
class TestKeychainAPI implements SteemKeychain {
  current_id = 1;
  requests: Record<number, RequestCallback> = {};
  handshake_callback: ((response: KeychainResponse) => void) | null = null;
  timeouts: Record<number, NodeJS.Timeout> = {};

  private dispatchCustomEvent(name: string, data: any, callback?: RequestCallback): void {
    const requestId = this.current_id;
    
    if (callback) {
      this.requests[requestId] = callback;
      
      // Set up timeout with cleanup tracking
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

    const requestData = { ...data, request_id: requestId };

    try {
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
    } catch (error) {
      if (callback) {
        callback({
          success: false,
          error: 'Browser API unavailable',
          message: 'Browser extension API is not available'
        });
        if (this.timeouts[requestId]) {
          clearTimeout(this.timeouts[requestId]);
          delete this.timeouts[requestId];
        }
        delete this.requests[requestId];
      }
    }

    this.current_id++;
  }

  // Cleanup method for testing
  cleanup(): void {
    Object.values(this.timeouts).forEach(timeout => clearTimeout(timeout));
    this.timeouts = {};
    this.requests = {};
    this.current_id = 1;
  }

  // Method to simulate receiving response from background script
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

  requestHandshake(callback: (response: KeychainResponse) => void): void {
    this.handshake_callback = callback;
    this.dispatchCustomEvent('swHandshake', {});
  }

  requestVerifyKey(account: string, message: string, keyType: 'Posting' | 'Active' | 'Owner' | 'Memo', callback: RequestCallback): void {
    this.dispatchCustomEvent('swRequest', {
      type: 'decode',
      username: account,
      message,
      method: keyType
    }, callback);
  }

  requestCustomJson(account: string | null, id: string, keyType: 'Posting' | 'Active' | 'Owner' | 'Memo', json: string, displayName: string, callback: RequestCallback, rpc?: string): void {
    this.dispatchCustomEvent('swRequest', {
      type: 'custom',
      username: account,
      id,
      method: keyType || 'Posting',
      json,
      display_msg: displayName,
      rpc
    }, callback);
  }

  requestTransfer(account: string, to: string, amount: string, memo: string, currency: string, callback: RequestCallback, enforce = false, rpc?: string): void {
    this.dispatchCustomEvent('swRequest', {
      type: 'transfer',
      username: account,
      to,
      amount,
      memo,
      currency,
      enforce,
      rpc
    }, callback);
  }

  requestVote(account: string, permlink: string, author: string, weight: number, callback: RequestCallback, rpc?: string): void {
    this.dispatchCustomEvent('swRequest', {
      type: 'vote',
      username: account,
      permlink,
      author,
      weight,
      rpc
    }, callback);
  }

  requestBroadcast(account: string, operations: any[], keyType: 'Posting' | 'Active' | 'Owner' | 'Memo', callback: RequestCallback, rpc?: string): void {
    this.dispatchCustomEvent('swRequest', {
      type: 'broadcast',
      username: account,
      operations,
      method: keyType,
      rpc
    }, callback);
  }

  requestSignTx(account: string, tx: any, keyType: 'Posting' | 'Active' | 'Owner' | 'Memo', callback: RequestCallback, rpc?: string): void {
    this.dispatchCustomEvent('swRequest', {
      type: 'signTx',
      username: account,
      tx,
      method: keyType,
      rpc
    }, callback);
  }

  requestEncodeMessage(username: string, receiver: string, message: string, keyType: 'Posting' | 'Active' | 'Owner' | 'Memo', callback: RequestCallback): void {
    this.dispatchCustomEvent('swRequest', {
      type: 'encode',
      username,
      receiver,
      message,
      method: keyType
    }, callback);
  }

  requestPost(
    account: string,
    title: string,
    body: string,
    parentPermlink: string,
    tags: string[],
    callback: RequestCallback,
    rpc?: string
  ): void {
    setTimeout(() => callback({ success: false, error: "Not implemented" }), 0);
  }

  requestWitnessVote(
    account: string,
    witness: string,
    approve: boolean,
    callback: RequestCallback,
    rpc?: string
  ): void {
    setTimeout(() => callback({ success: false, error: "Not implemented" }), 0);
  }

  requestPowerUp(
    account: string,
    to: string,
    amount: string,
    callback: RequestCallback,
    rpc?: string
  ): void {
    setTimeout(() => callback({ success: false, error: "Not implemented" }), 0);
  }

  requestSignBuffer(
    account: string,
    message: string,
    keyType: 'Posting' | 'Active' | 'Owner' | 'Memo',
    callback: RequestCallback,
    rpc?: string
  ): void {
    setTimeout(() => callback({ success: false, error: "Not implemented" }), 0);
  }
}

describe('Content Script - Error Handling and Timeouts', () => {
  let api: TestKeychainAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockBrowser to ensure it has all properties
    mockBrowser.runtime = {
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() }
    };
    global.browser = mockBrowser as any;
    api = new TestKeychainAPI();
    mockBrowser.runtime.sendMessage.mockResolvedValue(undefined);
  });

  afterEach(() => {
    api.cleanup();
    vi.clearAllTimers();
  });

  describe('Timeout Handling', () => {
    it('should timeout requests after 30 seconds', async () => {
      vi.useFakeTimers();
      
      const callback = vi.fn();
      api.requestVerifyKey('testuser', 'message', 'Posting', callback);
      
      // Advance time by 29 seconds (should not timeout yet)
      vi.advanceTimersByTime(29000);
      expect(callback).not.toHaveBeenCalled();
      
      // Advance time by 1 more second (should timeout)
      vi.advanceTimersByTime(1000);
      
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Request timeout',
        message: 'The request timed out after 30 seconds'
      });
      
      vi.useRealTimers();
    });

    it('should clean up request data after timeout', async () => {
      vi.useFakeTimers();
      
      const callback = vi.fn();
      api.requestVerifyKey('testuser', 'message', 'Posting', callback);
      
      // Verify request is stored
      expect(api.requests[1]).toBe(callback);
      expect(api.timeouts[1]).toBeDefined();
      
      // Trigger timeout
      vi.advanceTimersByTime(30000);
      
      // Verify cleanup
      expect(api.requests[1]).toBeUndefined();
      expect(api.timeouts[1]).toBeUndefined();
      
      vi.useRealTimers();
    });

    it('should handle multiple concurrent requests with different timeouts', async () => {
      vi.useFakeTimers();
      
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      
      // Start requests at different times
      api.requestVerifyKey('user1', 'msg1', 'Posting', callback1);
      
      vi.advanceTimersByTime(5000);
      api.requestVerifyKey('user2', 'msg2', 'Posting', callback2);
      
      vi.advanceTimersByTime(10000);
      api.requestVerifyKey('user3', 'msg3', 'Posting', callback3);
      
      // First request should timeout first (after 15 more seconds)
      vi.advanceTimersByTime(15000);
      expect(callback1).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Request timeout'
      }));
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
      
      // Second request should timeout next (after 10 more seconds)
      vi.advanceTimersByTime(10000);
      expect(callback2).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Request timeout'
      }));
      expect(callback3).not.toHaveBeenCalled();
      
      // Third request should timeout last (after 5 more seconds)
      vi.advanceTimersByTime(5000);
      expect(callback3).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Request timeout'
      }));
      
      vi.useRealTimers();
    });

    it('should not timeout if response arrives before timeout', async () => {
      vi.useFakeTimers();
      
      const callback = vi.fn();
      api.requestVerifyKey('testuser', 'message', 'Posting', callback);
      
      // Advance time but not to timeout
      vi.advanceTimersByTime(15000);
      
      // Simulate response arriving (should clear timeout)
      api.receiveResponse({
        success: true,
        result: 'decoded_message',
        request_id: 1
      });
      
      // Advance past timeout time
      vi.advanceTimersByTime(20000);
      
      // Should only be called once (from response, not timeout)
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        success: true,
        result: 'decoded_message',
        request_id: 1
      });
      
      vi.useRealTimers();
    });
  });

  describe('Communication Errors', () => {
    it('should handle browser.runtime.sendMessage rejections', async () => {
      const callback = vi.fn();
      
      mockBrowser.runtime.sendMessage.mockRejectedValueOnce(
        new Error('Extension context invalidated')
      );
      
      api.requestVerifyKey('testuser', 'message', 'Posting', callback);
      
      // Wait for promise rejection to be handled
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Communication error',
        message: 'Failed to communicate with extension background'
      });
    });

    it('should clean up timeout when communication fails', async () => {
      vi.useFakeTimers();
      
      const callback = vi.fn();
      
      mockBrowser.runtime.sendMessage.mockRejectedValueOnce(
        new Error('Connection lost')
      );
      
      api.requestVerifyKey('testuser', 'message', 'Posting', callback);
      
      // Wait for error handling
      await Promise.resolve();
      
      // Verify request was cleaned up
      expect(api.requests[1]).toBeUndefined();
      expect(api.timeouts[1]).toBeUndefined();
      
      // Advance time to where timeout would have occurred
      vi.advanceTimersByTime(30000);
      
      // Should only be called once (from error, not timeout)
      expect(callback).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });

    it('should handle different types of browser API errors', async () => {
      const testCases = [
        { error: new Error('Could not establish connection'), expectedError: 'Communication error' },
        { error: new Error('Extension context invalidated'), expectedError: 'Communication error' },
        { error: new Error('The extension was reloaded'), expectedError: 'Communication error' },
        { error: new Error('Network failure'), expectedError: 'Communication error' }
      ];

      for (const testCase of testCases) {
        const callback = vi.fn();
        
        mockBrowser.runtime.sendMessage.mockRejectedValueOnce(testCase.error);
        
        api.requestVerifyKey('testuser', 'message', 'Posting', callback);
        
        await new Promise(resolve => setTimeout(resolve, 0));
        
        expect(callback).toHaveBeenCalledWith({
          success: false,
          error: testCase.expectedError,
          message: 'Failed to communicate with extension background'
        });
        
        // Reset for next iteration
        callback.mockClear();
      }
    });
  });

  describe('Edge Cases and Malformed Data', () => {
    it('should handle null/undefined callbacks gracefully', () => {
      expect(() => {
        api.requestVerifyKey('testuser', 'message', 'Posting', null as any);
      }).not.toThrow();
      
      expect(() => {
        api.requestVerifyKey('testuser', 'message', 'Posting', undefined as any);
      }).not.toThrow();
    });

    it('should handle extremely long messages', async () => {
      const longMessage = 'a'.repeat(100000); // 100KB message
      const callback = vi.fn();
      
      expect(() => {
        api.requestVerifyKey('testuser', longMessage, 'Posting', callback);
      }).not.toThrow();
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message: longMessage
          })
        })
      );
    });

    it('should handle special characters in usernames and messages', async () => {
      const specialChars = [
        'user.with.dots',
        'user-with-dashes',
        'user_with_underscores',
        'user123numbers',
        'userมชำพิเศษ', // Thai characters
        'user测试中文', // Chinese characters
      ];

      for (const username of specialChars) {
        const callback = vi.fn();
        
        expect(() => {
          api.requestVerifyKey(username, 'test message', 'Posting', callback);
        }).not.toThrow();
        
        expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              username: username
            })
          })
        );
      }
    });

    it('should handle malformed JSON in custom requests', async () => {
      const malformedJsonCases = [
        '{"incomplete": true', // Missing closing brace
        'not json at all',
        '{"valid": "json"}extra_text',
        '',
        'null',
        'undefined'
      ];

      for (const malformedJson of malformedJsonCases) {
        const callback = vi.fn();
        
        expect(() => {
          api.requestCustomJson('testuser', 'follow', 'Posting', malformedJson, 'Test', callback);
        }).not.toThrow();
        
        expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              json: malformedJson
            })
          })
        );
      }
    });

    it('should handle invalid numeric values', async () => {
      const invalidWeights = [
        Infinity,
        -Infinity,
        NaN,
        Number.MAX_SAFE_INTEGER + 1,
        Number.MIN_SAFE_INTEGER - 1
      ];

      for (const weight of invalidWeights) {
        const callback = vi.fn();
        
        expect(() => {
          api.requestVote('testuser', 'permlink', 'author', weight, callback);
        }).not.toThrow();
        
        expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              weight: weight
            })
          })
        );
      }
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with many requests', async () => {
      vi.useFakeTimers();
      
      const callbacks: Array<() => void> = [];
      
      // Create many requests
      for (let i = 0; i < 1000; i++) {
        const callback = vi.fn();
        callbacks.push(callback);
        api.requestVerifyKey(`user${i}`, `message${i}`, 'Posting', callback);
      }
      
      // All requests should be stored
      expect(Object.keys(api.requests)).toHaveLength(1000);
      expect(Object.keys(api.timeouts)).toHaveLength(1000);
      
      // Trigger all timeouts
      vi.advanceTimersByTime(30000);
      
      // All should be cleaned up
      expect(Object.keys(api.requests)).toHaveLength(0);
      expect(Object.keys(api.timeouts)).toHaveLength(0);
      
      vi.useRealTimers();
    });

    it('should clean up properly when requests complete normally', async () => {
      const callback = vi.fn();
      api.requestVerifyKey('testuser', 'message', 'Posting', callback);
      
      // Verify stored
      expect(api.requests[1]).toBe(callback);
      expect(api.timeouts[1]).toBeDefined();
      
      // Simulate normal completion using receiveResponse method
      api.receiveResponse({
        success: true,
        result: 'decoded',
        request_id: 1
      });
      
      // Should be cleaned up
      expect(api.requests[1]).toBeUndefined();
      expect(api.timeouts[1]).toBeUndefined();
    });
  });

  describe('Browser Compatibility', () => {
    it('should handle missing browser.runtime gracefully', () => {
      const originalRuntime = mockBrowser.runtime;
      // @ts-ignore - testing undefined scenario  
      mockBrowser.runtime = undefined;
      
      const callback = vi.fn();
      
      expect(() => {
        api.requestVerifyKey('testuser', 'message', 'Posting', callback);
      }).not.toThrow(); // Should not throw, but handle gracefully
      
      // Should call callback with error
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Browser API unavailable',
        message: 'Browser extension API is not available'
      });
      
      mockBrowser.runtime = originalRuntime;
    });

    it('should handle missing browser.runtime.sendMessage', () => {
      const originalSendMessage = mockBrowser.runtime.sendMessage;
      mockBrowser.runtime.sendMessage = undefined as any;
      
      const callback = vi.fn();
      
      expect(() => {
        api.requestVerifyKey('testuser', 'message', 'Posting', callback);
      }).not.toThrow(); // Should not throw, but handle gracefully
      
      // Should call callback with error
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Browser API unavailable',
        message: 'Browser extension API is not available'
      });
      
      mockBrowser.runtime.sendMessage = originalSendMessage;
    });
  });

  describe('Request ID Overflow', () => {
    it('should handle request ID overflow gracefully', () => {
      // Set request ID near maximum safe integer
      api.current_id = Number.MAX_SAFE_INTEGER - 1;
      
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      
      api.requestVerifyKey('user1', 'msg1', 'Posting', callback1);
      expect(api.current_id).toBe(Number.MAX_SAFE_INTEGER);
      
      api.requestVerifyKey('user2', 'msg2', 'Posting', callback2);
      expect(api.current_id).toBe(Number.MAX_SAFE_INTEGER + 1);
      
      // This should still work even with overflow
      api.requestVerifyKey('user3', 'msg3', 'Posting', callback3);
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid successive requests', async () => {
      const callbacks: any[] = [];
      const promises: Promise<void>[] = [];
      
      // Make 100 rapid requests
      for (let i = 0; i < 100; i++) {
        const callback = vi.fn();
        callbacks.push(callback);
        
        const promise = new Promise<void>((resolve) => {
          setTimeout(() => {
            api.requestVerifyKey(`user${i}`, `message${i}`, 'Posting', callback);
            resolve();
          }, i); // Stagger slightly
        });
        promises.push(promise);
      }
      
      await Promise.all(promises);
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledTimes(100);
      expect(Object.keys(api.requests)).toHaveLength(100);
    });
  });
});