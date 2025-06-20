/**
 * Asset Blockchain Service - Handles asset operations on the STEEM blockchain
 * 
 * Extends the base STEEM API service with asset-specific blockchain operations
 * including custom JSON operations for asset management, storage, and queries.
 */

import { SteemApiService } from './steem-api.service';
import { call } from '@steempro/steem-tx-js';
import { UniversalAsset, AssetTransaction, GameVariant, AssetCreationRequest } from '../../../lib/assets/types';
import Logger from '../../../src/utils/logger.utils';

export interface AssetCustomJsonOperation {
  operation_type: 'asset_mint' | 'asset_transfer' | 'asset_convert' | 'asset_update' | 'asset_burn';
  universal_id: string;
  data: Record<string, any>;
  timestamp: string;
  version: string;
}

export interface AssetRegistryQuery {
  domain?: string;
  game_id?: string;
  owner?: string;
  creator?: string;
  limit?: number;
  start_id?: string;
}

export interface AssetQueryResult {
  assets: UniversalAsset[];
  total_count: number;
  next_start_id?: string;
}

export class AssetBlockchainService extends SteemApiService {
  private static assetInstance: AssetBlockchainService;
  
  // Asset registry configuration
  private readonly ASSET_REGISTRY_ID = 'etta_asset_registry';
  private readonly ASSET_OPERATION_ID = 'etta_asset_op';
  private readonly CURRENT_VERSION = '1.0.0';
  
  // Operation caching
  private assetCache: Map<string, UniversalAsset> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getAssetInstance(): AssetBlockchainService {
    if (!AssetBlockchainService.assetInstance) {
      AssetBlockchainService.assetInstance = new AssetBlockchainService();
    }
    return AssetBlockchainService.assetInstance;
  }

  /**
   * Stores a new asset on the blockchain via custom JSON
   */
  async storeAsset(asset: UniversalAsset, authorizedBy: string): Promise<string> {
    const customJsonData: AssetCustomJsonOperation = {
      operation_type: 'asset_mint',
      universal_id: asset.universal_id,
      data: {
        asset: asset,
        creator: asset.creator,
        domain: asset.domain
      },
      timestamp: new Date().toISOString(),
      version: this.CURRENT_VERSION
    };

    try {
      Logger.log('Storing asset on blockchain:', asset.universal_id);
      
      const transaction = await this.createCustomJsonTransaction(
        authorizedBy,
        this.ASSET_REGISTRY_ID,
        customJsonData
      );

      const result = await this.broadcastTransaction(transaction);
      
      // Update cache
      this.assetCache.set(asset.universal_id, asset);
      
      Logger.log('Asset stored successfully:', { 
        universal_id: asset.universal_id, 
        transaction_id: result.id 
      });
      
      return result.id;
    } catch (error) {
      Logger.error('Failed to store asset:', error);
      throw new Error(`Failed to store asset ${asset.universal_id}: ${error}`);
    }
  }

  /**
   * Updates an existing asset on the blockchain
   */
  async updateAsset(
    universalId: string,
    updates: Partial<UniversalAsset>,
    authorizedBy: string
  ): Promise<string> {
    const customJsonData: AssetCustomJsonOperation = {
      operation_type: 'asset_update',
      universal_id: universalId,
      data: {
        updates,
        authorized_by: authorizedBy
      },
      timestamp: new Date().toISOString(),
      version: this.CURRENT_VERSION
    };

    try {
      Logger.log('Updating asset on blockchain:', universalId);
      
      const transaction = await this.createCustomJsonTransaction(
        authorizedBy,
        this.ASSET_REGISTRY_ID,
        customJsonData
      );

      const result = await this.broadcastTransaction(transaction);
      
      // Update cache if asset exists
      if (this.assetCache.has(universalId)) {
        const cachedAsset = this.assetCache.get(universalId)!;
        this.assetCache.set(universalId, { ...cachedAsset, ...updates });
      }
      
      Logger.log('Asset updated successfully:', { 
        universal_id: universalId, 
        transaction_id: result.id 
      });
      
      return result.id;
    } catch (error) {
      Logger.error('Failed to update asset:', error);
      throw new Error(`Failed to update asset ${universalId}: ${error}`);
    }
  }

  /**
   * Records an asset transfer on the blockchain
   */
  async recordAssetTransfer(
    universalId: string,
    fromUser: string,
    toUser: string,
    gameContext?: string,
    price?: { amount: string; currency: string },
    memo?: string
  ): Promise<string> {
    const customJsonData: AssetCustomJsonOperation = {
      operation_type: 'asset_transfer',
      universal_id: universalId,
      data: {
        from_user: fromUser,
        to_user: toUser,
        game_context: gameContext,
        price: price,
        memo: memo
      },
      timestamp: new Date().toISOString(),
      version: this.CURRENT_VERSION
    };

    try {
      Logger.log('Recording asset transfer:', { universalId, fromUser, toUser });
      
      const transaction = await this.createCustomJsonTransaction(
        fromUser,
        this.ASSET_OPERATION_ID,
        customJsonData
      );

      const result = await this.broadcastTransaction(transaction);
      
      // Update cache if asset exists
      if (this.assetCache.has(universalId)) {
        const cachedAsset = this.assetCache.get(universalId)!;
        cachedAsset.current_owner = toUser;
        this.assetCache.set(universalId, cachedAsset);
      }
      
      Logger.log('Transfer recorded successfully:', { 
        universal_id: universalId, 
        transaction_id: result.id 
      });
      
      return result.id;
    } catch (error) {
      Logger.error('Failed to record transfer:', error);
      throw new Error(`Failed to record transfer for ${universalId}: ${error}`);
    }
  }

  /**
   * Records an asset conversion between games
   */
  async recordAssetConversion(
    universalId: string,
    fromGame: string,
    toGame: string,
    newVariant: GameVariant,
    conversionCost: { amount: string; currency: string },
    authorizedBy: string
  ): Promise<string> {
    const customJsonData: AssetCustomJsonOperation = {
      operation_type: 'asset_convert',
      universal_id: universalId,
      data: {
        from_game: fromGame,
        to_game: toGame,
        new_variant: newVariant,
        conversion_cost: conversionCost,
        authorized_by: authorizedBy
      },
      timestamp: new Date().toISOString(),
      version: this.CURRENT_VERSION
    };

    try {
      Logger.log('Recording asset conversion:', { universalId, fromGame, toGame });
      
      const transaction = await this.createCustomJsonTransaction(
        authorizedBy,
        this.ASSET_OPERATION_ID,
        customJsonData
      );

      const result = await this.broadcastTransaction(transaction);
      
      Logger.log('Conversion recorded successfully:', { 
        universal_id: universalId, 
        transaction_id: result.id 
      });
      
      return result.id;
    } catch (error) {
      Logger.error('Failed to record conversion:', error);
      throw new Error(`Failed to record conversion for ${universalId}: ${error}`);
    }
  }

  /**
   * Records asset burning/destruction
   */
  async recordAssetBurn(
    universalId: string,
    authorizedBy: string,
    reason?: string
  ): Promise<string> {
    const customJsonData: AssetCustomJsonOperation = {
      operation_type: 'asset_burn',
      universal_id: universalId,
      data: {
        authorized_by: authorizedBy,
        burn_reason: reason
      },
      timestamp: new Date().toISOString(),
      version: this.CURRENT_VERSION
    };

    try {
      Logger.log('Recording asset burn:', { universalId, authorizedBy });
      
      const transaction = await this.createCustomJsonTransaction(
        authorizedBy,
        this.ASSET_OPERATION_ID,
        customJsonData
      );

      const result = await this.broadcastTransaction(transaction);
      
      // Remove from cache
      this.assetCache.delete(universalId);
      
      Logger.log('Asset burn recorded successfully:', { 
        universal_id: universalId, 
        transaction_id: result.id 
      });
      
      return result.id;
    } catch (error) {
      Logger.error('Failed to record asset burn:', error);
      throw new Error(`Failed to record burn for ${universalId}: ${error}`);
    }
  }

  /**
   * Retrieves an asset from the blockchain
   */
  async getAsset(universalId: string): Promise<UniversalAsset | null> {
    // Check cache first
    if (this.assetCache.has(universalId) && this.isCacheValid()) {
      Logger.log('Asset retrieved from cache:', universalId);
      return this.assetCache.get(universalId)!;
    }

    try {
      Logger.log('Querying asset from blockchain:', universalId);
      
      const asset = await this.queryAssetFromBlockchain(universalId);
      
      if (asset) {
        this.assetCache.set(universalId, asset);
      }
      
      return asset;
    } catch (error) {
      Logger.error('Failed to get asset:', error);
      return null;
    }
  }

  /**
   * Queries assets by various criteria
   */
  async queryAssets(query: AssetRegistryQuery): Promise<AssetQueryResult> {
    try {
      Logger.log('Querying assets with criteria:', query);
      
      // In a full implementation, this would query the blockchain
      // For now, return cached assets that match the criteria
      const allAssets = Array.from(this.assetCache.values());
      const filteredAssets = this.filterAssetsByQuery(allAssets, query);
      
      // Apply limit
      const limit = query.limit || 20;
      const assets = filteredAssets.slice(0, limit);
      
      return {
        assets,
        total_count: filteredAssets.length,
        next_start_id: assets.length < filteredAssets.length ? 
          filteredAssets[assets.length].universal_id : undefined
      };
    } catch (error) {
      Logger.error('Failed to query assets:', error);
      throw new Error(`Asset query failed: ${error}`);
    }
  }

  /**
   * Gets assets owned by a specific user
   */
  async getUserAssets(username: string, domain?: string): Promise<UniversalAsset[]> {
    const query: AssetRegistryQuery = {
      owner: username,
      domain: domain
    };

    const result = await this.queryAssets(query);
    return result.assets;
  }

  /**
   * Gets assets in a specific domain
   */
  async getDomainAssets(domain: string, limit?: number): Promise<UniversalAsset[]> {
    const query: AssetRegistryQuery = {
      domain: domain,
      limit: limit
    };

    const result = await this.queryAssets(query);
    return result.assets;
  }

  /**
   * Gets assets for a specific game
   */
  async getGameAssets(gameId: string, limit?: number): Promise<UniversalAsset[]> {
    const query: AssetRegistryQuery = {
      game_id: gameId,
      limit: limit
    };

    const result = await this.queryAssets(query);
    return result.assets;
  }

  /**
   * Gets transaction history for an asset
   */
  async getAssetHistory(universalId: string): Promise<AssetTransaction[]> {
    try {
      Logger.log('Getting asset history:', universalId);
      
      // Query custom JSON operations related to this asset
      const history = await this.queryAssetTransactionHistory(universalId);
      
      return history;
    } catch (error) {
      Logger.error('Failed to get asset history:', error);
      return [];
    }
  }

  /**
   * Verifies asset ownership
   */
  async verifyAssetOwnership(universalId: string, username: string): Promise<boolean> {
    try {
      const asset = await this.getAsset(universalId);
      return asset ? asset.current_owner === username : false;
    } catch (error) {
      Logger.error('Failed to verify asset ownership:', error);
      return false;
    }
  }

  /**
   * Gets asset statistics for a domain or game
   */
  async getAssetStatistics(domain?: string, gameId?: string): Promise<{
    total_assets: number;
    total_value?: { amount: string; currency: string };
    rarity_distribution: Record<string, number>;
    creator_count: number;
  }> {
    try {
      const query: AssetRegistryQuery = { domain, game_id: gameId };
      const result = await this.queryAssets(query);
      
      const assets = result.assets;
      const rarityDistribution: Record<string, number> = {};
      const creators = new Set<string>();
      
      assets.forEach(asset => {
        rarityDistribution[asset.core_essence.rarity_class] = 
          (rarityDistribution[asset.core_essence.rarity_class] || 0) + 1;
        creators.add(asset.creator);
      });
      
      return {
        total_assets: assets.length,
        rarity_distribution: rarityDistribution,
        creator_count: creators.size
      };
    } catch (error) {
      Logger.error('Failed to get asset statistics:', error);
      throw new Error(`Failed to get asset statistics: ${error}`);
    }
  }

  /**
   * Clears the asset cache
   */
  clearCache(): void {
    this.assetCache.clear();
    this.lastCacheUpdate = 0;
    Logger.log('Asset cache cleared');
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; lastUpdate: number; isValid: boolean } {
    return {
      size: this.assetCache.size,
      lastUpdate: this.lastCacheUpdate,
      isValid: this.isCacheValid()
    };
  }

  // Private helper methods

  private async createCustomJsonTransaction(
    username: string,
    customJsonId: string,
    data: any
  ): Promise<any> {
    const dynamicProps = await this.getDynamicGlobalProperties();
    const refBlock = await this.getRefBlockHeader(dynamicProps.head_block_number);
    
    const expiration = new Date(Date.now() + 60000); // 1 minute
    
    return {
      ref_block_num: refBlock.ref_block_num,
      ref_block_prefix: refBlock.ref_block_prefix,
      expiration: expiration.toISOString().slice(0, 19),
      operations: [
        [
          'custom_json',
          {
            required_auths: [],
            required_posting_auths: [username],
            id: customJsonId,
            json: JSON.stringify(data)
          }
        ]
      ],
      extensions: []
    };
  }

  private async queryAssetFromBlockchain(universalId: string): Promise<UniversalAsset | null> {
    // In a full implementation, this would query blockchain data
    // This would involve searching through custom JSON operations
    // to find asset creation and updates
    
    try {
      // Search for asset in recent custom JSON operations
      // This is a simplified implementation
      const accountHistory = await this.getAccountHistory('etta-keychain', -1, 1000);
      
      for (const [, op] of accountHistory) {
        if (op[0] === 'custom_json' && 
            (op[1].id === this.ASSET_REGISTRY_ID || op[1].id === this.ASSET_OPERATION_ID)) {
          try {
            const jsonData = JSON.parse(op[1].json) as AssetCustomJsonOperation;
            if (jsonData.universal_id === universalId && jsonData.operation_type === 'asset_mint') {
              return jsonData.data.asset as UniversalAsset;
            }
          } catch (parseError) {
            Logger.warn('Failed to parse custom JSON:', parseError);
          }
        }
      }
      
      return null;
    } catch (error) {
      Logger.error('Error querying asset from blockchain:', error);
      return null;
    }
  }

  private async queryAssetTransactionHistory(universalId: string): Promise<AssetTransaction[]> {
    const transactions: AssetTransaction[] = [];
    
    try {
      // Search for asset operations in blockchain history
      const accountHistory = await this.getAccountHistory('etta-keychain', -1, 1000);
      
      for (const [trxId, op] of accountHistory) {
        if (op[0] === 'custom_json' && 
            (op[1].id === this.ASSET_REGISTRY_ID || op[1].id === this.ASSET_OPERATION_ID)) {
          try {
            const jsonData = JSON.parse(op[1].json) as AssetCustomJsonOperation;
            if (jsonData.universal_id === universalId) {
              transactions.push({
                transaction_id: String(trxId),
                operation_type: jsonData.operation_type,
                timestamp: jsonData.timestamp,
                operation_data: jsonData.data,
                success: true
              });
            }
          } catch (parseError) {
            Logger.warn('Failed to parse transaction JSON:', parseError);
          }
        }
      }
      
      return transactions.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      Logger.error('Error querying asset transaction history:', error);
      return [];
    }
  }

  private filterAssetsByQuery(assets: UniversalAsset[], query: AssetRegistryQuery): UniversalAsset[] {
    return assets.filter(asset => {
      if (query.domain && asset.domain !== query.domain) return false;
      if (query.owner && asset.current_owner !== query.owner) return false;
      if (query.creator && asset.creator !== query.creator) return false;
      if (query.game_id && !asset.variants[query.game_id]) return false;
      
      return true;
    });
  }

  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.CACHE_TTL;
  }
}