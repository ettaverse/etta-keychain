/**
 * Asset-specific extensions to the STEEM Keychain API
 * 
 * Extends the base Keychain interface with asset management capabilities
 * for the Multi-Level Asset System including creation, transfer, and conversion.
 */

import { KeychainResponse, RequestCallback, KeyType } from './keychain-api.interface';
import { UniversalAsset, AssetCreationRequest, GameVariant } from '../../lib/assets/types';

// Asset-specific response types
export interface AssetKeychainResponse extends KeychainResponse {
  asset?: UniversalAsset;
  universal_id?: string;
  transaction_id?: string;
  conversion_result?: {
    new_variant: GameVariant;
    conversion_quality: number;
    properties_lost: string[];
    properties_gained: string[];
  };
}

// Asset operation request types
export interface AssetCreationKeychainRequest {
  type: 'asset_create';
  username: string;
  asset_request: AssetCreationRequest;
  display_msg?: string;
  rpc?: string;
}

export interface AssetTransferKeychainRequest {
  type: 'asset_transfer';
  username: string;
  universal_id: string;
  to_user: string;
  transfer_type: 'sale' | 'gift' | 'trade' | 'conversion';
  price?: { amount: string; currency: string };
  game_context?: string;
  memo?: string;
  display_msg?: string;
  rpc?: string;
}

export interface AssetConversionKeychainRequest {
  type: 'asset_convert';
  username: string;
  universal_id: string;
  from_game: string;
  to_game: string;
  conversion_options?: Record<string, any>;
  display_msg?: string;
  rpc?: string;
}

export interface AssetUpdateKeychainRequest {
  type: 'asset_update';
  username: string;
  universal_id: string;
  updates: Partial<UniversalAsset>;
  display_msg?: string;
  rpc?: string;
}

export interface AssetBurnKeychainRequest {
  type: 'asset_burn';
  username: string;
  universal_id: string;
  burn_reason?: string;
  display_msg?: string;
  rpc?: string;
}

// Extended Keychain interface with asset methods
export interface EttaKeychainAssetAPI {
  /**
   * Requests creation of a new Universal Asset
   * @param account Steem account to perform the request
   * @param assetRequest Asset creation request with all required data
   * @param callback Function that handles Keychain's response
   * @param displayMsg Message to show user about the asset creation
   * @param rpc Override user's RPC settings
   */
  requestAssetCreate(
    account: string,
    assetRequest: AssetCreationRequest,
    callback: (response: AssetKeychainResponse) => void,
    displayMsg?: string,
    rpc?: string
  ): void;

  /**
   * Requests transfer of an asset between users
   * @param account Steem account to perform the request (current owner)
   * @param universalId Universal ID of the asset to transfer
   * @param toUser Recipient of the asset
   * @param transferType Type of transfer (sale, gift, trade, etc.)
   * @param callback Function that handles Keychain's response
   * @param options Additional transfer options
   * @param rpc Override user's RPC settings
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
  ): void;

  /**
   * Requests conversion of an asset between games
   * @param account Steem account to perform the request
   * @param universalId Universal ID of the asset to convert
   * @param fromGame Source game ID
   * @param toGame Target game ID
   * @param callback Function that handles Keychain's response
   * @param conversionOptions Game-specific conversion parameters
   * @param displayMsg Message to show user about the conversion
   * @param rpc Override user's RPC settings
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
  ): void;

  /**
   * Requests update of an existing asset
   * @param account Steem account to perform the request
   * @param universalId Universal ID of the asset to update
   * @param updates Partial asset data to update
   * @param callback Function that handles Keychain's response
   * @param displayMsg Message to show user about the update
   * @param rpc Override user's RPC settings
   */
  requestAssetUpdate(
    account: string,
    universalId: string,
    updates: Partial<UniversalAsset>,
    callback: (response: AssetKeychainResponse) => void,
    displayMsg?: string,
    rpc?: string
  ): void;

  /**
   * Requests burning/destruction of an asset
   * @param account Steem account to perform the request
   * @param universalId Universal ID of the asset to burn
   * @param callback Function that handles Keychain's response
   * @param burnReason Optional reason for burning
   * @param displayMsg Message to show user about the burn
   * @param rpc Override user's RPC settings
   */
  requestAssetBurn(
    account: string,
    universalId: string,
    callback: (response: AssetKeychainResponse) => void,
    burnReason?: string,
    displayMsg?: string,
    rpc?: string
  ): void;

  /**
   * Requests verification of asset ownership
   * @param account Steem account to verify ownership for
   * @param universalId Universal ID of the asset
   * @param callback Function that handles Keychain's response
   * @param rpc Override user's RPC settings
   */
  requestAssetOwnershipVerification(
    account: string,
    universalId: string,
    callback: (response: AssetKeychainResponse) => void,
    rpc?: string
  ): void;

  /**
   * Requests signing of asset-related custom operations
   * @param account Steem account to perform the request
   * @param operationType Type of asset operation
   * @param operationData Data for the operation
   * @param callback Function that handles Keychain's response
   * @param displayMsg Message to show user about the operation
   * @param rpc Override user's RPC settings
   */
  requestAssetOperation(
    account: string,
    operationType: 'asset_mint' | 'asset_transfer' | 'asset_convert' | 'asset_update' | 'asset_burn',
    operationData: Record<string, any>,
    callback: (response: AssetKeychainResponse) => void,
    displayMsg?: string,
    rpc?: string
  ): void;

  /**
   * Requests batch asset operations
   * @param account Steem account to perform the request
   * @param operations Array of asset operations to perform
   * @param callback Function that handles Keychain's response
   * @param displayMsg Message to show user about the batch
   * @param rpc Override user's RPC settings
   */
  requestAssetBatch(
    account: string,
    operations: Array<{
      type: string;
      data: Record<string, any>;
    }>,
    callback: (response: AssetKeychainResponse) => void,
    displayMsg?: string,
    rpc?: string
  ): void;
}

// Combined interface extending base Keychain with asset functionality
export interface ExtendedSteemKeychain extends EttaKeychainAssetAPI {
  // All base keychain methods are inherited via composition
  requestHandshake(callback: (response: KeychainResponse) => void): void;
  requestVerifyKey(account: string, message: string, keyType: KeyType, callback: RequestCallback): void;
  requestCustomJson(
    account: string | null,
    id: string,
    keyType: KeyType,
    json: string,
    displayName: string,
    callback: RequestCallback,
    rpc?: string
  ): void;
  requestTransfer(
    account: string,
    to: string,
    amount: string,
    memo: string,
    currency: string,
    callback: RequestCallback,
    enforce?: boolean,
    rpc?: string
  ): void;
  requestVote(
    account: string,
    permlink: string,
    author: string,
    weight: number,
    callback: RequestCallback,
    rpc?: string
  ): void;
  requestBroadcast(
    account: string,
    operations: any[],
    keyType: KeyType,
    callback: RequestCallback,
    rpc?: string
  ): void;
  requestSignTx(
    account: string,
    tx: any,
    keyType: KeyType,
    callback: RequestCallback,
    rpc?: string
  ): void;
  requestEncodeMessage(
    username: string,
    receiver: string,
    message: string,
    keyType: KeyType,
    callback: RequestCallback
  ): void;
  requestPost(
    account: string,
    title: string,
    body: string,
    parentPermlink: string,
    tags: string[],
    callback: RequestCallback,
    rpc?: string
  ): void;
  requestWitnessVote(
    account: string,
    witness: string,
    approve: boolean,
    callback: RequestCallback,
    rpc?: string
  ): void;
  requestPowerUp(
    account: string,
    to: string,
    amount: string,
    callback: RequestCallback,
    rpc?: string
  ): void;
  requestSignBuffer(
    account: string,
    message: string,
    keyType: KeyType,
    callback: RequestCallback,
    rpc?: string
  ): void;
}

// Asset operation validation helpers
export interface AssetOperationValidation {
  /**
   * Validates an asset creation request before sending to Keychain
   */
  validateAssetCreation(request: AssetCreationRequest): {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  };

  /**
   * Validates an asset transfer request
   */
  validateAssetTransfer(
    universalId: string,
    fromUser: string,
    toUser: string,
    transferType: string
  ): Promise<{
    valid: boolean;
    errors?: string[];
    canTransfer?: boolean;
  }>;

  /**
   * Validates an asset conversion request
   */
  validateAssetConversion(
    universalId: string,
    fromGame: string,
    toGame: string
  ): Promise<{
    valid: boolean;
    errors?: string[];
    conversionPossible?: boolean;
    estimatedQuality?: number;
  }>;
}

// Asset operation cost estimation
export interface AssetOperationCosts {
  /**
   * Estimates the cost of creating an asset
   */
  estimateCreationCost(request: AssetCreationRequest): {
    amount: string;
    currency: string;
    breakdown: {
      base_cost: string;
      rarity_multiplier: number;
      complexity_factor: number;
      domain_fee?: string;
    };
  };

  /**
   * Estimates the cost of transferring an asset
   */
  estimateTransferCost(universalId: string, transferType: string): {
    amount: string;
    currency: string;
    breakdown: {
      base_transfer_fee: string;
      asset_value_fee?: string;
      game_specific_fee?: string;
    };
  };

  /**
   * Estimates the cost of converting an asset
   */
  estimateConversionCost(universalId: string, fromGame: string, toGame: string): {
    amount: string;
    currency: string;
    breakdown: {
      base_conversion_fee: string;
      complexity_penalty: string;
      game_specific_fee?: string;
    };
  };
}

// Asset preview and simulation
export interface AssetPreviewAPI {
  /**
   * Previews what an asset would look like before creation
   */
  previewAssetCreation(request: AssetCreationRequest): Promise<{
    preview: UniversalAsset;
    estimated_cost: { amount: string; currency: string };
    validation_warnings: string[];
  }>;

  /**
   * Simulates an asset conversion to show results
   */
  simulateAssetConversion(
    universalId: string,
    fromGame: string,
    toGame: string
  ): Promise<{
    preview_variant: GameVariant;
    conversion_quality: number;
    properties_lost: string[];
    properties_gained: string[];
    estimated_cost: { amount: string; currency: string };
  }>;
}

// Error types specific to asset operations
export interface AssetKeychainError {
  code: 'ASSET_NOT_FOUND' | 'INSUFFICIENT_PERMISSIONS' | 'INVALID_CONVERSION' | 
        'ASSET_LOCKED' | 'INSUFFICIENT_FUNDS' | 'VALIDATION_FAILED' | 
        'BLOCKCHAIN_ERROR' | 'RATE_LIMITED';
  message: string;
  details?: Record<string, any>;
}

// Global window declaration for extended Keychain
declare global {
  interface Window {
    etta_keychain?: ExtendedSteemKeychain;
  }
}

// Utility types for asset operations
export type AssetOperationType = 
  | 'asset_create'
  | 'asset_transfer' 
  | 'asset_convert'
  | 'asset_update'
  | 'asset_burn'
  | 'asset_verify';

export type AssetTransferType = 'sale' | 'gift' | 'trade' | 'conversion' | 'system';

export interface AssetOperationResult {
  success: boolean;
  transaction_id?: string;
  universal_id?: string;
  operation_data?: Record<string, any>;
  error?: AssetKeychainError;
  warnings?: string[];
}

// Asset operation display configurations
export interface AssetDisplayConfig {
  creation: {
    title: string;
    description: string;
    icon?: string;
    confirmText?: string;
  };
  transfer: {
    title: string;
    description: string;
    icon?: string;
    confirmText?: string;
    showRecipient: boolean;
    showPrice: boolean;
  };
  conversion: {
    title: string;
    description: string;
    icon?: string;
    confirmText?: string;
    showQualityWarning: boolean;
  };
}