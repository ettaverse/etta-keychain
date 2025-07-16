/**
 * Interfaces for asset filtering, searching, and querying
 */

/**
 * Base Asset Filters - Common filtering options for asset queries
 */
export interface AssetFilters {
  // Identity Filters
  creator?: string;             // Filter by creator username
  owner?: string;               // Filter by current owner
  domain?: string;              // Filter by domain
  game_id?: string;             // Filter by specific game
  asset_type?: string;          // Filter by asset type within game
  
  // Metadata Filters
  name_contains?: string;       // Name contains text
  description_contains?: string; // Description contains text
  tags?: string[];              // Must have all specified tags
  tags_any?: string[];          // Must have any of specified tags
  
  // Property Filters
  rarity?: string[];            // Filter by rarity tiers
  element?: string[];           // Filter by element types
  archetype?: string[];         // Filter by archetype
  power_tier_min?: number;      // Minimum power tier
  power_tier_max?: number;      // Maximum power tier
  
  // Status Filters
  tradeable?: boolean;          // Only tradeable assets
  transferable?: boolean;       // Only transferable assets
  for_sale?: boolean;           // Only assets currently for sale
  has_variants?: boolean;       // Only assets with game variants
  
  // Economic Filters
  min_price?: { amount: string; currency: string }; // Minimum price
  max_price?: { amount: string; currency: string }; // Maximum price
  has_price?: boolean;          // Only assets with a set price
  royalty_percentage_min?: number; // Minimum royalty percentage
  royalty_percentage_max?: number; // Maximum royalty percentage
  
  // Date Filters
  created_after?: string;       // Created after date (ISO string)
  created_before?: string;      // Created before date (ISO string)
  last_activity_after?: string; // Last activity after date
  last_activity_before?: string; // Last activity before date
  
  // Supply Filters
  total_supply_min?: number;    // Minimum total supply
  total_supply_max?: number;    // Maximum total supply
  circulating_supply_min?: number; // Minimum circulating supply
  circulating_supply_max?: number; // Maximum circulating supply
  
  // Game-Specific Filters
  usable_in?: string[];         // Must be usable in specified game modes
  has_abilities?: string[];     // Must have specified abilities
  compatible_with_game?: string; // Must be compatible with specified game
  
  // Advanced Filters
  essence_score_min?: number;   // Minimum essence score
  essence_score_max?: number;   // Maximum essence score
  compatibility_factors?: string[]; // Must have specified compatibility factors
  
  // Sorting Options
  sort_by?: AssetSortField;
  sort_order?: 'asc' | 'desc';
  
  // Pagination
  page?: number;                // Page number (1-based)
  limit?: number;               // Number of results per page (max 100)
  
  // Result Options
  include_variants?: boolean;   // Include game variant data
  include_history?: boolean;    // Include transaction history
  include_market_data?: boolean; // Include current market data
}

/**
 * User Asset Filters - Extends base filters with user-specific options
 */
export interface UserAssetFilters extends AssetFilters {
  // User-Specific Filters
  acquired_after?: string;      // Acquired after date
  acquired_before?: string;     // Acquired before date
  acquisition_type?: ('mint' | 'purchase' | 'transfer' | 'conversion')[]; // How asset was acquired
  
  // Portfolio Organization
  group_by?: AssetGrouping;     // How to group results
  include_variant_names?: string[];  // Specific game variants to include
  exclude_variants?: string[];  // Game variants to exclude
  
  // Activity Filters
  recently_active?: boolean;    // Only recently used assets
  unused_for_days?: number;     // Unused for specified number of days
  
  // Investment Filters
  profit_loss?: 'profit' | 'loss' | 'break_even'; // Investment performance
  value_change_min?: number;    // Minimum value change percentage
  value_change_max?: number;    // Maximum value change percentage
}

/**
 * Asset Search Query - Advanced search options
 */
export interface AssetSearchQuery {
  // Text Search
  text?: string;                // Free text search
  exact_match?: boolean;        // Require exact text match
  fuzzy_threshold?: number;     // Fuzzy matching threshold (0-1)
  
  // Search Scope
  search_fields?: AssetSearchField[]; // Fields to search in
  domains?: string[];           // Limit search to domains
  games?: string[];             // Limit search to games
  asset_types?: string[];       // Limit search to asset types
  
  // Advanced Search
  similar_to_asset?: string;    // Find assets similar to specified asset
  similarity_threshold?: number; // Similarity threshold (0-1)
  semantic_search?: boolean;    // Use semantic/AI-powered search
  
  // Filter Integration
  filters?: AssetFilters;       // Additional filters to apply
  
  // Search Options
  include_inactive?: boolean;   // Include inactive/deprecated assets
  boost_owned?: boolean;        // Boost user's owned assets in results
  boost_recent?: boolean;       // Boost recently created/updated assets
}

/**
 * Asset Discovery Query - For browsing and discovery
 */
export interface AssetDiscoveryQuery {
  // Discovery Mode
  discovery_mode: 'trending' | 'popular' | 'new' | 'recommended' | 'random';
  
  // Context
  user?: string;                // User for personalized recommendations
  based_on_asset?: string;      // Base recommendations on specific asset
  based_on_collection?: string[]; // Base recommendations on asset collection
  
  // Discovery Options
  diversity_factor?: number;    // Diversity of results (0-1)
  surprise_factor?: number;     // Include surprising/unexpected results (0-1)
  
  // Constraints
  exclude_owned?: boolean;      // Exclude user's owned assets
  exclude_similar?: string[];   // Exclude assets similar to specified ones
  
  // Filters
  filters?: AssetFilters;       // Apply additional filters
}

/**
 * Asset Sort Field Options
 */
export type AssetSortField = 
  | 'created_date'              // Creation date
  | 'last_activity'             // Last activity date
  | 'name'                      // Alphabetical by name
  | 'creator'                   // Alphabetical by creator
  | 'price'                     // Price (if available)
  | 'rarity_score'              // Rarity score
  | 'power_tier'                // Power tier
  | 'essence_score'             // Essence score
  | 'popularity'                // Popularity/usage
  | 'value'                     // Current market value
  | 'supply'                    // Total supply
  | 'transfer_count'            // Number of transfers
  | 'random';                   // Random order

/**
 * Asset Grouping Options
 */
export type AssetGrouping = 
  | 'none'                      // No grouping
  | 'domain'                    // Group by domain
  | 'game'                      // Group by game
  | 'asset_type'                // Group by asset type
  | 'rarity'                    // Group by rarity tier
  | 'element'                   // Group by element
  | 'archetype'                 // Group by archetype
  | 'creator'                   // Group by creator
  | 'acquisition_date'          // Group by acquisition date
  | 'value_range';              // Group by value ranges

/**
 * Asset Search Field Options
 */
export type AssetSearchField = 
  | 'name'                      // Asset name
  | 'description'               // Asset description
  | 'tags'                      // Asset tags
  | 'creator'                   // Creator username
  | 'core_attributes'           // Core attributes
  | 'game_properties'           // Game-specific properties
  | 'abilities'                 // Asset abilities
  | 'all';                      // All searchable fields

/**
 * Asset Query Result
 */
export interface AssetQueryResult<T = any> {
  // Results
  assets: T[];                  // Array of assets
  total_count: number;          // Total number of matching assets
  
  // Pagination Info
  page_info: {
    current_page: number;       // Current page number
    total_pages: number;        // Total number of pages
    page_size: number;          // Number of items per page
    has_next: boolean;          // Has next page
    has_previous: boolean;      // Has previous page
  };
  
  // Grouping Info (if grouped)
  grouped_results?: Record<string, T[]>; // Grouped results
  group_counts?: Record<string, number>; // Count per group
  
  // Search Info (if search was performed)
  search_info?: {
    query_time_ms: number;      // Search execution time
    total_matches: number;      // Total matches before filtering
    suggestions?: string[];     // Search suggestions
    corrected_query?: string;   // Corrected search query
  };
  
  // Filter Info
  applied_filters: AssetFilters; // Filters that were applied
  available_filters?: {         // Available filter values
    [filter_name: string]: any[];
  };
}

/**
 * Asset Statistics
 */
export interface AssetStatistics {
  // Overview
  total_assets: number;
  total_domains: number;
  total_games: number;
  total_creators: number;
  
  // Distribution
  by_domain: Record<string, number>;
  by_game: Record<string, number>;
  by_rarity: Record<string, number>;
  by_element: Record<string, number>;
  by_asset_type: Record<string, number>;
  
  // Activity
  assets_created_today: number;
  assets_transferred_today: number;
  total_transactions: number;
  
  // Economic
  total_market_value?: { amount: string; currency: string };
  average_asset_value?: { amount: string; currency: string };
  price_ranges?: {
    range: string;
    count: number;
  }[];
  
  // Quality Metrics
  average_essence_score: number;
  power_tier_distribution: Record<string, number>;
  compatibility_coverage: number; // Percentage of assets with cross-game variants
}

/**
 * Asset Filter Suggestions
 */
export interface AssetFilterSuggestions {
  // Popular Filters
  popular_creators: string[];
  popular_tags: string[];
  popular_elements: string[];
  popular_archetypes: string[];
  
  // Value Ranges
  suggested_price_ranges: {
    label: string;
    min: { amount: string; currency: string };
    max: { amount: string; currency: string };
    count: number;
  }[];
  
  // Game Suggestions
  active_games: {
    game_id: string;
    name: string;
    asset_count: number;
  }[];
  
  // Time Ranges
  creation_periods: {
    label: string;
    start_date: string;
    end_date: string;
    count: number;
  }[];
}