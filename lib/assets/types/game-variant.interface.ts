/**
 * Interfaces for game-specific manifestations and cross-game functionality
 */

import { CoreEssence, GameVariant } from './universal-asset.interface';

/**
 * Game Information Registry
 */
export interface GameInfo {
  game_id: string;              // Unique game identifier
  name: string;                 // Display name
  domain: string;               // Domain this game belongs to
  description: string;          // Game description
  
  // Game Metadata
  metadata: {
    developer: string;          // Game developer
    version: string;            // Current version
    website?: string;           // Official website
    social_links?: Record<string, string>; // Social media links
  };
  
  // Asset System Integration
  asset_integration: {
    supported_asset_types: string[]; // Types of assets this game supports
    essence_interpretation: EssenceInterpretationRules; // How game interprets essence
    custom_properties: string[];     // Game-specific property names
    api_endpoints?: string[];        // API endpoints for integration
  };
  
  // Compatibility Information
  compatibility: {
    compatible_games: string[];      // Games that can exchange assets
    conversion_rules: ConversionRule[]; // Rules for asset conversion
    restricted_elements?: string[];  // Elements not supported
  };
  
  // Status
  status: {
    active: boolean;            // Is game currently active
    accepting_assets: boolean;  // Is game accepting new assets
    last_updated: string;       // Last update timestamp
  };
}

/**
 * Domain Information Registry
 */
export interface DomainInfo {
  domain_id: string;            // Unique domain identifier
  name: string;                 // Display name
  description: string;          // Domain description
  
  // Domain Properties
  properties: {
    primary_focus: string;      // e.g., "gaming", "music", "art"
    asset_categories: string[]; // Categories of assets in this domain
    total_games: number;        // Number of games in domain
    total_assets: number;       // Total assets in domain
  };
  
  // Games in Domain
  games: string[];              // Array of game_ids in this domain
  
  // Domain Rules
  rules: {
    asset_requirements: Record<string, any>; // Requirements for assets in domain
    cross_domain_allowed: boolean; // Can assets move between domains
    moderation_required: boolean;   // Requires moderation for new assets
  };
}

/**
 * Essence Interpretation Rules - How a game interprets universal essence
 */
export interface EssenceInterpretationRules {
  game_id: string;
  
  // Property Mapping Rules
  property_mappings: {
    [essence_property: string]: PropertyMapping;
  };
  
  // Asset Type Determination
  asset_type_rules: {
    conditions: EssenceCondition[];
    result_type: string;
  }[];
  
  // Stat Calculation Formulas
  stat_calculations: {
    [stat_name: string]: {
      formula: string;           // Mathematical formula using essence properties
      min_value?: number;        // Minimum allowed value
      max_value?: number;        // Maximum allowed value
      rounding?: 'floor' | 'ceil' | 'round'; // Rounding method
    };
  };
  
  // Ability Assignment Rules
  ability_rules: {
    conditions: EssenceCondition[];
    granted_abilities: string[];
  }[];
}

/**
 * Property Mapping - Maps essence properties to game properties
 */
export interface PropertyMapping {
  target_property: string;      // Name of game property
  source_properties: string[];  // Essence properties used in calculation
  formula: string;              // Calculation formula
  modifiers?: {
    [condition: string]: number; // Conditional modifiers
  };
}

/**
 * Essence Condition - Condition based on essence properties
 */
export interface EssenceCondition {
  property: string;             // Essence property name
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'includes' | 'excludes';
  value: any;                   // Comparison value
  weight?: number;              // Weight for scoring (0-1)
}

/**
 * Conversion Rule - Rules for converting assets between games
 */
export interface ConversionRule {
  from_game: string;
  to_game: string;
  
  // Compatibility
  compatibility: {
    compatible: boolean;
    compatibility_score: number; // 0-1 scale
    success_rate: number;        // 0-1 probability of successful conversion
  };
  
  // Requirements
  requirements: {
    min_essence_score?: number;  // Minimum essence score required
    required_elements?: string[]; // Required essence elements
    excluded_elements?: string[]; // Elements that prevent conversion
    min_power_tier?: number;     // Minimum power tier
    user_requirements?: {
      min_level?: number;        // User level requirement
      holding_period?: number;   // Minimum time owned (seconds)
      reputation?: number;       // User reputation requirement
    };
  };
  
  // Conversion Process
  conversion_process: {
    conversion_cost: { amount: string; currency: string };
    conversion_time: number;     // Time required (seconds)
    reversible: boolean;         // Can conversion be reversed
    rollback_period?: number;    // Time window for rollback (seconds)
  };
  
  // Property Transformations
  property_transformations: {
    [source_property: string]: PropertyTransformation;
  };
  
  // Side Effects
  side_effects: {
    properties_lost: string[];   // Properties lost in conversion
    properties_gained: string[]; // New properties gained
    stat_adjustments?: Record<string, number>; // Stat modifications
    ability_changes?: {
      removed: string[];
      added: string[];
    };
  };
}

/**
 * Property Transformation - How properties change during conversion
 */
export interface PropertyTransformation {
  target_property: string;      // Target property name
  transformation_type: 'direct' | 'formula' | 'lookup' | 'conditional';
  
  // Transformation Data
  transformation_data: {
    formula?: string;           // Mathematical formula
    lookup_table?: Record<string, any>; // Lookup table for mapping
    conditions?: EssenceCondition[]; // Conditions for conditional transformation
    precision_loss?: number;    // Precision lost (0-1 scale)
  };
}

/**
 * Asset Conversion Request
 */
export interface AssetConversionRequest {
  universal_id: string;
  from_game: string;
  to_game: string;
  owner: string;
  
  // Conversion Options
  options?: {
    accept_partial_conversion?: boolean; // Accept if some properties are lost
    priority_properties?: string[];      // Properties to prioritize
    custom_modifications?: Record<string, any>; // User-requested modifications
  };
  
  // User Preferences
  preferences?: {
    conversion_speed: 'fastest' | 'balanced' | 'safest';
    risk_tolerance: 'low' | 'medium' | 'high';
  };
}

/**
 * Asset Conversion Result
 */
export interface AssetConversionResult {
  conversion_id: string;
  universal_id: string;
  transaction_id: string;
  
  // Conversion Details
  conversion_details: {
    from_game: string;
    to_game: string;
    conversion_timestamp: string;
    conversion_cost: { amount: string; currency: string };
    success_rate_achieved: number;
  };
  
  // Variant Changes
  variant_changes: {
    original_variant: GameVariant;
    new_variant: GameVariant;
    properties_changed: {
      added: Record<string, any>;
      modified: Record<string, { from: any; to: any }>;
      removed: string[];
    };
  };
  
  // Success Information
  success: boolean;
  warnings?: string[];          // Non-fatal warnings
  error_message?: string;       // Error if conversion failed
  
  // Rollback Information
  rollback_available: boolean;
  rollback_deadline?: string;   // ISO timestamp of rollback deadline
}

/**
 * Compatibility Check Result
 */
export interface CompatibilityResult {
  from_game: string;
  to_game: string;
  universal_id: string;
  
  // Compatibility Assessment
  compatibility: {
    overall_compatible: boolean;
    compatibility_score: number; // 0-1 scale
    confidence_level: number;    // 0-1 scale
  };
  
  // Detailed Analysis
  analysis: {
    compatible_properties: string[];
    incompatible_properties: string[];
    property_mappings: Record<string, string>;
    estimated_success_rate: number;
  };
  
  // Requirements Check
  requirements_status: {
    met: boolean;
    missing_requirements: string[];
    user_requirements_met: boolean;
  };
  
  // Predictions
  predictions: {
    estimated_cost: { amount: string; currency: string };
    estimated_time: number;      // Conversion time in seconds
    quality_retention: number;   // 0-1 scale of quality retained
    recommended: boolean;        // Whether conversion is recommended
  };
}

/**
 * Cross-Game Asset Link
 */
export interface CrossGameAssetLink {
  universal_id: string;
  linked_variants: {
    game_id: string;
    variant_id?: string;         // Game-specific variant identifier
    link_strength: number;       // 0-1 scale of link strength
    sync_status: 'synced' | 'pending' | 'error' | 'disabled';
    last_sync: string;
  }[];
  
  // Link Metadata
  link_metadata: {
    created_timestamp: string;
    created_by: string;
    link_type: 'automatic' | 'manual' | 'converted';
    verification_status: 'verified' | 'pending' | 'failed';
  };
}

/**
 * Asset Manifestation Template - Template for generating game variants
 */
export interface ManifestationTemplate {
  game_id: string;
  template_id: string;
  name: string;
  description: string;
  
  // Template Rules
  template_rules: {
    applies_to: EssenceCondition[]; // When this template applies
    priority: number;               // Template priority (higher wins)
    
    // Generation Rules
    property_generation: {
      [property_name: string]: {
        source: 'essence' | 'formula' | 'constant' | 'random';
        value_spec: any;            // Specification for value generation
      };
    };
    
    ability_generation: {
      conditions: EssenceCondition[];
      abilities: string[];
    }[];
    
    display_generation: {
      name_template?: string;       // Template for generating display name
      description_template?: string; // Template for generating description
      image_rules?: any;           // Rules for selecting images
    };
  };
}

/**
 * Game Registry Query Options
 */
export interface GameRegistryQuery {
  domain?: string;              // Filter by domain
  asset_type?: string;          // Filter by supported asset type
  compatibility_with?: string;  // Filter by compatibility with game
  status?: 'active' | 'inactive'; // Filter by status
  
  // Sorting
  sort_by?: 'name' | 'domain' | 'asset_count' | 'last_updated';
  sort_order?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
}

/**
 * Domain Registry Query Options
 */
export interface DomainRegistryQuery {
  asset_category?: string;      // Filter by asset category
  cross_domain_allowed?: boolean; // Filter by cross-domain policy
  
  // Sorting
  sort_by?: 'name' | 'total_games' | 'total_assets';
  sort_order?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
}