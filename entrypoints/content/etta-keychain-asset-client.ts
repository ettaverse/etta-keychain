/**
 * Etta Keychain Asset Client - Client-side interface for asset operations
 * 
 * Provides a client-side API that web applications can use to interact
 * with the Etta Keychain's asset management features.
 */

import { 
  ExtendedSteemKeychain,
  EttaKeychainAssetAPI,
  AssetKeychainResponse,
  AssetOperationResult,
  AssetDisplayConfig 
} from '../interfaces/keychain-asset-api.interface';
import { KeychainResponse } from '../interfaces/keychain-api.interface';
import { UniversalAsset, AssetCreationRequest } from '../../lib/assets/types';

export class EttaKeychainAssetClient implements EttaKeychainAssetAPI {
  private currentRequestId: number = 1;
  private pendingRequests: Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  
  // Configuration
  private readonly REQUEST_TIMEOUT = 60000; // 60 seconds
  private readonly displayConfig: AssetDisplayConfig = {
    creation: {
      title: 'Create Asset',
      description: 'Create a new Universal Asset',
      confirmText: 'Create Asset'
    },
    transfer: {
      title: 'Transfer Asset',
      description: 'Transfer asset to another user',
      confirmText: 'Transfer Asset',
      showRecipient: true,
      showPrice: true
    },
    conversion: {
      title: 'Convert Asset',
      description: 'Convert asset between games',
      confirmText: 'Convert Asset',
      showQualityWarning: true
    }
  };

  constructor() {
    // Set up message listener for responses from background script
    this.setupMessageListener();
  }

  /**
   * Checks if Etta Keychain with asset support is available
   */
  static isAssetSupported(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.etta_keychain !== 'undefined' &&
           typeof window.etta_keychain.requestAssetCreate === 'function';
  }

  /**
   * Requests creation of a new Universal Asset
   */
  requestAssetCreate(
    account: string,
    assetRequest: AssetCreationRequest,
    callback: (response: AssetKeychainResponse) => void,
    displayMsg?: string,
    rpc?: string
  ): void {
    const requestId = this.generateRequestId();
    
    // Validate input
    if (!account || !assetRequest) {
      this.returnError(callback, 'Missing required parameters for asset creation', requestId);
      return;
    }

    // Send request to background script
    this.sendAssetRequest({
      type: 'asset_create',
      requestId,
      account,
      assetRequest,
      displayMsg: displayMsg || this.displayConfig.creation.description,
      rpc
    }, callback);
  }

  /**
   * Promise-based version of requestAssetCreate
   */
  async createAsset(
    account: string,
    assetRequest: AssetCreationRequest,
    displayMsg?: string,
    rpc?: string
  ): Promise<AssetOperationResult> {
    return new Promise((resolve, reject) => {
      this.requestAssetCreate(account, assetRequest, (response) => {
        if (response.success) {
          resolve({
            success: true,
            transaction_id: response.transaction_id,
            universal_id: response.universal_id,
            operation_data: response.asset
          });
        } else {
          reject({
            success: false,
            error: { code: 'OPERATION_FAILED', message: response.error || 'Asset creation failed' }
          });
        }
      }, displayMsg, rpc);
    });
  }

  /**
   * Requests transfer of an asset between users
   */
  requestAssetTransfer(
    account: string,
    universalId: string,
    toUser: string,
    transferType: 'sale' | 'gift' | 'trade' | 'conversion',
    callback: (response: AssetKeychainResponse) => void,
    options?: {
      price?: { amount: string; currency: string };
      gameContext?: string;
      memo?: string;
      displayMsg?: string;
    },
    rpc?: string
  ): void {
    const requestId = this.generateRequestId();
    
    // Validate input
    if (!account || !universalId || !toUser) {
      this.returnError(callback, 'Missing required parameters for asset transfer', requestId);
      return;
    }

    // Generate display message based on transfer type
    let displayMsg = options?.displayMsg;
    if (!displayMsg) {
      const priceInfo = options?.price ? ` for ${options.price.amount} ${options.price.currency}` : '';
      displayMsg = `${transferType.charAt(0).toUpperCase() + transferType.slice(1)} asset to ${toUser}${priceInfo}`;
    }

    // Send request to background script
    this.sendAssetRequest({
      type: 'asset_transfer',
      requestId,
      account,
      universalId,
      toUser,
      transferType,
      options,
      displayMsg,
      rpc
    }, callback);
  }

  /**
   * Promise-based version of requestAssetTransfer
   */
  async transferAsset(
    account: string,
    universalId: string,
    toUser: string,
    transferType: 'sale' | 'gift' | 'trade' | 'conversion',
    options?: {
      price?: { amount: string; currency: string };
      gameContext?: string;
      memo?: string;
      displayMsg?: string;
    },
    rpc?: string
  ): Promise<AssetOperationResult> {
    return new Promise((resolve, reject) => {
      this.requestAssetTransfer(account, universalId, toUser, transferType, (response) => {
        if (response.success) {
          resolve({
            success: true,
            transaction_id: response.transaction_id,
            universal_id: response.universal_id
          });
        } else {
          reject({
            success: false,
            error: { code: 'OPERATION_FAILED', message: response.error || 'Asset transfer failed' }
          });
        }
      }, options, rpc);
    });
  }

  /**
   * Requests conversion of an asset between games
   */
  requestAssetConversion(
    account: string,
    universalId: string,
    fromGame: string,
    toGame: string,
    callback: (response: AssetKeychainResponse) => void,
    conversionOptions?: Record<string, any>,
    displayMsg?: string,
    rpc?: string
  ): void {
    const requestId = this.generateRequestId();
    
    // Validate input
    if (!account || !universalId || !fromGame || !toGame) {
      this.returnError(callback, 'Missing required parameters for asset conversion', requestId);
      return;
    }

    const finalDisplayMsg = displayMsg || `Convert asset from ${fromGame} to ${toGame}`;

    // Send request to background script
    this.sendAssetRequest({
      type: 'asset_convert',
      requestId,
      account,
      universalId,
      fromGame,
      toGame,
      conversionOptions,
      displayMsg: finalDisplayMsg,
      rpc
    }, callback);
  }

  /**
   * Promise-based version of requestAssetConversion
   */
  async convertAsset(
    account: string,
    universalId: string,
    fromGame: string,
    toGame: string,
    conversionOptions?: Record<string, any>,
    displayMsg?: string,
    rpc?: string
  ): Promise<AssetOperationResult> {
    return new Promise((resolve, reject) => {
      this.requestAssetConversion(account, universalId, fromGame, toGame, (response) => {
        if (response.success) {
          resolve({
            success: true,
            transaction_id: response.transaction_id,
            universal_id: response.universal_id,
            operation_data: response.conversion_result
          });
        } else {
          reject({
            success: false,
            error: { code: 'OPERATION_FAILED', message: response.error || 'Asset conversion failed' }
          });
        }
      }, conversionOptions, displayMsg, rpc);
    });
  }

  /**
   * Requests update of an existing asset
   */
  requestAssetUpdate(
    account: string,
    universalId: string,
    updates: Partial<UniversalAsset>,
    callback: (response: AssetKeychainResponse) => void,
    displayMsg?: string,
    rpc?: string
  ): void {
    const requestId = this.generateRequestId();
    
    // Validate input
    if (!account || !universalId || !updates) {
      this.returnError(callback, 'Missing required parameters for asset update', requestId);
      return;
    }

    const finalDisplayMsg = displayMsg || 'Update asset properties';

    // Send request to background script
    this.sendAssetRequest({
      type: 'asset_update',
      requestId,
      account,
      universalId,
      updates,
      displayMsg: finalDisplayMsg,
      rpc
    }, callback);
  }

  /**
   * Requests burning/destruction of an asset
   */
  requestAssetBurn(
    account: string,
    universalId: string,
    callback: (response: AssetKeychainResponse) => void,
    burnReason?: string,
    displayMsg?: string,
    rpc?: string
  ): void {
    const requestId = this.generateRequestId();
    
    // Validate input
    if (!account || !universalId) {
      this.returnError(callback, 'Missing required parameters for asset burn', requestId);
      return;
    }

    const finalDisplayMsg = displayMsg || 'Permanently destroy this asset';

    // Send request to background script
    this.sendAssetRequest({
      type: 'asset_burn',
      requestId,
      account,
      universalId,
      burnReason,
      displayMsg: finalDisplayMsg,
      rpc
    }, callback);
  }

  /**
   * Requests verification of asset ownership
   */
  requestAssetOwnershipVerification(
    account: string,
    universalId: string,
    callback: (response: AssetKeychainResponse) => void,
    rpc?: string
  ): void {
    const requestId = this.generateRequestId();
    
    // Validate input
    if (!account || !universalId) {
      this.returnError(callback, 'Missing required parameters for ownership verification', requestId);
      return;
    }

    // Send request to background script
    this.sendAssetRequest({
      type: 'asset_verify_ownership',
      requestId,
      account,
      universalId,
      rpc
    }, callback);
  }

  /**
   * Promise-based version of requestAssetOwnershipVerification
   */
  async verifyAssetOwnership(
    account: string,
    universalId: string,
    rpc?: string
  ): Promise<{ verified: boolean; owner?: string }> {
    return new Promise((resolve, reject) => {
      this.requestAssetOwnershipVerification(account, universalId, (response) => {
        if (response.success) {
          resolve({
            verified: true,
            owner: account
          });
        } else {
          resolve({
            verified: false
          });
        }
      }, rpc);
    });
  }

  /**
   * Requests signing of asset-related custom operations
   */
  requestAssetOperation(
    account: string,
    operationType: 'asset_mint' | 'asset_transfer' | 'asset_convert' | 'asset_update' | 'asset_burn',
    operationData: Record<string, any>,
    callback: (response: AssetKeychainResponse) => void,
    displayMsg?: string,
    rpc?: string
  ): void {
    const requestId = this.generateRequestId();
    
    // Validate input
    if (!account || !operationType || !operationData) {
      this.returnError(callback, 'Missing required parameters for asset operation', requestId);
      return;
    }

    const finalDisplayMsg = displayMsg || `Execute ${operationType.replace('_', ' ')} operation`;

    // Send request to background script
    this.sendAssetRequest({
      type: 'asset_operation',
      requestId,
      account,
      operationType,
      operationData,
      displayMsg: finalDisplayMsg,
      rpc
    }, callback);
  }

  /**
   * Requests batch asset operations
   */
  requestAssetBatch(
    account: string,
    operations: Array<{ type: string; data: Record<string, any> }>,
    callback: (response: AssetKeychainResponse) => void,
    displayMsg?: string,
    rpc?: string
  ): void {
    const requestId = this.generateRequestId();
    
    // Validate input
    if (!account || !operations || operations.length === 0) {
      this.returnError(callback, 'Missing required parameters for batch operation', requestId);
      return;
    }

    const finalDisplayMsg = displayMsg || `Execute ${operations.length} asset operations`;

    // Send request to background script
    this.sendAssetRequest({
      type: 'asset_batch',
      requestId,
      account,
      operations,
      displayMsg: finalDisplayMsg,
      rpc
    }, callback);
  }

  /**
   * Gets asset cost estimation
   */
  async getAssetCreationCost(assetRequest: AssetCreationRequest): Promise<{
    amount: string;
    currency: string;
    breakdown: any;
  }> {
    return new Promise((resolve, reject) => {
      this.sendAssetRequest({
        type: 'asset_estimate_cost',
        requestId: this.generateRequestId(),
        assetRequest
      }, (response) => {
        if (response.success && response.result) {
          resolve(response.result);
        } else {
          reject(new Error('Failed to get cost estimation'));
        }
      });
    });
  }

  /**
   * Gets asset preview before creation
   */
  async getAssetPreview(assetRequest: AssetCreationRequest): Promise<{
    preview: UniversalAsset;
    estimated_cost: { amount: string; currency: string };
    validation_warnings: string[];
  }> {
    return new Promise((resolve, reject) => {
      this.sendAssetRequest({
        type: 'asset_preview',
        requestId: this.generateRequestId(),
        assetRequest
      }, (response) => {
        if (response.success && response.result) {
          resolve(response.result);
        } else {
          reject(new Error('Failed to get asset preview'));
        }
      });
    });
  }

  /**
   * Utility method to check if user owns a specific asset
   */
  async doesUserOwnAsset(account: string, universalId: string): Promise<boolean> {
    try {
      const result = await this.verifyAssetOwnership(account, universalId);
      return result.verified;
    } catch (error) {
      return false;
    }
  }

  /**
   * Utility method to estimate transfer cost
   */
  async getTransferCost(universalId: string, transferType: string): Promise<{
    amount: string;
    currency: string;
  }> {
    return new Promise((resolve, reject) => {
      this.sendAssetRequest({
        type: 'asset_estimate_transfer_cost',
        requestId: this.generateRequestId(),
        universalId,
        transferType
      }, (response) => {
        if (response.success && response.result) {
          resolve(response.result);
        } else {
          reject(new Error('Failed to get transfer cost estimation'));
        }
      });
    });
  }

  // Private helper methods

  private generateRequestId(): number {
    return this.currentRequestId++;
  }

  private setupMessageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.source !== window || event.data.type !== 'etta_keychain_asset_response') {
          return;
        }

        const { requestId, response } = event.data;
        const pendingRequest = this.pendingRequests.get(requestId);
        
        if (pendingRequest) {
          clearTimeout(pendingRequest.timeout);
          this.pendingRequests.delete(requestId);
          pendingRequest.resolve(response);
        }
      });
    }
  }

  private sendAssetRequest(request: any, callback: (response: AssetKeychainResponse) => void): void {
    // Set up timeout for the request
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(request.requestId);
      this.returnError(callback, 'Request timeout', request.requestId);
    }, this.REQUEST_TIMEOUT);

    // Store the callback for when we receive a response
    this.pendingRequests.set(request.requestId, {
      resolve: callback,
      reject: callback,
      timeout
    });

    // Send message to background script
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'etta_keychain_asset_request',
        request
      }, '*');
    } else {
      this.returnError(callback, 'Window not available', request.requestId);
    }
  }

  private returnError(callback: (response: AssetKeychainResponse) => void, message: string, requestId?: number): void {
    const response: AssetKeychainResponse = {
      success: false,
      error: message,
      request_id: requestId
    };
    
    // Use setTimeout to make the error callback asynchronous
    setTimeout(() => callback(response), 0);
  }
}

// Create a global instance for web applications to use
if (typeof window !== 'undefined') {
  (window as any).ettaKeychainAssets = new EttaKeychainAssetClient();
  
  // Also expose it as part of the extended keychain interface
  if (!(window as any).etta_keychain) {
    (window as any).etta_keychain = {};
  }
  
  // Add asset methods to the main keychain object
  Object.assign((window as any).etta_keychain, new EttaKeychainAssetClient());
}

// Export for module usage
export default EttaKeychainAssetClient;