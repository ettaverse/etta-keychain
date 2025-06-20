/**
 * Core interfaces for Universal Assets in the Multi-Level Asset System
 * These types define the structure for assets that can exist across multiple games
 * while maintaining a unified identity on the STEEM blockchain.
 */

export interface UniversalAsset {
  // Universal Identifiers
  universal_id: string;          // e.g., "fire_dragon_001"
  domain: string;                // e.g., "gaming", "music", "collectibles"
  creation_timestamp: string;    // ISO timestamp
  creator: string;               // STEEM username of creator
  current_owner: string;         // Current owner STEEM username
  
  // Core Asset Metadata
  base_metadata: {
    name: string;                // Human-readable name
    description: string;         // Asset description
    image_url: string;          // Primary image URL
    external_url?: string;      // External link for more info
    animation_url?: string;     // Animation/video URL
    core_attributes: Record<string, any>; // Core properties shared across games
    tags: string[];             // Searchable tags
  };
  
  // Web2 Integration Support
  web2_integration?: {
    source_system: string;      // Original Web2 system identifier
    source_id: string;          // Web2 database ID or reference
    sync_status: 'synced' | 'pending' | 'error' | 'disabled';
    last_sync: string;          // ISO timestamp of last sync
    sync_metadata?: Record<string, any>; // System-specific sync data
  };
  
  // Core Essence - defines the fundamental nature of the asset
  core_essence: CoreEssence;
  
  // Game-Specific Variants
  variants: Record<string, GameVariant>; // Key: game_id, Value: game variant
  
  // Asset Properties
  properties: {
    tradeable: boolean;         // Can be traded/sold
    transferable: boolean;      // Can be transferred to other users
    burnable: boolean;          // Can be destroyed
    mintable: boolean;          // Can create additional copies
    supply: {
      total: number;            // Total supply (if applicable)
      circulating: number;      // Currently circulating supply
      burned: number;           // Number burned/destroyed
    };
    rarity: {
      tier: string;             // e.g., "common", "rare", "legendary"
      score: number;            // Numerical rarity score (0-100)
      rank?: number;            // Rank within rarity tier
    };
  };
  
  // Economic Information
  economic_data?: {
    mint_price?: { amount: string; currency: string };
    current_value?: { amount: string; currency: string };
    last_sale?: { amount: string; currency: string; timestamp: string };
    royalty_percentage?: number; // Creator royalty (0-100)
    royalty_recipient?: string;  // STEEM username for royalties
  };
  
  // Blockchain Information
  blockchain_info: {
    transaction_id: string;     // STEEM transaction ID of creation
    block_number: number;       // Block number of creation
    confirmation_count: number; // Number of confirmations
    network: string;            // "steem" or "steem_testnet"
  };
  
  // Transfer History
  transfer_history: AssetTransaction[];
}

/**
 * Core Essence - The fundamental properties that define an asset's nature
 * This essence is used to generate game-specific variants automatically
 */
export interface CoreEssence {
  // Primary Classification
  element?: string;             // e.g., "fire", "water", "lightning", "nature"
  archetype: string;            // e.g., "dragon", "sword", "potion", "song"
  power_tier: number;           // Power level (0-100 scale)
  
  // Behavioral Traits
  temperament?: string;         // e.g., "aggressive", "peaceful", "chaotic"
  intelligence?: string;        // e.g., "low", "moderate", "high", "ancient"
  rarity_class: string;         // e.g., "common", "uncommon", "rare", "epic", "legendary"
  
  // Physical/Conceptual Properties
  size_class?: string;          // e.g., "tiny", "small", "medium", "large", "massive"
  craftsmanship?: string;       // e.g., "crude", "fine", "masterwork", "divine"
  age?: string;                 // e.g., "new", "ancient", "timeless"
  
  // Thematic Properties
  origin_story?: string;        // Background lore
  cultural_significance?: string; // Cultural context
  magical_nature?: string;      // Type of magic/power if applicable
  
  // Technical Properties for conversion calculations
  essence_score: number;        // Overall essence strength (calculated)
  compatibility_factors: string[]; // Factors affecting cross-game compatibility
}

/**
 * Game-Specific Variant - How a universal asset manifests in a particular game
 */
export interface GameVariant {
  game_id: string;              // Unique game identifier
  asset_type: string;           // Game-specific asset type (e.g., "card", "creature", "item")
  
  // Game-Specific Properties
  properties: Record<string, any>; // All game-specific stats and attributes
  
  // Display Information (can override universal metadata)
  display: {
    name?: string;              // Game-specific name override
    description?: string;       // Game-specific description
    image_url?: string;         // Game-specific image
    animation_url?: string;     // Game-specific animation
    model_url?: string;         // 3D model URL if applicable
  };
  
  // Game Mechanics
  mechanics: {
    usable_in: string[];        // Game modes where asset can be used
    abilities?: string[];       // Special abilities in this game
    restrictions?: string[];    // Usage restrictions
    cooldown?: number;          // Ability cooldown in seconds
    durability?: number;        // Item durability (if applicable)
  };
  
  // Compatibility Information
  compatibility: {
    min_game_version: string;   // Minimum game version required
    max_game_version?: string;  // Maximum supported version
    required_features?: string[]; // Required game features
    incompatible_with?: string[]; // Incompatible items/features
  };
  
  // Status Information
  status: {
    active: boolean;            // Is this variant currently active
    deprecated: boolean;        // Is this variant deprecated
    migration_target?: string;  // Target variant if deprecated
  };
}

/**
 * Asset Transaction - Record of asset transfers and operations
 */
export interface AssetTransaction {
  transaction_id: string;       // STEEM transaction ID
  operation_type: 'mint' | 'transfer' | 'convert' | 'update' | 'burn';
  timestamp: string;            // ISO timestamp
  
  // Participants
  from_user?: string;           // Source user (if applicable)
  to_user?: string;             // Destination user (if applicable)
  
  // Transaction Details
  game_context?: string;        // Game context for the transaction
  price?: { amount: string; currency: string }; // Transaction price
  memo?: string;                // Transaction memo
  
  // Operation-Specific Data
  operation_data?: Record<string, any>; // Additional operation details
  
  // Results
  success: boolean;             // Was the transaction successful
  error_message?: string;       // Error message if failed
  gas_used?: { amount: string; currency: string }; // Transaction fees
}

/**
 * Asset Creation Request - Data needed to create a new universal asset
 */
export interface AssetCreationRequest {
  // Basic Information
  domain: string;
  initial_game_id: string;
  asset_type: string;
  
  // Metadata
  base_metadata: {
    name: string;
    description: string;
    image_url: string;
    external_url?: string;
    animation_url?: string;
    core_attributes: Record<string, any>;
    tags?: string[];
  };
  
  // Core Essence Definition
  core_essence: Omit<CoreEssence, 'essence_score' | 'compatibility_factors'>;
  
  // Initial Game Variant
  initial_variant: Omit<GameVariant, 'game_id' | 'status'>;
  
  // Creation Options
  creation_options: {
    owner: string;              // Initial owner
    tradeable: boolean;
    transferable: boolean;
    burnable: boolean;
    mintable: boolean;
    total_supply?: number;      // Total supply if limited
    royalty_percentage?: number;
    royalty_recipient?: string;
  };
  
  // Web2 Integration (optional)
  web2_integration?: {
    source_system: string;
    source_id: string;
    sync_metadata?: Record<string, any>;
  };
}

/**
 * Asset Update Request - Data needed to update an existing asset
 */
export interface AssetUpdateRequest {
  universal_id: string;
  update_type: 'metadata' | 'variant_add' | 'variant_update' | 'properties' | 'transfer';
  
  // Update Data (specific to update_type)
  update_data: Record<string, any>;
  
  // Authorization
  authorized_by: string;        // STEEM username with update authority
  signature?: string;          // Digital signature for verification
}