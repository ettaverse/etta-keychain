/**
 * Asset Ownership Service - Handles asset ownership verification and management
 * 
 * Provides secure ownership verification, transfer validation, and ownership history
 * tracking for Universal Assets across games and domains.
 */

import { AssetRegistryService } from '../asset-registry.service';
import { AssetBlockchainService } from '../asset-blockchain.service';
import { UniversalAsset, AssetTransaction } from '../../../../lib/assets/types';
import Logger from '../../../../src/utils/logger.utils';

export interface OwnershipValidationResult {
  valid: boolean;
  owner: string;
  verified_at: string;
  ownership_proof?: {
    transaction_id: string;
    block_number: number;
    timestamp: string;
  };
  errors?: string[];
}

export interface OwnershipTransferRequest {
  universal_id: string;
  current_owner: string;
  new_owner: string;
  transfer_type: 'sale' | 'gift' | 'trade' | 'conversion' | 'system';
  price?: { amount: string; currency: string };
  game_context?: string;
  memo?: string;
  requires_approval?: boolean;
  expiration?: string;
}

export interface OwnershipHistory {
  universal_id: string;
  transfers: Array<{
    transaction_id: string;
    from_owner: string;
    to_owner: string;
    transfer_type: string;
    timestamp: string;
    price?: { amount: string; currency: string };
    game_context?: string;
    memo?: string;
  }>;
  current_owner: string;
  total_transfers: number;
  first_owner: string;
  created_at: string;
}

export class AssetOwnershipService {
  private static instance: AssetOwnershipService;
  private registryService: AssetRegistryService;
  private blockchainService: AssetBlockchainService;
  
  // Ownership cache
  private ownershipCache: Map<string, { owner: string; verified_at: number }> = new Map();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  
  // Statistics
  private verificationCount: number = 0;
  private transferCount: number = 0;
  private cacheHits: number = 0;

  constructor() {
    this.registryService = AssetRegistryService.getInstance();
    this.blockchainService = AssetBlockchainService.getAssetInstance();
  }

  static getInstance(): AssetOwnershipService {
    if (!AssetOwnershipService.instance) {
      AssetOwnershipService.instance = new AssetOwnershipService();
    }
    return AssetOwnershipService.instance;
  }

  /**
   * Verifies ownership of an asset by a specific user
   */
  async verifyOwnership(
    universalId: string,
    username: string
  ): Promise<OwnershipValidationResult> {
    const startTime = Date.now();
    
    try {
      Logger.log('Verifying asset ownership:', { universalId, username });
      
      // Check cache first
      const cacheKey = `${universalId}:${username}`;
      const cached = this.ownershipCache.get(cacheKey);
      if (cached && Date.now() - cached.verified_at < this.CACHE_TTL) {
        this.cacheHits++;
        Logger.log('Ownership verification from cache:', { universalId, username, result: cached.owner === username });
        
        return {
          valid: cached.owner === username,
          owner: cached.owner,
          verified_at: new Date(cached.verified_at).toISOString()
        };
      }

      // Get asset from blockchain/registry
      const asset = await this.registryService.getAsset(universalId);
      if (!asset) {
        return {
          valid: false,
          owner: '',
          verified_at: new Date().toISOString(),
          errors: [`Asset ${universalId} not found`]
        };
      }

      // Verify ownership on blockchain
      const blockchainOwnership = await this.blockchainService.verifyAssetOwnership(universalId, username);
      
      // Update cache
      this.ownershipCache.set(cacheKey, {
        owner: asset.current_owner,
        verified_at: Date.now()
      });

      // Get ownership proof if verification is successful
      let ownershipProof;
      if (blockchainOwnership && asset.current_owner === username) {
        const history = await this.blockchainService.getAssetHistory(universalId);
        const lastTransfer = history.find(tx => tx.operation_type === 'asset_transfer');
        
        if (lastTransfer) {
          ownershipProof = {
            transaction_id: lastTransfer.transaction_id,
            block_number: 0, // Would be filled from blockchain data
            timestamp: lastTransfer.timestamp
          };
        }
      }

      this.verificationCount++;
      
      const result: OwnershipValidationResult = {
        valid: asset.current_owner === username && blockchainOwnership,
        owner: asset.current_owner,
        verified_at: new Date().toISOString(),
        ownership_proof: ownershipProof
      };

      Logger.log('Ownership verification completed:', {
        universalId,
        username,
        valid: result.valid,
        actual_owner: result.owner,
        duration_ms: Date.now() - startTime
      });

      return result;
    } catch (error) {
      Logger.error('Ownership verification failed:', error);
      return {
        valid: false,
        owner: '',
        verified_at: new Date().toISOString(),
        errors: [`Verification failed: ${error}`]
      };
    }
  }

  /**
   * Initiates an asset transfer between users
   */
  async initiateTransfer(
    request: OwnershipTransferRequest,
    authorizedBy: string
  ): Promise<{
    success: boolean;
    transaction_id?: string;
    transfer_id?: string;
    errors?: string[];
    warnings?: string[];
  }> {
    try {
      Logger.log('Initiating asset transfer:', {
        universalId: request.universal_id,
        from: request.current_owner,
        to: request.new_owner,
        type: request.transfer_type
      });

      // Validate transfer request
      const validation = await this.validateTransferRequest(request, authorizedBy);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Check current ownership
      const ownershipCheck = await this.verifyOwnership(request.universal_id, request.current_owner);
      if (!ownershipCheck.valid) {
        return {
          success: false,
          errors: [`Transfer failed: ${request.current_owner} does not own asset ${request.universal_id}`]
        };
      }

      // Record transfer on blockchain
      const transactionId = await this.blockchainService.recordAssetTransfer(
        request.universal_id,
        request.current_owner,
        request.new_owner,
        request.game_context,
        request.price,
        request.memo
      );

      // Update registry ownership
      await this.registryService.updateAssetOwnership(
        request.universal_id,
        request.new_owner,
        authorizedBy
      );

      // Clear ownership cache for this asset
      this.clearAssetOwnershipCache(request.universal_id);

      // Update statistics
      this.transferCount++;

      Logger.log('Asset transfer completed successfully:', {
        universalId: request.universal_id,
        transactionId,
        from: request.current_owner,
        to: request.new_owner
      });

      return {
        success: true,
        transaction_id: transactionId,
        transfer_id: `transfer_${Date.now()}_${Math.random().toString(36).slice(2)}`
      };

    } catch (error) {
      Logger.error('Asset transfer failed:', error);
      return {
        success: false,
        errors: [`Transfer failed: ${error}`]
      };
    }
  }

  /**
   * Gets ownership history for an asset
   */
  async getOwnershipHistory(universalId: string): Promise<OwnershipHistory | null> {
    try {
      Logger.log('Getting ownership history:', universalId);

      // Get asset to verify it exists
      const asset = await this.registryService.getAsset(universalId);
      if (!asset) {
        return null;
      }

      // Get transaction history from blockchain
      const transactions = await this.blockchainService.getAssetHistory(universalId);
      
      // Filter for ownership-related transactions
      const ownershipTransactions = transactions.filter(tx => 
        tx.operation_type === 'asset_transfer' || tx.operation_type === 'asset_mint'
      );

      // Build transfer history
      const transfers = ownershipTransactions
        .filter(tx => tx.operation_type === 'asset_transfer')
        .map(tx => ({
          transaction_id: tx.transaction_id,
          from_owner: tx.operation_data.from_user,
          to_owner: tx.operation_data.to_user,
          transfer_type: tx.operation_data.transfer_type || 'transfer',
          timestamp: tx.timestamp,
          price: tx.operation_data.price,
          game_context: tx.operation_data.game_context,
          memo: tx.operation_data.memo
        }));

      // Find creation transaction to get first owner
      const creationTx = ownershipTransactions.find(tx => tx.operation_type === 'asset_mint');
      const firstOwner = creationTx ? asset.creator : asset.current_owner;

      return {
        universal_id: universalId,
        transfers: transfers.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
        current_owner: asset.current_owner,
        total_transfers: transfers.length,
        first_owner: firstOwner,
        created_at: asset.creation_timestamp
      };

    } catch (error) {
      Logger.error('Failed to get ownership history:', error);
      return null;
    }
  }

  /**
   * Gets all assets owned by a user
   */
  async getUserOwnedAssets(
    username: string,
    filters?: {
      domain?: string;
      game_id?: string;
      asset_type?: string;
      limit?: number;
    }
  ): Promise<UniversalAsset[]> {
    try {
      Logger.log('Getting user owned assets:', { username, filters });

      // Use registry service to get user assets
      const assets = await this.registryService.getUserAssets(username, filters);

      // Verify ownership for critical operations (sample a few)
      if (assets.length > 0) {
        const sampleSize = Math.min(3, assets.length);
        const sampleAssets = assets.slice(0, sampleSize);
        
        for (const asset of sampleAssets) {
          const verification = await this.verifyOwnership(asset.universal_id, username);
          if (!verification.valid) {
            Logger.warn('Ownership mismatch detected:', {
              universalId: asset.universal_id,
              expected_owner: username,
              actual_owner: verification.owner
            });
          }
        }
      }

      return assets;
    } catch (error) {
      Logger.error('Failed to get user owned assets:', error);
      return [];
    }
  }

  /**
   * Checks if a user can transfer an asset
   */
  async canUserTransferAsset(
    universalId: string,
    username: string,
    transferType: string = 'sale'
  ): Promise<{
    canTransfer: boolean;
    reasons?: string[];
    restrictions?: {
      tradeable: boolean;
      game_locked: boolean;
      pending_transfers: boolean;
    };
  }> {
    try {
      // Verify ownership
      const ownership = await this.verifyOwnership(universalId, username);
      if (!ownership.valid) {
        return {
          canTransfer: false,
          reasons: ['User does not own this asset']
        };
      }

      // Get asset details
      const asset = await this.registryService.getAsset(universalId);
      if (!asset) {
        return {
          canTransfer: false,
          reasons: ['Asset not found']
        };
      }

      const reasons: string[] = [];
      const restrictions = {
        tradeable: asset.properties.tradeable,
        game_locked: false,
        pending_transfers: false
      };

      // Check if asset is tradeable
      if (!asset.properties.tradeable && transferType === 'sale') {
        reasons.push('Asset is not tradeable');
      }

      // Check for game-specific locks
      for (const [gameId, variant] of Object.entries(asset.variants)) {
        if (variant.locked_until && new Date(variant.locked_until) > new Date()) {
          restrictions.game_locked = true;
          reasons.push(`Asset is locked in game ${gameId} until ${variant.locked_until}`);
        }
      }

      // In a full implementation, check for pending transfers
      // restrictions.pending_transfers = await this.hasPendingTransfers(universalId);

      return {
        canTransfer: reasons.length === 0,
        reasons: reasons.length > 0 ? reasons : undefined,
        restrictions
      };

    } catch (error) {
      Logger.error('Failed to check transfer eligibility:', error);
      return {
        canTransfer: false,
        reasons: [`Transfer eligibility check failed: ${error}`]
      };
    }
  }

  /**
   * Gets ownership statistics
   */
  getOwnershipStatistics(): {
    total_verifications: number;
    total_transfers: number;
    cache_hit_rate: number;
    cache_size: number;
  } {
    const totalRequests = this.verificationCount;
    const cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    return {
      total_verifications: this.verificationCount,
      total_transfers: this.transferCount,
      cache_hit_rate: cacheHitRate,
      cache_size: this.ownershipCache.size
    };
  }

  /**
   * Clears ownership cache
   */
  clearOwnershipCache(): void {
    this.ownershipCache.clear();
    Logger.log('Ownership cache cleared');
  }

  // Private helper methods

  private async validateTransferRequest(
    request: OwnershipTransferRequest,
    authorizedBy: string
  ): Promise<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!request.universal_id) {
      errors.push('Universal ID is required');
    }

    if (!request.current_owner || !request.new_owner) {
      errors.push('Both current owner and new owner are required');
    }

    if (request.current_owner === request.new_owner) {
      errors.push('Cannot transfer asset to the same owner');
    }

    if (!request.transfer_type) {
      errors.push('Transfer type is required');
    }

    // Authorization check
    if (authorizedBy !== request.current_owner) {
      errors.push('Transfer must be authorized by the current owner');
    }

    // Price validation for sales
    if (request.transfer_type === 'sale' && !request.price) {
      warnings.push('Sale transfer without price specified');
    }

    // Expiration validation
    if (request.expiration && new Date(request.expiration) <= new Date()) {
      errors.push('Transfer request has expired');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private clearAssetOwnershipCache(universalId: string): void {
    // Remove all cache entries for this asset
    const keysToDelete: string[] = [];
    for (const key of this.ownershipCache.keys()) {
      if (key.startsWith(universalId + ':')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.ownershipCache.delete(key));
  }
}