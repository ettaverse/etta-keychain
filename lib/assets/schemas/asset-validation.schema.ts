/**
 * Zod validation schemas for Universal Assets and related data structures
 */

import { z } from 'zod';

/**
 * Common validation schemas
 */
const PriceSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format'),
  currency: z.string().min(1, 'Currency is required').toUpperCase()
});

const TimestampSchema = z.string().datetime('Invalid ISO timestamp');

const UserSchema = z.string().min(3, 'Username must be at least 3 characters').max(16, 'Username must be at most 16 characters');

/**
 * Core Essence validation schema
 */
export const CoreEssenceSchema = z.object({
  // Primary Classification
  element: z.string().optional(),
  archetype: z.string().min(1, 'Archetype is required'),
  power_tier: z.number().min(0, 'Power tier must be at least 0').max(100, 'Power tier must be at most 100'),
  
  // Behavioral Traits
  temperament: z.string().optional(),
  intelligence: z.string().optional(),
  rarity_class: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']),
  
  // Physical/Conceptual Properties
  size_class: z.string().optional(),
  craftsmanship: z.string().optional(),
  age: z.string().optional(),
  
  // Thematic Properties
  origin_story: z.string().optional(),
  cultural_significance: z.string().optional(),
  magical_nature: z.string().optional(),
  
  // Technical Properties
  essence_score: z.number().min(0).max(1000),
  compatibility_factors: z.array(z.string())
});

/**
 * Game Variant validation schema
 */
export const GameVariantSchema = z.object({
  game_id: z.string().min(1, 'Game ID is required'),
  asset_type: z.string().min(1, 'Asset type is required'),
  
  // Game-Specific Properties
  properties: z.record(z.string(), z.any()),
  
  // Display Information
  display: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    image_url: z.string().url('Invalid image URL').optional(),
    animation_url: z.string().url('Invalid animation URL').optional(),
    model_url: z.string().url('Invalid model URL').optional()
  }),
  
  // Game Mechanics
  mechanics: z.object({
    usable_in: z.array(z.string()),
    abilities: z.array(z.string()).optional(),
    restrictions: z.array(z.string()).optional(),
    cooldown: z.number().min(0).optional(),
    durability: z.number().min(0).optional()
  }),
  
  // Compatibility Information
  compatibility: z.object({
    min_game_version: z.string(),
    max_game_version: z.string().optional(),
    required_features: z.array(z.string()).optional(),
    incompatible_with: z.array(z.string()).optional()
  }),
  
  // Status Information
  status: z.object({
    active: z.boolean(),
    deprecated: z.boolean(),
    migration_target: z.string().optional()
  })
});

/**
 * Asset Transaction validation schema
 */
export const AssetTransactionSchema = z.object({
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  operation_type: z.enum(['mint', 'transfer', 'convert', 'update', 'burn']),
  timestamp: TimestampSchema,
  
  // Participants
  from_user: UserSchema.optional(),
  to_user: UserSchema.optional(),
  
  // Transaction Details
  game_context: z.string().optional(),
  price: PriceSchema.optional(),
  memo: z.string().optional(),
  
  // Operation-Specific Data
  operation_data: z.record(z.string(), z.any()).optional(),
  
  // Results
  success: z.boolean(),
  error_message: z.string().optional(),
  gas_used: PriceSchema.optional()
});

/**
 * Universal Asset validation schema
 */
export const UniversalAssetSchema = z.object({
  // Universal Identifiers
  universal_id: z.string().min(1, 'Universal ID is required'),
  domain: z.string().min(1, 'Domain is required'),
  creation_timestamp: TimestampSchema,
  creator: UserSchema,
  current_owner: UserSchema,
  
  // Core Asset Metadata
  base_metadata: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    description: z.string().max(1000, 'Description must be at most 1000 characters'),
    image_url: z.string().url('Invalid image URL'),
    external_url: z.string().url('Invalid external URL').optional(),
    animation_url: z.string().url('Invalid animation URL').optional(),
    core_attributes: z.record(z.string(), z.any()),
    tags: z.array(z.string().min(1).max(30)).max(20, 'Maximum 20 tags allowed')
  }),
  
  // Web2 Integration Support
  web2_integration: z.object({
    source_system: z.string().min(1, 'Source system is required'),
    source_id: z.string().min(1, 'Source ID is required'),
    sync_status: z.enum(['synced', 'pending', 'error', 'disabled']),
    last_sync: TimestampSchema,
    sync_metadata: z.record(z.string(), z.any()).optional()
  }).optional(),
  
  // Core Essence
  core_essence: CoreEssenceSchema,
  
  // Game-Specific Variants
  variants: z.record(z.string(), GameVariantSchema),
  
  // Asset Properties
  properties: z.object({
    tradeable: z.boolean(),
    transferable: z.boolean(),
    burnable: z.boolean(),
    mintable: z.boolean(),
    supply: z.object({
      total: z.number().min(0),
      circulating: z.number().min(0),
      burned: z.number().min(0)
    }),
    rarity: z.object({
      tier: z.string().min(1, 'Rarity tier is required'),
      score: z.number().min(0).max(100),
      rank: z.number().min(1).optional()
    })
  }),
  
  // Economic Information
  economic_data: z.object({
    mint_price: PriceSchema.optional(),
    current_value: PriceSchema.optional(),
    last_sale: z.object({
      amount: z.string(),
      currency: z.string(),
      timestamp: TimestampSchema
    }).optional(),
    royalty_percentage: z.number().min(0).max(100).optional(),
    royalty_recipient: UserSchema.optional()
  }).optional(),
  
  // Blockchain Information
  blockchain_info: z.object({
    transaction_id: z.string().min(1, 'Transaction ID is required'),
    block_number: z.number().min(0),
    confirmation_count: z.number().min(0),
    network: z.enum(['steem', 'steem_testnet'])
  }),
  
  // Transfer History
  transfer_history: z.array(AssetTransactionSchema)
}).refine((data) => {
  // Custom validation: circulating supply should not exceed total supply
  return data.properties.supply.circulating <= data.properties.supply.total;
}, {
  message: 'Circulating supply cannot exceed total supply',
  path: ['properties', 'supply', 'circulating']
}).refine((data) => {
  // Custom validation: burned supply should not exceed total supply
  return data.properties.supply.burned <= data.properties.supply.total;
}, {
  message: 'Burned supply cannot exceed total supply',
  path: ['properties', 'supply', 'burned']
}).refine((data) => {
  // Custom validation: if mintable is false, total supply should be fixed
  if (!data.properties.mintable && data.properties.supply.total === 0) {
    return false;
  }
  return true;
}, {
  message: 'Non-mintable assets must have a fixed total supply',
  path: ['properties', 'mintable']
});

/**
 * Asset Creation Request validation schema
 */
export const AssetCreationRequestSchema = z.object({
  // Basic Information
  domain: z.string().min(1, 'Domain is required'),
  initial_game_id: z.string().min(1, 'Initial game ID is required'),
  asset_type: z.string().min(1, 'Asset type is required'),
  
  // Metadata
  base_metadata: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    description: z.string().max(1000, 'Description must be at most 1000 characters'),
    image_url: z.string().url('Invalid image URL'),
    external_url: z.string().url('Invalid external URL').optional(),
    animation_url: z.string().url('Invalid animation URL').optional(),
    core_attributes: z.record(z.string(), z.any()),
    tags: z.array(z.string().min(1).max(30)).max(20, 'Maximum 20 tags allowed').optional()
  }),
  
  // Core Essence Definition (without calculated fields)
  core_essence: CoreEssenceSchema.omit({ essence_score: true, compatibility_factors: true }),
  
  // Initial Game Variant (without game_id and status)
  initial_variant: GameVariantSchema.omit({ game_id: true, status: true }),
  
  // Creation Options
  creation_options: z.object({
    owner: UserSchema,
    tradeable: z.boolean(),
    transferable: z.boolean(),
    burnable: z.boolean(),
    mintable: z.boolean(),
    total_supply: z.number().min(1).optional(),
    royalty_percentage: z.number().min(0).max(100).optional(),
    royalty_recipient: UserSchema.optional()
  }),
  
  // Web2 Integration (optional)
  web2_integration: z.object({
    source_system: z.string().min(1, 'Source system is required'),
    source_id: z.string().min(1, 'Source ID is required'),
    sync_metadata: z.record(z.string(), z.any()).optional()
  }).optional()
}).refine((data) => {
  // If royalty percentage is set, recipient must be provided
  if (data.creation_options.royalty_percentage !== undefined && data.creation_options.royalty_percentage > 0) {
    return data.creation_options.royalty_recipient !== undefined;
  }
  return true;
}, {
  message: 'Royalty recipient is required when royalty percentage is set',
  path: ['creation_options', 'royalty_recipient']
});

/**
 * Asset Update Request validation schema
 */
export const AssetUpdateRequestSchema = z.object({
  universal_id: z.string().min(1, 'Universal ID is required'),
  update_type: z.enum(['metadata', 'variant_add', 'variant_update', 'properties', 'transfer']),
  update_data: z.record(z.string(), z.any()),
  authorized_by: UserSchema,
  signature: z.string().optional()
});

/**
 * Asset Filters validation schema
 */
export const AssetFiltersSchema = z.object({
  // Identity Filters
  creator: UserSchema.optional(),
  owner: UserSchema.optional(),
  domain: z.string().optional(),
  game_id: z.string().optional(),
  asset_type: z.string().optional(),
  
  // Metadata Filters
  name_contains: z.string().optional(),
  description_contains: z.string().optional(),
  tags: z.array(z.string()).optional(),
  tags_any: z.array(z.string()).optional(),
  
  // Property Filters
  rarity: z.array(z.string()).optional(),
  element: z.array(z.string()).optional(),
  archetype: z.array(z.string()).optional(),
  power_tier_min: z.number().min(0).max(100).optional(),
  power_tier_max: z.number().min(0).max(100).optional(),
  
  // Status Filters
  tradeable: z.boolean().optional(),
  transferable: z.boolean().optional(),
  for_sale: z.boolean().optional(),
  has_variants: z.boolean().optional(),
  
  // Economic Filters
  min_price: PriceSchema.optional(),
  max_price: PriceSchema.optional(),
  has_price: z.boolean().optional(),
  royalty_percentage_min: z.number().min(0).max(100).optional(),
  royalty_percentage_max: z.number().min(0).max(100).optional(),
  
  // Date Filters
  created_after: TimestampSchema.optional(),
  created_before: TimestampSchema.optional(),
  last_activity_after: TimestampSchema.optional(),
  last_activity_before: TimestampSchema.optional(),
  
  // Supply Filters
  total_supply_min: z.number().min(0).optional(),
  total_supply_max: z.number().min(0).optional(),
  circulating_supply_min: z.number().min(0).optional(),
  circulating_supply_max: z.number().min(0).optional(),
  
  // Game-Specific Filters
  usable_in: z.array(z.string()).optional(),
  has_abilities: z.array(z.string()).optional(),
  compatible_with_game: z.string().optional(),
  
  // Advanced Filters
  essence_score_min: z.number().min(0).optional(),
  essence_score_max: z.number().min(0).optional(),
  compatibility_factors: z.array(z.string()).optional(),
  
  // Sorting Options
  sort_by: z.enum([
    'created_date', 'last_activity', 'name', 'creator', 'price', 
    'rarity_score', 'power_tier', 'essence_score', 'popularity', 
    'value', 'supply', 'transfer_count', 'random'
  ]).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  
  // Pagination
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  
  // Result Options
  include_variants: z.boolean().optional(),
  include_history: z.boolean().optional(),
  include_market_data: z.boolean().optional()
}).refine((data) => {
  // Power tier min should not exceed max
  if (data.power_tier_min !== undefined && data.power_tier_max !== undefined) {
    return data.power_tier_min <= data.power_tier_max;
  }
  return true;
}, {
  message: 'Power tier minimum cannot exceed maximum',
  path: ['power_tier_max']
}).refine((data) => {
  // Royalty percentage min should not exceed max
  if (data.royalty_percentage_min !== undefined && data.royalty_percentage_max !== undefined) {
    return data.royalty_percentage_min <= data.royalty_percentage_max;
  }
  return true;
}, {
  message: 'Royalty percentage minimum cannot exceed maximum',
  path: ['royalty_percentage_max']
}).refine((data) => {
  // Created before should be after created after
  if (data.created_after !== undefined && data.created_before !== undefined) {
    return new Date(data.created_after) <= new Date(data.created_before);
  }
  return true;
}, {
  message: 'Created before date must be after created after date',
  path: ['created_before']
});

/**
 * Helper functions for validation
 */
export const validateUniversalAsset = (data: unknown) => {
  return UniversalAssetSchema.safeParse(data);
};

export const validateAssetCreationRequest = (data: unknown) => {
  return AssetCreationRequestSchema.safeParse(data);
};

export const validateAssetUpdateRequest = (data: unknown) => {
  return AssetUpdateRequestSchema.safeParse(data);
};

export const validateAssetFilters = (data: unknown) => {
  return AssetFiltersSchema.safeParse(data);
};

export const validateCoreEssence = (data: unknown) => {
  return CoreEssenceSchema.safeParse(data);
};

export const validateGameVariant = (data: unknown) => {
  return GameVariantSchema.safeParse(data);
};

/**
 * Type inference from schemas
 */
export type ValidatedUniversalAsset = z.infer<typeof UniversalAssetSchema>;
export type ValidatedAssetCreationRequest = z.infer<typeof AssetCreationRequestSchema>;
export type ValidatedAssetUpdateRequest = z.infer<typeof AssetUpdateRequestSchema>;
export type ValidatedAssetFilters = z.infer<typeof AssetFiltersSchema>;
export type ValidatedCoreEssence = z.infer<typeof CoreEssenceSchema>;
export type ValidatedGameVariant = z.infer<typeof GameVariantSchema>;