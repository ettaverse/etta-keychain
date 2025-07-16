/**
 * Asset Registry Service - Manages the asset registry system
 * 
 * Provides high-level operations for asset registration, discovery,
 * and management across domains and games.
 */

import { AssetBlockchainService } from './asset-blockchain.service';
import { 
  UniversalAsset, 
  GameInfo, 
  DomainInfo, 
  AssetFilters,
  AssetQueryResult,
  AssetStatistics
} from '../../../lib/assets/types';
import { AssetFactory, VariantFactory } from '../../../lib/assets/factories';
import { AssetValidator } from '../../../lib/assets/utils';
import Logger from '../../../src/utils/logger.utils';

export interface RegistryConfig {
  enableCaching: boolean;
  maxCacheSize: number;
  cacheExpiryMs: number;
  enableValidation: boolean;
  autoIndexing: boolean;
}

export interface RegistryStats {
  totalAssets: number;
  totalDomains: number;
  totalGames: number;
  assetsPerDomain: Record<string, number>;
  assetsPerGame: Record<string, number>;
  cacheHitRate: number;
}

export class AssetRegistryService {
  private static instance: AssetRegistryService;
  private blockchainService: AssetBlockchainService;
  private assetFactory: AssetFactory;
  private variantFactory: VariantFactory;
  private validator: AssetValidator;
  
  // Registry data
  private domainRegistry: Map<string, DomainInfo> = new Map();
  private gameRegistry: Map<string, GameInfo> = new Map();
  private assetIndex: Map<string, string[]> = new Map(); // domain/game -> asset IDs
  
  // Performance tracking
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  
  private config: RegistryConfig = {
    enableCaching: true,
    maxCacheSize: 10000,
    cacheExpiryMs: 5 * 60 * 1000, // 5 minutes
    enableValidation: true,
    autoIndexing: true
  };

  constructor(config?: Partial<RegistryConfig>) {
    this.blockchainService = AssetBlockchainService.getAssetInstance();
    this.assetFactory = new AssetFactory();
    this.variantFactory = new VariantFactory();
    this.validator = new AssetValidator();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.initializeRegistry();
  }

  static getInstance(config?: Partial<RegistryConfig>): AssetRegistryService {
    if (!AssetRegistryService.instance) {
      AssetRegistryService.instance = new AssetRegistryService(config);
    }
    return AssetRegistryService.instance;
  }

  /**
   * Registers a new asset in the registry
   */
  async registerAsset(
    asset: UniversalAsset,
    authorizedBy: string
  ): Promise<{ success: boolean; transactionId?: string; errors?: string[] }> {
    try {
      Logger.log('Registering asset:', asset.universal_id);
      
      // Validate asset if validation is enabled
      if (this.config.enableValidation) {
        const validation = this.validator.validateAsset(asset);
        if (!validation.valid) {
          return {
            success: false,
            errors: validation.errors.map(e => e.message)
          };
        }
      }
      
      // Check if asset already exists
      const existingAsset = await this.getAsset(asset.universal_id);
      if (existingAsset) {
        return {
          success: false,
          errors: [`Asset ${asset.universal_id} already exists`]
        };
      }
      
      // Store on blockchain
      const transactionId = await this.blockchainService.storeAsset(asset, authorizedBy);
      
      // Update indexes if auto-indexing is enabled
      if (this.config.autoIndexing) {
        await this.updateIndexes(asset);
      }
      
      Logger.log('Asset registered successfully:', { 
        universal_id: asset.universal_id, 
        transaction_id: transactionId 
      });
      
      return {
        success: true,
        transactionId
      };
    } catch (error) {
      Logger.error('Failed to register asset:', error);
      return {
        success: false,
        errors: [`Registration failed: ${error}`]
      };
    }
  }

  /**
   * Gets an asset by its universal ID
   */
  async getAsset(universalId: string): Promise<UniversalAsset | null> {
    try {
      const asset = await this.blockchainService.getAsset(universalId);
      
      if (asset) {
        this.cacheHits++;
      } else {
        this.cacheMisses++;
      }
      
      return asset;
    } catch (error) {
      Logger.error('Failed to get asset:', error);
      this.cacheMisses++;
      return null;
    }
  }

  /**
   * Searches assets by various criteria
   */
  async searchAssets(filters: AssetFilters): Promise<AssetQueryResult> {
    try {
      Logger.log('Searching assets with filters:', filters);
      
      // Convert filters to blockchain query
      const query = this.convertFiltersToQuery(filters);
      
      // Execute query
      const result = await this.blockchainService.queryAssets(query);
      
      // Apply additional filtering if needed
      const filteredAssets = this.applyAdvancedFilters(result.assets, filters);
      
      // Apply sorting
      const sortedAssets = this.sortAssets(filteredAssets, filters);
      
      // Apply pagination
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = (page - 1) * limit;
      const paginatedAssets = sortedAssets.slice(offset, offset + limit);
      
      return {
        assets: paginatedAssets,
        total_count: filteredAssets.length,
        page_info: {
          current_page: page,
          total_pages: Math.ceil(filteredAssets.length / limit),
          page_size: limit,
          has_next: offset + limit < filteredAssets.length,
          has_previous: page > 1
        }
      } as AssetQueryResult;
    } catch (error) {
      Logger.error('Asset search failed:', error);
      throw new Error(`Asset search failed: ${error}`);
    }
  }

  /**
   * Gets assets by domain
   */
  async getAssetsByDomain(domain: string, filters?: Partial<AssetFilters>): Promise<UniversalAsset[]> {
    const fullFilters: AssetFilters = {
      domain,
      ...filters
    };
    
    const result = await this.searchAssets(fullFilters);
    return result.assets;
  }

  /**
   * Gets assets by game
   */
  async getAssetsByGame(gameId: string, filters?: Partial<AssetFilters>): Promise<UniversalAsset[]> {
    const fullFilters: AssetFilters = {
      game_id: gameId,
      ...filters
    };
    
    const result = await this.searchAssets(fullFilters);
    return result.assets;
  }

  /**
   * Gets assets owned by a user
   */
  async getUserAssets(username: string, filters?: Partial<AssetFilters>): Promise<UniversalAsset[]> {
    const fullFilters: AssetFilters = {
      owner: username,
      ...filters
    };
    
    const result = await this.searchAssets(fullFilters);
    return result.assets;
  }

  /**
   * Registers a new domain
   */
  async registerDomain(domain: DomainInfo): Promise<boolean> {
    try {
      Logger.log('Registering domain:', domain.domain_id);
      
      // Validate domain
      if (this.domainRegistry.has(domain.domain_id)) {
        throw new Error(`Domain ${domain.domain_id} already exists`);
      }
      
      // Store in registry
      this.domainRegistry.set(domain.domain_id, domain);
      
      Logger.log('Domain registered successfully:', domain.domain_id);
      return true;
    } catch (error) {
      Logger.error('Failed to register domain:', error);
      return false;
    }
  }

  /**
   * Registers a new game
   */
  async registerGame(game: GameInfo): Promise<boolean> {
    try {
      Logger.log('Registering game:', game.game_id);
      
      // Validate game
      if (this.gameRegistry.has(game.game_id)) {
        throw new Error(`Game ${game.game_id} already exists`);
      }
      
      // Check if domain exists
      if (!this.domainRegistry.has(game.domain)) {
        Logger.warn(`Domain ${game.domain} not found, auto-creating`);
        // Auto-create domain if it doesn't exist
        await this.registerDomain({
          domain_id: game.domain,
          name: game.domain.charAt(0).toUpperCase() + game.domain.slice(1),
          description: `Auto-created domain for ${game.domain}`,
          properties: {
            primary_focus: game.domain,
            asset_categories: [],
            total_games: 1,
            total_assets: 0
          },
          games: [game.game_id],
          rules: {
            asset_requirements: {},
            cross_domain_allowed: true,
            moderation_required: false
          }
        });
      }
      
      // Store in registry
      this.gameRegistry.set(game.game_id, game);
      
      // Update domain's game list
      const domain = this.domainRegistry.get(game.domain);
      if (domain && !domain.games.includes(game.game_id)) {
        domain.games.push(game.game_id);
        domain.properties.total_games = domain.games.length;
      }
      
      Logger.log('Game registered successfully:', game.game_id);
      return true;
    } catch (error) {
      Logger.error('Failed to register game:', error);
      return false;
    }
  }

  /**
   * Gets all registered domains
   */
  getDomains(): DomainInfo[] {
    return Array.from(this.domainRegistry.values());
  }

  /**
   * Gets all registered games
   */
  getGames(domain?: string): GameInfo[] {
    const games = Array.from(this.gameRegistry.values());
    return domain ? games.filter(game => game.domain === domain) : games;
  }

  /**
   * Gets a specific domain
   */
  getDomain(domainId: string): DomainInfo | null {
    return this.domainRegistry.get(domainId) || null;
  }

  /**
   * Gets a specific game
   */
  getGame(gameId: string): GameInfo | null {
    return this.gameRegistry.get(gameId) || null;
  }

  /**
   * Gets registry statistics
   */
  async getRegistryStats(): Promise<RegistryStats> {
    const domains = this.getDomains();
    const games = this.getGames();
    
    // Get asset counts per domain and game
    const assetsPerDomain: Record<string, number> = {};
    const assetsPerGame: Record<string, number> = {};
    
    for (const domain of domains) {
      const domainAssets = await this.getAssetsByDomain(domain.domain_id);
      assetsPerDomain[domain.domain_id] = domainAssets.length;
    }
    
    for (const game of games) {
      const gameAssets = await this.getAssetsByGame(game.game_id);
      assetsPerGame[game.game_id] = gameAssets.length;
    }
    
    const totalAssets = Object.values(assetsPerDomain).reduce((sum, count) => sum + count, 0);
    const cacheHitRate = this.cacheHits + this.cacheMisses > 0 ? 
      this.cacheHits / (this.cacheHits + this.cacheMisses) : 0;
    
    return {
      totalAssets,
      totalDomains: domains.length,
      totalGames: games.length,
      assetsPerDomain,
      assetsPerGame,
      cacheHitRate
    };
  }

  /**
   * Gets asset statistics for a domain or game
   */
  async getAssetStatistics(domain?: string, gameId?: string): Promise<AssetStatistics> {
    const blockchainStats = await this.blockchainService.getAssetStatistics(domain, gameId);
    
    // Convert blockchain stats to full AssetStatistics interface
    return {
      total_assets: blockchainStats.total_assets,
      total_domains: 0,
      total_games: 0,
      total_creators: blockchainStats.creator_count || 0,
      
      by_domain: {},
      by_game: {},
      by_rarity: blockchainStats.rarity_distribution || {},
      by_element: {},
      by_asset_type: {},
      
      assets_created_today: 0,
      assets_transferred_today: 0,
      total_transactions: 0,
      
      total_market_value: blockchainStats.total_value,
      average_asset_value: undefined,
      price_ranges: undefined,
      
      // Quality Metrics
      average_essence_score: 0,
      power_tier_distribution: {},
      compatibility_coverage: 0
    };
  }

  /**
   * Updates asset ownership
   */
  async updateAssetOwnership(
    universalId: string,
    newOwner: string,
    authorizedBy: string
  ): Promise<boolean> {
    try {
      await this.blockchainService.recordAssetTransfer(
        universalId,
        authorizedBy,
        newOwner
      );
      return true;
    } catch (error) {
      Logger.error('Failed to update asset ownership:', error);
      return false;
    }
  }

  /**
   * Validates asset ownership
   */
  async validateOwnership(universalId: string, username: string): Promise<boolean> {
    return await this.blockchainService.verifyAssetOwnership(universalId, username);
  }

  /**
   * Clears all caches
   */
  clearCaches(): void {
    this.blockchainService.clearCache();
    this.assetIndex.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    Logger.log('Registry caches cleared');
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { 
    blockchain: any; 
    registry: { domains: number; games: number; indexes: number };
    performance: { hits: number; misses: number; hitRate: number };
  } {
    const blockchainStats = this.blockchainService.getCacheStats();
    const hitRate = this.cacheHits + this.cacheMisses > 0 ? 
      this.cacheHits / (this.cacheHits + this.cacheMisses) : 0;
    
    return {
      blockchain: blockchainStats,
      registry: {
        domains: this.domainRegistry.size,
        games: this.gameRegistry.size,
        indexes: this.assetIndex.size
      },
      performance: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate
      }
    };
  }

  // Private helper methods

  private async initializeRegistry(): Promise<void> {
    try {
      Logger.log('Initializing asset registry...');
      
      // Initialize with default domains and games
      await this.loadDefaultDomains();
      await this.loadDefaultGames();
      
      Logger.log('Asset registry initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize registry:', error);
    }
  }

  private async loadDefaultDomains(): Promise<void> {
    const defaultDomains: DomainInfo[] = [
      {
        domain_id: 'gaming',
        name: 'Gaming',
        description: 'Gaming assets including cards, characters, items, and collectibles',
        properties: {
          primary_focus: 'gaming',
          asset_categories: ['cards', 'characters', 'items', 'weapons', 'armor'],
          total_games: 0,
          total_assets: 0
        },
        games: [],
        rules: {
          asset_requirements: {},
          cross_domain_allowed: true,
          moderation_required: false
        }
      },
      {
        domain_id: 'music',
        name: 'Music',
        description: 'Music assets including songs, albums, beats, and licenses',
        properties: {
          primary_focus: 'music',
          asset_categories: ['songs', 'albums', 'beats', 'samples', 'licenses'],
          total_games: 0,
          total_assets: 0
        },
        games: [],
        rules: {
          asset_requirements: {},
          cross_domain_allowed: true,
          moderation_required: true
        }
      },
      {
        domain_id: 'collectibles',
        name: 'Collectibles',
        description: 'Digital collectibles including art, memorabilia, and unique items',
        properties: {
          primary_focus: 'collectibles',
          asset_categories: ['art', 'photography', 'memorabilia', 'trading_cards'],
          total_games: 0,
          total_assets: 0
        },
        games: [],
        rules: {
          asset_requirements: {},
          cross_domain_allowed: false,
          moderation_required: true
        }
      }
    ];

    for (const domain of defaultDomains) {
      await this.registerDomain(domain);
    }
  }

  private async loadDefaultGames(): Promise<void> {
    // In a real implementation, this would load from configuration
    // or fetch from a registry service
    Logger.log('Default games would be loaded here');
  }

  private convertFiltersToQuery(filters: AssetFilters): any {
    return {
      domain: filters.domain,
      game_id: filters.game_id,
      owner: filters.owner,
      creator: filters.creator,
      limit: filters.limit
    };
  }

  private applyAdvancedFilters(assets: UniversalAsset[], filters: AssetFilters): UniversalAsset[] {
    return assets.filter(asset => {
      // Power tier filters
      if (filters.power_tier_min !== undefined && 
          asset.core_essence.power_tier < filters.power_tier_min) {
        return false;
      }
      
      if (filters.power_tier_max !== undefined && 
          asset.core_essence.power_tier > filters.power_tier_max) {
        return false;
      }
      
      // Element filter
      if (filters.element && filters.element.length > 0) {
        if (!asset.core_essence.element || 
            !filters.element.includes(asset.core_essence.element)) {
          return false;
        }
      }
      
      // Rarity filter
      if (filters.rarity && filters.rarity.length > 0) {
        if (!filters.rarity.includes(asset.core_essence.rarity_class)) {
          return false;
        }
      }
      
      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasAllTags = filters.tags.every(tag => 
          asset.base_metadata.tags.includes(tag)
        );
        if (!hasAllTags) {
          return false;
        }
      }
      
      // Tradeable filter
      if (filters.tradeable !== undefined && 
          asset.properties.tradeable !== filters.tradeable) {
        return false;
      }
      
      return true;
    });
  }

  private sortAssets(assets: UniversalAsset[], filters: AssetFilters): UniversalAsset[] {
    if (!filters.sort_by) {
      return assets;
    }
    
    const sortOrder = filters.sort_order === 'desc' ? -1 : 1;
    
    return assets.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sort_by) {
        case 'name':
          comparison = a.base_metadata.name.localeCompare(b.base_metadata.name);
          break;
        case 'created_date':
          comparison = new Date(a.creation_timestamp).getTime() - 
                      new Date(b.creation_timestamp).getTime();
          break;
        case 'power_tier':
          comparison = a.core_essence.power_tier - b.core_essence.power_tier;
          break;
        case 'rarity_score':
          comparison = a.properties.rarity.score - b.properties.rarity.score;
          break;
        case 'essence_score':
          comparison = a.core_essence.essence_score - b.core_essence.essence_score;
          break;
        default:
          return 0;
      }
      
      return comparison * sortOrder;
    });
  }

  private async updateIndexes(asset: UniversalAsset): Promise<void> {
    // Update domain index
    const domainKey = `domain:${asset.domain}`;
    if (!this.assetIndex.has(domainKey)) {
      this.assetIndex.set(domainKey, []);
    }
    this.assetIndex.get(domainKey)!.push(asset.universal_id);
    
    // Update game indexes
    for (const gameId of Object.keys(asset.variants)) {
      const gameKey = `game:${gameId}`;
      if (!this.assetIndex.has(gameKey)) {
        this.assetIndex.set(gameKey, []);
      }
      this.assetIndex.get(gameKey)!.push(asset.universal_id);
    }
  }
}