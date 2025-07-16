/**
 * Asset Discovery Service - Handles asset search, filtering, and discovery
 * 
 * Provides advanced search capabilities, recommendation engines, and discovery
 * features for Universal Assets across games and domains.
 */

import { AssetRegistryService } from '../asset-registry.service';
import { AssetBlockchainService } from '../asset-blockchain.service';
import { 
  UniversalAsset, 
  AssetFilters, 
  AssetQueryResult,
  GameInfo,
  DomainInfo 
} from '../../../../lib/assets/types';
import Logger from '../../../../src/utils/logger.utils';

export interface AdvancedSearchFilters extends AssetFilters {
  // Text search
  search_text?: string;
  name_contains?: string;
  description_contains?: string;
  
  // Numeric ranges
  essence_score_min?: number;
  essence_score_max?: number;
  creation_date_from?: string;
  creation_date_to?: string;
  
  // Boolean filters
  has_cross_game_variants?: boolean;
  is_tradeable?: boolean;
  has_web2_integration?: boolean;
  
  // Advanced filters
  similar_to_asset?: string; // Find assets similar to this one
  compatible_with_game?: string; // Find assets compatible with this game
  exclude_owners?: string[]; // Exclude assets owned by these users
  
  // Sorting and grouping
  group_by?: 'domain' | 'game' | 'rarity' | 'creator' | 'power_tier';
  include_statistics?: boolean;
}

export interface SearchResult extends AssetQueryResult {
  search_metadata: {
    query_time_ms: number;
    total_scanned: number;
    filters_applied: string[];
    suggestions?: string[];
  };
  grouped_results?: Record<string, UniversalAsset[]>;
  statistics?: {
    rarity_distribution: Record<string, number>;
    domain_distribution: Record<string, number>;
    average_power_tier: number;
    price_range?: { min: number; max: number; currency: string };
  };
}

export interface AssetRecommendation {
  asset: UniversalAsset;
  reason: string;
  confidence_score: number;
  similarity_factors: string[];
}

export interface DiscoveryContext {
  user_interests?: string[];
  owned_assets?: string[];
  preferred_games?: string[];
  budget_range?: { min: number; max: number; currency: string };
  play_style?: 'casual' | 'competitive' | 'collector' | 'trader';
}

export class AssetDiscoveryService {
  private static instance: AssetDiscoveryService;
  private registryService: AssetRegistryService;
  private blockchainService: AssetBlockchainService;
  
  // Search performance tracking
  private searchCount: number = 0;
  private totalSearchTime: number = 0;
  private popularSearches: Map<string, number> = new Map();
  
  // Recommendation caching
  private recommendationCache: Map<string, { recommendations: AssetRecommendation[]; expires: number }> = new Map();
  private readonly RECOMMENDATION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.registryService = AssetRegistryService.getInstance();
    this.blockchainService = AssetBlockchainService.getAssetInstance();
  }

  static getInstance(): AssetDiscoveryService {
    if (!AssetDiscoveryService.instance) {
      AssetDiscoveryService.instance = new AssetDiscoveryService();
    }
    return AssetDiscoveryService.instance;
  }

  /**
   * Advanced asset search with comprehensive filtering
   */
  async searchAssets(filters: AdvancedSearchFilters): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      Logger.log('Performing advanced asset search:', filters);
      
      // Track search for analytics
      this.trackSearch(filters);
      
      // Convert advanced filters to basic filters for registry
      const basicFilters = this.convertAdvancedFilters(filters);
      
      // Get initial results from registry
      const registryResult = await this.registryService.searchAssets(basicFilters);
      
      // Apply advanced filtering that registry doesn't support
      let filteredAssets = await this.applyAdvancedFiltering(registryResult.assets, filters);
      
      // Apply text search if specified
      if (filters.search_text || filters.name_contains || filters.description_contains) {
        filteredAssets = this.applyTextSearch(filteredAssets, filters);
      }
      
      // Apply similarity search if specified
      if (filters.similar_to_asset) {
        filteredAssets = await this.applySimilaritySearch(filteredAssets, filters.similar_to_asset);
      }
      
      // Apply game compatibility filtering
      if (filters.compatible_with_game) {
        filteredAssets = await this.applyCompatibilityFiltering(filteredAssets, filters.compatible_with_game);
      }
      
      // Group results if requested
      let groupedResults: Record<string, UniversalAsset[]> | undefined;
      if (filters.group_by) {
        groupedResults = this.groupAssets(filteredAssets, filters.group_by);
      }
      
      // Calculate statistics if requested
      let statistics: SearchResult['statistics'] | undefined;
      if (filters.include_statistics) {
        statistics = this.calculateStatistics(filteredAssets);
      }
      
      // Apply final sorting and pagination
      const sortedAssets = this.sortAssets(filteredAssets, filters);
      const paginatedAssets = this.paginateResults(sortedAssets, filters);
      
      const searchTime = Date.now() - startTime;
      this.updateSearchStatistics(searchTime);
      
      const result: SearchResult = {
        assets: paginatedAssets,
        total_count: filteredAssets.length,
        page_info: {
          current_page: filters.page || 1,
          total_pages: Math.ceil(filteredAssets.length / (filters.limit || 20)),
          page_size: filters.limit || 20,
          has_next: (filters.page || 1) * (filters.limit || 20) < filteredAssets.length,
          has_previous: (filters.page || 1) > 1
        },
        applied_filters: filters,
        search_metadata: {
          query_time_ms: searchTime,
          total_scanned: registryResult.total_count,
          filters_applied: this.getAppliedFilters(filters),
          suggestions: this.generateSearchSuggestions(filters, filteredAssets.length)
        },
        grouped_results: groupedResults,
        statistics
      };
      
      Logger.log('Asset search completed:', {
        total_found: result.total_count,
        page_size: result.assets.length,
        query_time_ms: searchTime
      });
      
      return result;
      
    } catch (error) {
      Logger.error('Asset search failed:', error);
      throw new Error(`Asset search failed: ${error}`);
    }
  }

  /**
   * Gets asset recommendations for a user based on context
   */
  async getRecommendations(
    username: string,
    context: DiscoveryContext,
    limit: number = 10
  ): Promise<AssetRecommendation[]> {
    try {
      const cacheKey = `${username}:${JSON.stringify(context)}:${limit}`;
      
      // Check cache first
      const cached = this.recommendationCache.get(cacheKey);
      if (cached && Date.now() < cached.expires) {
        Logger.log('Recommendations retrieved from cache:', username);
        return cached.recommendations;
      }
      
      Logger.log('Generating asset recommendations:', { username, context });
      
      const recommendations: AssetRecommendation[] = [];
      
      // Get user's owned assets for context
      const ownedAssets = context.owned_assets ? 
        await Promise.all(context.owned_assets.map(id => this.registryService.getAsset(id))) :
        await this.registryService.getUserAssets(username);
      
      const validOwnedAssets = ownedAssets.filter((asset): asset is UniversalAsset => asset !== null);
      
      // Strategy 1: Similar assets based on owned assets
      if (validOwnedAssets.length > 0) {
        const similarAssets = await this.findSimilarAssets(validOwnedAssets, limit / 2);
        recommendations.push(...similarAssets);
      }
      
      // Strategy 2: Popular assets in user's preferred games
      if (context.preferred_games && context.preferred_games.length > 0) {
        const gameRecommendations = await this.getGameBasedRecommendations(
          context.preferred_games,
          limit / 3
        );
        recommendations.push(...gameRecommendations);
      }
      
      // Strategy 3: Assets matching user interests
      if (context.user_interests && context.user_interests.length > 0) {
        const interestRecommendations = await this.getInterestBasedRecommendations(
          context.user_interests,
          limit / 3
        );
        recommendations.push(...interestRecommendations);
      }
      
      // Strategy 4: Budget-appropriate assets
      if (context.budget_range) {
        const budgetRecommendations = await this.getBudgetBasedRecommendations(
          context.budget_range,
          validOwnedAssets,
          limit / 4
        );
        recommendations.push(...budgetRecommendations);
      }
      
      // Remove duplicates and sort by confidence
      const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
      const sortedRecommendations = uniqueRecommendations
        .sort((a, b) => b.confidence_score - a.confidence_score)
        .slice(0, limit);
      
      // Cache recommendations
      this.recommendationCache.set(cacheKey, {
        recommendations: sortedRecommendations,
        expires: Date.now() + this.RECOMMENDATION_CACHE_TTL
      });
      
      Logger.log('Generated recommendations:', {
        username,
        count: sortedRecommendations.length,
        strategies_used: ['similar', 'game-based', 'interest-based', 'budget-based'].filter(Boolean)
      });
      
      return sortedRecommendations;
      
    } catch (error) {
      Logger.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Discovers trending assets across domains and games
   */
  async getTrendingAssets(
    domain?: string,
    gameId?: string,
    timeframe: 'day' | 'week' | 'month' = 'week',
    limit: number = 20
  ): Promise<{
    assets: UniversalAsset[];
    trend_data: Array<{
      universal_id: string;
      trend_score: number;
      transfer_count: number;
      view_count?: number;
      price_change?: number;
    }>;
  }> {
    try {
      Logger.log('Getting trending assets:', { domain, gameId, timeframe });
      
      // Get assets from specified domain/game
      const filters: AssetFilters = { domain, game_id: gameId };
      const searchResult = await this.registryService.searchAssets(filters);
      
      // Calculate trend scores based on activity
      const trendData = await Promise.all(
        searchResult.assets.map(async (asset) => {
          const history = await this.blockchainService.getAssetHistory(asset.universal_id);
          
          // Count recent transfers based on timeframe
          const cutoffDate = this.getTimeframeCutoff(timeframe);
          const recentTransfers = history.filter(tx => 
            tx.operation_type === 'transfer' && 
            new Date(tx.timestamp) > cutoffDate
          );
          
          // Calculate trend score (simple algorithm)
          const transferCount = recentTransfers.length;
          const recencyBoost = Math.max(0, 7 - Math.floor((Date.now() - new Date(asset.creation_timestamp).getTime()) / (24 * 60 * 60 * 1000)));
          const rarityBoost = this.getRarityBoost(asset.core_essence.rarity_class);
          
          const trendScore = (transferCount * 10) + recencyBoost + rarityBoost;
          
          return {
            universal_id: asset.universal_id,
            trend_score: trendScore,
            transfer_count: transferCount,
            asset: asset
          };
        })
      );
      
      // Sort by trend score and limit results
      const sortedTrends = trendData
        .sort((a, b) => b.trend_score - a.trend_score)
        .slice(0, limit);
      
      return {
        assets: sortedTrends.map(trend => trend.asset),
        trend_data: sortedTrends.map(({ asset, ...trendInfo }) => trendInfo)
      };
      
    } catch (error) {
      Logger.error('Failed to get trending assets:', error);
      return { assets: [], trend_data: [] };
    }
  }

  /**
   * Discovers new assets in specified domains or games
   */
  async getNewAssets(
    domain?: string,
    gameId?: string,
    daysBack: number = 7,
    limit: number = 20
  ): Promise<UniversalAsset[]> {
    try {
      Logger.log('Getting new assets:', { domain, gameId, daysBack });
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      
      const filters: AdvancedSearchFilters = {
        domain,
        game_id: gameId,
        creation_date_from: cutoffDate.toISOString(),
        sort_by: 'created_date',
        sort_order: 'desc',
        limit
      };
      
      const result = await this.searchAssets(filters);
      return result.assets;
      
    } catch (error) {
      Logger.error('Failed to get new assets:', error);
      return [];
    }
  }

  /**
   * Gets discovery statistics
   */
  getDiscoveryStatistics(): {
    total_searches: number;
    average_search_time_ms: number;
    popular_searches: Array<{ query: string; count: number }>;
    recommendation_cache_size: number;
  } {
    const averageSearchTime = this.searchCount > 0 ? this.totalSearchTime / this.searchCount : 0;
    
    const popularSearches = Array.from(this.popularSearches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));
    
    return {
      total_searches: this.searchCount,
      average_search_time_ms: averageSearchTime,
      popular_searches: popularSearches,
      recommendation_cache_size: this.recommendationCache.size
    };
  }

  /**
   * Clears discovery caches
   */
  clearDiscoveryCache(): void {
    this.recommendationCache.clear();
    Logger.log('Discovery cache cleared');
  }

  // Private helper methods

  private convertAdvancedFilters(filters: AdvancedSearchFilters): AssetFilters {
    return {
      domain: filters.domain,
      game_id: filters.game_id,
      owner: filters.owner,
      creator: filters.creator,
      asset_type: filters.asset_type,
      element: filters.element,
      rarity: filters.rarity,
      tags: filters.tags,
      power_tier_min: filters.power_tier_min,
      power_tier_max: filters.power_tier_max,
      tradeable: filters.tradeable,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
      page: filters.page,
      limit: filters.limit
    };
  }

  private async applyAdvancedFiltering(assets: UniversalAsset[], filters: AdvancedSearchFilters): Promise<UniversalAsset[]> {
    return assets.filter(asset => {
      // Essence score range
      if (filters.essence_score_min !== undefined && asset.core_essence.essence_score < filters.essence_score_min) return false;
      if (filters.essence_score_max !== undefined && asset.core_essence.essence_score > filters.essence_score_max) return false;
      
      // Creation date range
      if (filters.creation_date_from && new Date(asset.creation_timestamp) < new Date(filters.creation_date_from)) return false;
      if (filters.creation_date_to && new Date(asset.creation_timestamp) > new Date(filters.creation_date_to)) return false;
      
      // Boolean filters
      if (filters.has_cross_game_variants !== undefined) {
        const hasMultipleVariants = Object.keys(asset.variants).length > 1;
        if (filters.has_cross_game_variants !== hasMultipleVariants) return false;
      }
      
      if (filters.is_tradeable !== undefined && asset.properties.tradeable !== filters.is_tradeable) return false;
      if (filters.has_web2_integration !== undefined && !!asset.web2_integration !== filters.has_web2_integration) return false;
      
      // Exclude owners
      if (filters.exclude_owners && filters.exclude_owners.includes(asset.current_owner)) return false;
      
      return true;
    });
  }

  private applyTextSearch(assets: UniversalAsset[], filters: AdvancedSearchFilters): UniversalAsset[] {
    return assets.filter(asset => {
      if (filters.search_text) {
        const searchText = filters.search_text.toLowerCase();
        const searchableText = [
          asset.base_metadata.name,
          asset.base_metadata.description,
          ...asset.base_metadata.tags
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchText)) return false;
      }
      
      if (filters.name_contains && !asset.base_metadata.name.toLowerCase().includes(filters.name_contains.toLowerCase())) return false;
      if (filters.description_contains && !asset.base_metadata.description.toLowerCase().includes(filters.description_contains.toLowerCase())) return false;
      
      return true;
    });
  }

  private async applySimilaritySearch(assets: UniversalAsset[], similarToId: string): Promise<UniversalAsset[]> {
    try {
      const targetAsset = await this.registryService.getAsset(similarToId);
      if (!targetAsset) return assets;
      
      return assets
        .map(asset => ({
          asset,
          similarity: this.calculateAssetSimilarity(asset, targetAsset)
        }))
        .filter(item => item.similarity > 0.3)
        .sort((a, b) => b.similarity - a.similarity)
        .map(item => item.asset);
        
    } catch (error) {
      Logger.warn('Similarity search failed:', error);
      return assets;
    }
  }

  private async applyCompatibilityFiltering(assets: UniversalAsset[], gameId: string): Promise<UniversalAsset[]> {
    try {
      const game = this.registryService.getGame(gameId);
      if (!game) return assets;
      
      return assets.filter(asset => {
        // Check if asset archetype is supported by the game
        return game.asset_integration.supported_asset_types.includes(asset.core_essence.archetype);
      });
      
    } catch (error) {
      Logger.warn('Compatibility filtering failed:', error);
      return assets;
    }
  }

  private groupAssets(assets: UniversalAsset[], groupBy: string): Record<string, UniversalAsset[]> {
    const groups: Record<string, UniversalAsset[]> = {};
    
    assets.forEach(asset => {
      let key: string;
      
      switch (groupBy) {
        case 'domain':
          key = asset.domain;
          break;
        case 'rarity':
          key = asset.core_essence.rarity_class;
          break;
        case 'creator':
          key = asset.creator;
          break;
        case 'power_tier':
          key = Math.floor(asset.core_essence.power_tier / 10) * 10 + '-' + (Math.floor(asset.core_essence.power_tier / 10) * 10 + 9);
          break;
        case 'game':
          key = Object.keys(asset.variants)[0] || 'unknown';
          break;
        default:
          key = 'all';
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(asset);
    });
    
    return groups;
  }

  private calculateStatistics(assets: UniversalAsset[]): SearchResult['statistics'] {
    const rarityDistribution: Record<string, number> = {};
    const domainDistribution: Record<string, number> = {};
    let totalPowerTier = 0;
    
    assets.forEach(asset => {
      rarityDistribution[asset.core_essence.rarity_class] = 
        (rarityDistribution[asset.core_essence.rarity_class] || 0) + 1;
      
      domainDistribution[asset.domain] = 
        (domainDistribution[asset.domain] || 0) + 1;
      
      totalPowerTier += asset.core_essence.power_tier;
    });
    
    return {
      rarity_distribution: rarityDistribution,
      domain_distribution: domainDistribution,
      average_power_tier: assets.length > 0 ? totalPowerTier / assets.length : 0
    };
  }

  private sortAssets(assets: UniversalAsset[], filters: AdvancedSearchFilters): UniversalAsset[] {
    if (!filters.sort_by) return assets;
    
    const sortOrder = filters.sort_order === 'desc' ? -1 : 1;
    
    return assets.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sort_by) {
        case 'name':
          comparison = a.base_metadata.name.localeCompare(b.base_metadata.name);
          break;
        case 'created_date':
          comparison = new Date(a.creation_timestamp).getTime() - new Date(b.creation_timestamp).getTime();
          break;
        case 'power_tier':
          comparison = a.core_essence.power_tier - b.core_essence.power_tier;
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

  private paginateResults(assets: UniversalAsset[], filters: AdvancedSearchFilters): UniversalAsset[] {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    return assets.slice(offset, offset + limit);
  }

  private getAppliedFilters(filters: AdvancedSearchFilters): string[] {
    const applied: string[] = [];
    
    if (filters.domain) applied.push('domain');
    if (filters.game_id) applied.push('game_id');
    if (filters.search_text) applied.push('text_search');
    if (filters.rarity) applied.push('rarity');
    if (filters.element) applied.push('element');
    if (filters.power_tier_min !== undefined || filters.power_tier_max !== undefined) applied.push('power_tier_range');
    if (filters.creation_date_from || filters.creation_date_to) applied.push('date_range');
    if (filters.similar_to_asset) applied.push('similarity');
    if (filters.compatible_with_game) applied.push('compatibility');
    
    return applied;
  }

  private generateSearchSuggestions(filters: AdvancedSearchFilters, resultCount: number): string[] {
    const suggestions: string[] = [];
    
    if (resultCount === 0) {
      suggestions.push('Try broadening your search criteria');
      if (filters.power_tier_min || filters.power_tier_max) {
        suggestions.push('Consider expanding the power tier range');
      }
      if (filters.rarity) {
        suggestions.push('Try including more rarity types');
      }
    } else if (resultCount > 100) {
      suggestions.push('Consider adding more filters to narrow results');
      if (!filters.domain) {
        suggestions.push('Filter by domain to focus on specific asset types');
      }
    }
    
    return suggestions;
  }

  private trackSearch(filters: AdvancedSearchFilters): void {
    const searchKey = JSON.stringify(filters);
    this.popularSearches.set(searchKey, (this.popularSearches.get(searchKey) || 0) + 1);
  }

  private updateSearchStatistics(searchTime: number): void {
    this.searchCount++;
    this.totalSearchTime += searchTime;
  }

  private async findSimilarAssets(ownedAssets: UniversalAsset[], limit: number): Promise<AssetRecommendation[]> {
    const recommendations: AssetRecommendation[] = [];
    
    for (const ownedAsset of ownedAssets.slice(0, 3)) { // Limit to 3 owned assets for similarity
      const similarFilters: AdvancedSearchFilters = {
        similar_to_asset: ownedAsset.universal_id,
        limit: Math.ceil(limit / ownedAssets.length)
      };
      
      const result = await this.searchAssets(similarFilters);
      
      result.assets.forEach(asset => {
        const similarity = this.calculateAssetSimilarity(asset, ownedAsset);
        recommendations.push({
          asset,
          reason: `Similar to your ${ownedAsset.base_metadata.name}`,
          confidence_score: similarity,
          similarity_factors: this.getSimilarityFactors(asset, ownedAsset)
        });
      });
    }
    
    return recommendations;
  }

  private async getGameBasedRecommendations(preferredGames: string[], limit: number): Promise<AssetRecommendation[]> {
    const recommendations: AssetRecommendation[] = [];
    
    for (const gameId of preferredGames) {
      const gameAssets = await this.registryService.getAssetsByGame(gameId, { limit: Math.ceil(limit / preferredGames.length) });
      
      gameAssets.forEach(asset => {
        recommendations.push({
          asset,
          reason: `Popular in ${gameId}`,
          confidence_score: 0.7,
          similarity_factors: ['game_preference']
        });
      });
    }
    
    return recommendations;
  }

  private async getInterestBasedRecommendations(interests: string[], limit: number): Promise<AssetRecommendation[]> {
    const recommendations: AssetRecommendation[] = [];
    
    const filters: AdvancedSearchFilters = {
      tags: interests,
      limit
    };
    
    const result = await this.searchAssets(filters);
    
    result.assets.forEach(asset => {
      const matchingTags = asset.base_metadata.tags.filter((tag: string) => interests.includes(tag));
      recommendations.push({
        asset,
        reason: `Matches your interests: ${matchingTags.join(', ')}`,
        confidence_score: matchingTags.length / interests.length,
        similarity_factors: matchingTags
      });
    });
    
    return recommendations;
  }

  private async getBudgetBasedRecommendations(
    budgetRange: { min: number; max: number; currency: string },
    ownedAssets: UniversalAsset[],
    limit: number
  ): Promise<AssetRecommendation[]> {
    // In a full implementation, this would search for assets within the budget range
    // For now, return empty array as we don't have price information readily available
    return [];
  }

  private deduplicateRecommendations(recommendations: AssetRecommendation[]): AssetRecommendation[] {
    const seen = new Set<string>();
    const unique: AssetRecommendation[] = [];
    
    recommendations.forEach(rec => {
      if (!seen.has(rec.asset.universal_id)) {
        seen.add(rec.asset.universal_id);
        unique.push(rec);
      }
    });
    
    return unique;
  }

  private calculateAssetSimilarity(asset1: UniversalAsset, asset2: UniversalAsset): number {
    let score = 0;
    
    // Same domain
    if (asset1.domain === asset2.domain) score += 0.2;
    
    // Same element
    if (asset1.core_essence.element === asset2.core_essence.element) score += 0.15;
    
    // Similar power tier (within 10)
    if (Math.abs(asset1.core_essence.power_tier - asset2.core_essence.power_tier) <= 10) score += 0.1;
    
    // Same rarity class
    if (asset1.core_essence.rarity_class === asset2.core_essence.rarity_class) score += 0.1;
    
    // Shared tags
    const sharedTags = asset1.base_metadata.tags.filter(tag => asset2.base_metadata.tags.includes(tag));
    score += Math.min(0.3, sharedTags.length * 0.1);
    
    // Shared games
    const games1 = Object.keys(asset1.variants);
    const games2 = Object.keys(asset2.variants);
    const sharedGames = games1.filter(game => games2.includes(game));
    score += Math.min(0.15, sharedGames.length * 0.05);
    
    return Math.min(1.0, score);
  }

  private getSimilarityFactors(asset1: UniversalAsset, asset2: UniversalAsset): string[] {
    const factors: string[] = [];
    
    if (asset1.domain === asset2.domain) factors.push('same_domain');
    if (asset1.core_essence.element === asset2.core_essence.element) factors.push('same_element');
    if (asset1.core_essence.rarity_class === asset2.core_essence.rarity_class) factors.push('same_rarity');
    
    const sharedTags = asset1.base_metadata.tags.filter(tag => asset2.base_metadata.tags.includes(tag));
    if (sharedTags.length > 0) factors.push('shared_tags');
    
    const games1 = Object.keys(asset1.variants);
    const games2 = Object.keys(asset2.variants);
    const sharedGames = games1.filter(game => games2.includes(game));
    if (sharedGames.length > 0) factors.push('shared_games');
    
    return factors;
  }

  private getTimeframeCutoff(timeframe: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private getRarityBoost(rarity: string): number {
    const boosts: Record<string, number> = {
      'common': 1,
      'uncommon': 2,
      'rare': 3,
      'epic': 5,
      'legendary': 8,
      'mythic': 12
    };
    return boosts[rarity] || 1;
  }
}