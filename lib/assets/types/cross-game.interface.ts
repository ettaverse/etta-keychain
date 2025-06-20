/**
 * Interfaces for cross-game asset functionality and interoperability
 */

import { 
  UniversalAsset, 
  GameVariant, 
  CoreEssence, 
  AssetTransaction 
} from './universal-asset.interface';

/**
 * Cross-Game Compatibility Matrix
 */
export interface CompatibilityMatrix {
  [sourceGame: string]: {
    [targetGame: string]: CompatibilityRule;
  };
}

/**
 * Compatibility Rule - Defines how assets can convert between games
 */
export interface CompatibilityRule {
  // Basic Compatibility
  compatible: boolean;
  compatibility_score: number;  // 0-1 scale
  bidirectional: boolean;       // Can convert both ways
  
  // Conversion Requirements
  requirements: {
    // Asset Requirements
    min_power_tier?: number;
    max_power_tier?: number;
    required_elements?: string[];
    excluded_elements?: string[];
    required_archetypes?: string[];
    excluded_archetypes?: string[];
    min_essence_score?: number;
    
    // User Requirements
    user_level?: number;
    holding_period?: number;     // Minimum ownership time (seconds)
    reputation_score?: number;
    conversion_count_limit?: number; // Max conversions per user
    
    // Economic Requirements
    conversion_fee: { amount: string; currency: string };
    minimum_stake?: { amount: string; currency: string };
  };
  
  // Conversion Process
  conversion_process: {
    success_rate: number;        // Base success rate (0-1)
    conversion_time: number;     // Processing time (seconds)
    confirmation_blocks: number; // Required blockchain confirmations
    reversible: boolean;         // Can be reversed
    rollback_period?: number;    // Rollback window (seconds)
    auto_approve: boolean;       // Automatic approval or manual review
  };
  
  // Property Mapping
  property_mapping: {
    [sourceProperty: string]: PropertyConversionRule;
  };
  
  // Conversion Effects
  conversion_effects: {
    properties_preserved: string[];   // Properties that remain unchanged
    properties_lost: string[];        // Properties lost in conversion
    properties_gained: string[];      // New properties gained
    stat_multipliers?: Record<string, number>; // Apply multipliers to stats
    ability_mapping?: Record<string, string>; // Map abilities between games
    
    // Quality Effects
    quality_retention: number;   // Percentage of quality retained (0-1)
    precision_loss?: Record<string, number>; // Precision lost per property
  };
  
  // Restrictions
  restrictions: {
    max_conversions_per_day?: number;
    cooldown_between_conversions?: number; // Seconds
    blacklisted_assets?: string[];         // Assets that cannot convert
    maintenance_mode?: boolean;            // Conversion temporarily disabled
  };
}

/**
 * Property Conversion Rule
 */
export interface PropertyConversionRule {
  target_property: string;      // Target property name
  conversion_type: 'direct' | 'formula' | 'lookup' | 'conditional' | 'ignore';
  
  conversion_data: {
    // For formula type
    formula?: string;           // Mathematical formula (e.g., "source * 0.8 + 5")
    variables?: Record<string, any>; // Additional variables for formula
    
    // For lookup type
    lookup_table?: Record<string, any>; // Value mapping table
    default_value?: any;        // Default if lookup fails
    
    // For conditional type
    conditions?: ConversionCondition[];
    
    // Quality settings
    precision_digits?: number;   // Round to specified decimal places
    min_value?: number;         // Minimum allowed value
    max_value?: number;         // Maximum allowed value
  };
}

/**
 * Conversion Condition
 */
export interface ConversionCondition {
  condition: string;            // Condition expression
  result_value: any;           // Value if condition is true
  weight?: number;             // Weight for scoring (0-1)
}

/**
 * Asset Conversion Request
 */
export interface AssetConversionRequest {
  universal_id: string;
  from_game: string;
  to_game: string;
  requester: string;           // User requesting conversion
  
  // Conversion Options
  options: {
    accept_quality_loss?: boolean;    // Accept conversion with quality loss
    priority_properties?: string[];   // Properties to prioritize preserving
    custom_parameters?: Record<string, any>; // User-defined parameters
    
    // Risk Management
    max_acceptable_cost?: { amount: string; currency: string };
    min_success_rate?: number;        // Minimum acceptable success rate
    require_rollback_option?: boolean; // Must be reversible
  };
  
  // User Preferences
  preferences?: {
    conversion_speed: 'instant' | 'fast' | 'economy'; // Speed vs cost tradeoff
    quality_preference: 'maximum' | 'balanced' | 'cost_effective';
    notification_preference: 'all' | 'important' | 'none';
  };
}

/**
 * Asset Conversion Response
 */
export interface AssetConversionResponse {
  conversion_id: string;
  request_timestamp: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  // Conversion Details
  conversion_details: {
    universal_id: string;
    from_game: string;
    to_game: string;
    requester: string;
    
    // Process Information
    estimated_completion: string; // ISO timestamp
    actual_completion?: string;   // ISO timestamp when completed
    success_rate_achieved?: number;
    
    // Cost Information
    estimated_cost: { amount: string; currency: string };
    actual_cost?: { amount: string; currency: string };
    fee_breakdown?: {
      base_fee: { amount: string; currency: string };
      complexity_fee?: { amount: string; currency: string };
      priority_fee?: { amount: string; currency: string };
      gas_fee?: { amount: string; currency: string };
    };
  };
  
  // Results (if completed)
  conversion_result?: {
    success: boolean;
    transaction_id?: string;
    original_variant: GameVariant;
    new_variant?: GameVariant;
    
    // Property Analysis
    property_changes: {
      preserved: Record<string, any>;
      modified: Record<string, { from: any; to: any; change_reason?: string }>;
      added: Record<string, any>;
      removed: Record<string, any>;
    };
    
    // Quality Assessment
    quality_metrics: {
      overall_retention: number;  // 0-1 scale
      property_accuracy: Record<string, number>; // Per-property accuracy
      functional_equivalence: number; // How functionally similar (0-1)
    };
    
    // Rollback Information
    rollback_available: boolean;
    rollback_deadline?: string;   // ISO timestamp
    rollback_cost?: { amount: string; currency: string };
  };
  
  // Error Information (if failed)
  error_info?: {
    error_code: string;
    error_message: string;
    error_details?: Record<string, any>;
    retry_possible: boolean;
    retry_after?: number;         // Seconds to wait before retry
  };
  
  // Progress Updates
  progress_updates?: ConversionProgressUpdate[];
}

/**
 * Conversion Progress Update
 */
export interface ConversionProgressUpdate {
  timestamp: string;
  stage: string;                // e.g., "validation", "processing", "finalizing"
  progress_percentage: number;   // 0-100
  message: string;
  details?: Record<string, any>;
}

/**
 * Cross-Game Asset Portfolio
 */
export interface CrossGamePortfolio {
  owner: string;
  portfolio_id: string;
  last_updated: string;
  
  // Asset Summary
  summary: {
    total_assets: number;
    total_variants: number;
    domains_covered: string[];
    games_covered: string[];
    
    // Cross-Game Statistics
    cross_game_assets: number;    // Assets with variants in multiple games
    conversion_opportunities: number; // Possible conversions
    total_portfolio_value?: { amount: string; currency: string };
  };
  
  // Grouped Assets
  assets_by_domain: Record<string, UniversalAsset[]>;
  assets_by_game: Record<string, UniversalAsset[]>;
  assets_by_type: Record<string, UniversalAsset[]>;
  
  // Cross-Game Analysis
  cross_game_analysis: {
    compatibility_coverage: number; // Percentage with cross-game variants
    conversion_recommendations: ConversionRecommendation[];
    portfolio_diversification: {
      domain_distribution: Record<string, number>;
      game_distribution: Record<string, number>;
      element_distribution: Record<string, number>;
    };
  };
  
  // Activity Summary
  recent_activity: {
    conversions_30d: number;
    acquisitions_30d: number;
    trades_30d: number;
    most_active_games: string[];
  };
}

/**
 * Conversion Recommendation
 */
export interface ConversionRecommendation {
  universal_id: string;
  asset_name: string;
  recommendation_type: 'opportunity' | 'optimization' | 'diversification' | 'profit';
  
  // Recommendation Details
  recommendation: {
    from_game: string;
    to_game: string;
    reason: string;
    confidence_score: number;    // 0-1 scale
    priority: 'low' | 'medium' | 'high';
  };
  
  // Benefits
  expected_benefits: {
    functionality_gain?: string[];
    value_increase?: { amount: string; currency: string };
    utility_improvement?: string;
    strategic_advantage?: string;
  };
  
  // Costs and Risks
  costs_and_risks: {
    conversion_cost: { amount: string; currency: string };
    quality_loss_risk: number;   // 0-1 scale
    functionality_loss?: string[];
    reversibility: boolean;
  };
  
  // Timing
  timing: {
    optimal_window?: string;     // When to execute
    urgency: 'low' | 'medium' | 'high';
    market_conditions?: string;  // Market factors affecting timing
  };
}

/**
 * Cross-Game Tournament
 */
export interface CrossGameTournament {
  tournament_id: string;
  name: string;
  description: string;
  
  // Tournament Structure
  structure: {
    participating_games: string[];
    tournament_type: 'elimination' | 'round_robin' | 'swiss' | 'ladder';
    phases: TournamentPhase[];
    max_participants: number;
    entry_requirements: TournamentRequirements;
  };
  
  // Scheduling
  schedule: {
    registration_start: string;   // ISO timestamp
    registration_end: string;
    tournament_start: string;
    estimated_end: string;
    phase_durations: Record<string, number>; // Phase duration in seconds
  };
  
  // Prizes and Rewards
  rewards: {
    prize_pool: { amount: string; currency: string };
    prize_distribution: {
      rank: number;
      percentage: number;
      additional_rewards?: string[];
    }[];
    participation_rewards?: string[];
    milestone_rewards?: Record<string, string[]>;
  };
  
  // Rules and Scoring
  rules: {
    asset_requirements: AssetTournamentRequirements;
    scoring_system: TournamentScoringSystem;
    banned_strategies?: string[];
    time_limits?: Record<string, number>;
  };
  
  // Status
  status: {
    current_status: 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled';
    registered_participants: number;
    current_phase?: string;
    next_phase_start?: string;
  };
}

/**
 * Tournament Phase
 */
export interface TournamentPhase {
  phase_id: string;
  name: string;
  game_id: string;             // Which game this phase uses
  phase_type: 'qualification' | 'group' | 'elimination' | 'final';
  
  // Phase Settings
  settings: {
    participants_per_match: number;
    matches_per_round: number;
    advancement_criteria: string;
    tiebreaker_rules: string[];
  };
  
  // Asset Requirements for this phase
  asset_requirements: AssetTournamentRequirements;
  
  // Timing
  estimated_duration: number;   // Seconds
  max_duration: number;        // Maximum allowed duration
}

/**
 * Tournament Requirements
 */
export interface TournamentRequirements {
  // Player Requirements
  min_player_level?: number;
  min_reputation?: number;
  registration_fee?: { amount: string; currency: string };
  
  // Asset Requirements
  min_assets_owned: number;
  required_asset_types?: string[];
  min_total_asset_value?: { amount: string; currency: string };
  
  // Eligibility
  geographical_restrictions?: string[];
  age_restrictions?: { min_age: number; max_age?: number };
  previous_participation_limits?: number;
}

/**
 * Asset Tournament Requirements
 */
export interface AssetTournamentRequirements {
  // Asset Composition
  team_size: number;           // Number of assets per team/deck
  max_duplicates?: number;     // Max copies of same asset
  
  // Asset Constraints
  total_power_limit?: number;  // Maximum total power
  rarity_distribution?: Record<string, number>; // Max assets per rarity
  element_restrictions?: {
    required_elements?: string[];
    banned_elements?: string[];
    max_per_element?: number;
  };
  
  // Game-Specific Requirements
  game_specific_rules?: Record<string, any>;
  
  // Ownership Requirements
  ownership_duration?: number; // Must own assets for X seconds
  no_borrowed_assets?: boolean; // Cannot use borrowed/rented assets
}

/**
 * Tournament Scoring System
 */
export interface TournamentScoringSystem {
  scoring_method: 'win_loss' | 'points' | 'performance' | 'hybrid';
  
  // Point Values
  point_values: {
    win: number;
    loss: number;
    draw?: number;
    bonus_objectives?: Record<string, number>;
  };
  
  // Performance Metrics
  performance_weights?: {
    speed: number;             // Weight for completion speed
    efficiency: number;        // Weight for resource efficiency
    style: number;             // Weight for artistic/strategic style
    innovation: number;        // Weight for innovative play
  };
  
  // Cross-Game Scoring
  cross_game_bonuses?: {
    diversity_bonus: number;   // Bonus for using assets from multiple games
    conversion_bonus: number;  // Bonus for converting assets during tournament
    synergy_bonus: number;     // Bonus for good cross-game synergies
  };
  
  // Tiebreakers
  tiebreaker_order: string[];  // Order of tiebreaker criteria
}

/**
 * Asset Fusion System
 */
export interface AssetFusion {
  fusion_id: string;
  fusion_type: 'combine' | 'evolve' | 'upgrade' | 'transmute';
  
  // Source Assets
  source_assets: {
    universal_id: string;
    game_context: string;
    contribution_weight: number; // 0-1 scale
    consumed_in_fusion: boolean; // Is asset destroyed in process
  }[];
  
  // Fusion Rules
  fusion_rules: {
    // Compatibility
    compatible_elements: string[];
    incompatible_elements: string[];
    required_archetypes?: string[];
    
    // Requirements
    min_combined_power: number;
    max_combined_power?: number;
    required_essence_factors: string[];
    
    // Process
    success_rate: number;        // Base success rate
    fusion_cost: { amount: string; currency: string };
    fusion_time: number;         // Processing time in seconds
    reversible: boolean;         // Can fusion be undone
  };
  
  // Predicted Outcomes
  outcome_predictions: {
    most_likely_outcome: FusionOutcome;
    possible_outcomes: FusionOutcome[];
    failure_probability: number;
    catastrophic_failure_probability: number; // Chance of losing all assets
  };
  
  // Result (if completed)
  fusion_result?: {
    success: boolean;
    created_asset?: UniversalAsset;
    source_assets_status: Record<string, 'consumed' | 'modified' | 'returned'>;
    unexpected_effects?: string[];
    transaction_id: string;
  };
}

/**
 * Fusion Outcome Prediction
 */
export interface FusionOutcome {
  outcome_id: string;
  probability: number;          // 0-1 scale
  
  // Result Asset
  result_asset: {
    predicted_essence: CoreEssence;
    predicted_properties: Record<string, any>;
    predicted_rarity: string;
    predicted_power_tier: number;
    
    // Inheritance
    inherited_from: Record<string, string[]>; // Property -> source asset IDs
    novel_properties: string[];               // Completely new properties
  };
  
  // Quality Metrics
  quality_assessment: {
    overall_quality: number;    // 0-1 scale
    innovation_score: number;   // How unique/innovative the result is
    balance_score: number;      // How well-balanced the result is
    utility_score: number;      // How useful across games
  };
}