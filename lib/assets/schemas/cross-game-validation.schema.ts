/**
 * Zod validation schemas for cross-game asset functionality
 */

import { z } from 'zod';

/**
 * Game Information validation schema
 */
export const GameInfoSchema = z.object({
  game_id: z.string().min(1, 'Game ID is required'),
  name: z.string().min(1, 'Game name is required'),
  domain: z.string().min(1, 'Domain is required'),
  description: z.string().max(500, 'Description must be at most 500 characters'),
  
  // Game Metadata
  metadata: z.object({
    developer: z.string().min(1, 'Developer is required'),
    version: z.string().min(1, 'Version is required'),
    website: z.string().url('Invalid website URL').optional(),
    social_links: z.record(z.string(), z.string().url()).optional()
  }),
  
  // Asset System Integration
  asset_integration: z.object({
    supported_asset_types: z.array(z.string().min(1)),
    essence_interpretation: z.any(), // Complex nested object, validated separately
    custom_properties: z.array(z.string()),
    api_endpoints: z.array(z.string().url()).optional()
  }),
  
  // Compatibility Information
  compatibility: z.object({
    compatible_games: z.array(z.string()),
    conversion_rules: z.array(z.any()), // Complex nested objects
    restricted_elements: z.array(z.string()).optional()
  }),
  
  // Status
  status: z.object({
    active: z.boolean(),
    accepting_assets: z.boolean(),
    last_updated: z.string().datetime()
  })
});

/**
 * Domain Information validation schema
 */
export const DomainInfoSchema = z.object({
  domain_id: z.string().min(1, 'Domain ID is required'),
  name: z.string().min(1, 'Domain name is required'),
  description: z.string().max(500, 'Description must be at most 500 characters'),
  
  // Domain Properties
  properties: z.object({
    primary_focus: z.string().min(1, 'Primary focus is required'),
    asset_categories: z.array(z.string()),
    total_games: z.number().min(0),
    total_assets: z.number().min(0)
  }),
  
  // Games in Domain
  games: z.array(z.string()),
  
  // Domain Rules
  rules: z.object({
    asset_requirements: z.record(z.string(), z.any()),
    cross_domain_allowed: z.boolean(),
    moderation_required: z.boolean()
  })
});

/**
 * Essence Condition validation schema
 */
export const EssenceConditionSchema = z.object({
  property: z.string().min(1, 'Property is required'),
  operator: z.enum(['==', '!=', '>', '<', '>=', '<=', 'includes', 'excludes']),
  value: z.any(),
  weight: z.number().min(0).max(1).optional()
});

/**
 * Property Mapping validation schema
 */
export const PropertyMappingSchema = z.object({
  target_property: z.string().min(1, 'Target property is required'),
  source_properties: z.array(z.string().min(1)),
  formula: z.string().min(1, 'Formula is required'),
  modifiers: z.record(z.string(), z.number()).optional()
});

/**
 * Essence Interpretation Rules validation schema
 */
export const EssenceInterpretationRulesSchema = z.object({
  game_id: z.string().min(1, 'Game ID is required'),
  
  // Property Mapping Rules
  property_mappings: z.record(z.string(), PropertyMappingSchema),
  
  // Asset Type Determination
  asset_type_rules: z.array(z.object({
    conditions: z.array(EssenceConditionSchema),
    result_type: z.string().min(1, 'Result type is required')
  })),
  
  // Stat Calculation Formulas
  stat_calculations: z.record(z.string(), z.object({
    formula: z.string().min(1, 'Formula is required'),
    min_value: z.number().optional(),
    max_value: z.number().optional(),
    rounding: z.enum(['floor', 'ceil', 'round']).optional()
  })),
  
  // Ability Assignment Rules
  ability_rules: z.array(z.object({
    conditions: z.array(EssenceConditionSchema),
    granted_abilities: z.array(z.string())
  }))
});

/**
 * Property Transformation validation schema
 */
export const PropertyTransformationSchema = z.object({
  target_property: z.string().min(1, 'Target property is required'),
  transformation_type: z.enum(['direct', 'formula', 'lookup', 'conditional']),
  
  transformation_data: z.object({
    formula: z.string().optional(),
    lookup_table: z.record(z.string(), z.any()).optional(),
    conditions: z.array(EssenceConditionSchema).optional(),
    precision_loss: z.number().min(0).max(1).optional()
  })
});

/**
 * Conversion Rule validation schema
 */
export const ConversionRuleSchema = z.object({
  from_game: z.string().min(1, 'From game is required'),
  to_game: z.string().min(1, 'To game is required'),
  
  // Compatibility
  compatibility: z.object({
    compatible: z.boolean(),
    compatibility_score: z.number().min(0).max(1),
    success_rate: z.number().min(0).max(1)
  }),
  
  // Requirements
  requirements: z.object({
    min_essence_score: z.number().min(0).optional(),
    required_elements: z.array(z.string()).optional(),
    excluded_elements: z.array(z.string()).optional(),
    min_power_tier: z.number().min(0).max(100).optional(),
    user_requirements: z.object({
      min_level: z.number().min(0).optional(),
      holding_period: z.number().min(0).optional(),
      reputation: z.number().min(0).optional()
    }).optional()
  }),
  
  // Conversion Process
  conversion_process: z.object({
    conversion_cost: z.object({
      amount: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format'),
      currency: z.string().min(1, 'Currency is required')
    }),
    conversion_time: z.number().min(0),
    reversible: z.boolean(),
    rollback_period: z.number().min(0).optional()
  }),
  
  // Property Transformations
  property_transformations: z.record(z.string(), PropertyTransformationSchema),
  
  // Side Effects
  side_effects: z.object({
    properties_lost: z.array(z.string()),
    properties_gained: z.array(z.string()),
    stat_adjustments: z.record(z.string(), z.number()).optional(),
    ability_changes: z.object({
      removed: z.array(z.string()),
      added: z.array(z.string())
    }).optional()
  })
});

/**
 * Asset Conversion Request validation schema
 */
export const AssetConversionRequestSchema = z.object({
  universal_id: z.string().min(1, 'Universal ID is required'),
  from_game: z.string().min(1, 'From game is required'),
  to_game: z.string().min(1, 'To game is required'),
  requester: z.string().min(3, 'Requester username is required'),
  
  // Conversion Options
  options: z.object({
    accept_quality_loss: z.boolean().optional(),
    priority_properties: z.array(z.string()).optional(),
    custom_parameters: z.record(z.string(), z.any()).optional(),
    
    // Risk Management
    max_acceptable_cost: z.object({
      amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
      currency: z.string()
    }).optional(),
    min_success_rate: z.number().min(0).max(1).optional(),
    require_rollback_option: z.boolean().optional()
  }),
  
  // User Preferences
  preferences: z.object({
    conversion_speed: z.enum(['instant', 'fast', 'economy']).optional(),
    quality_preference: z.enum(['maximum', 'balanced', 'cost_effective']).optional(),
    notification_preference: z.enum(['all', 'important', 'none']).optional()
  }).optional()
}).refine((data) => {
  // Cannot convert to the same game
  return data.from_game !== data.to_game;
}, {
  message: 'Cannot convert asset to the same game',
  path: ['to_game']
});

/**
 * Asset Conversion Response validation schema
 */
export const AssetConversionResponseSchema = z.object({
  conversion_id: z.string().min(1, 'Conversion ID is required'),
  request_timestamp: z.string().datetime(),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  
  // Conversion Details
  conversion_details: z.object({
    universal_id: z.string().min(1),
    from_game: z.string().min(1),
    to_game: z.string().min(1),
    requester: z.string().min(3),
    
    // Process Information
    estimated_completion: z.string().datetime(),
    actual_completion: z.string().datetime().optional(),
    success_rate_achieved: z.number().min(0).max(1).optional(),
    
    // Cost Information
    estimated_cost: z.object({
      amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
      currency: z.string()
    }),
    actual_cost: z.object({
      amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
      currency: z.string()
    }).optional(),
    fee_breakdown: z.object({
      base_fee: z.object({
        amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
        currency: z.string()
      }),
      complexity_fee: z.object({
        amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
        currency: z.string()
      }).optional(),
      priority_fee: z.object({
        amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
        currency: z.string()
      }).optional(),
      gas_fee: z.object({
        amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
        currency: z.string()
      }).optional()
    }).optional()
  }),
  
  // Results (if completed)
  conversion_result: z.object({
    success: z.boolean(),
    transaction_id: z.string().optional(),
    original_variant: z.any(), // GameVariant schema
    new_variant: z.any().optional(), // GameVariant schema
    
    // Property Analysis
    property_changes: z.object({
      preserved: z.record(z.string(), z.any()),
      modified: z.record(z.string(), z.object({
        from: z.any(),
        to: z.any(),
        change_reason: z.string().optional()
      })),
      added: z.record(z.string(), z.any()),
      removed: z.record(z.string(), z.any())
    }),
    
    // Quality Assessment
    quality_metrics: z.object({
      overall_retention: z.number().min(0).max(1),
      property_accuracy: z.record(z.string(), z.number().min(0).max(1)),
      functional_equivalence: z.number().min(0).max(1)
    }),
    
    // Rollback Information
    rollback_available: z.boolean(),
    rollback_deadline: z.string().datetime().optional(),
    rollback_cost: z.object({
      amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
      currency: z.string()
    }).optional()
  }).optional(),
  
  // Error Information (if failed)
  error_info: z.object({
    error_code: z.string(),
    error_message: z.string(),
    error_details: z.record(z.string(), z.any()).optional(),
    retry_possible: z.boolean(),
    retry_after: z.number().min(0).optional()
  }).optional(),
  
  // Progress Updates
  progress_updates: z.array(z.object({
    timestamp: z.string().datetime(),
    stage: z.string(),
    progress_percentage: z.number().min(0).max(100),
    message: z.string(),
    details: z.record(z.string(), z.any()).optional()
  })).optional()
});

/**
 * Compatibility Result validation schema
 */
export const CompatibilityResultSchema = z.object({
  from_game: z.string().min(1, 'From game is required'),
  to_game: z.string().min(1, 'To game is required'),
  universal_id: z.string().min(1, 'Universal ID is required'),
  
  // Compatibility Assessment
  compatibility: z.object({
    overall_compatible: z.boolean(),
    compatibility_score: z.number().min(0).max(1),
    confidence_level: z.number().min(0).max(1)
  }),
  
  // Detailed Analysis
  analysis: z.object({
    compatible_properties: z.array(z.string()),
    incompatible_properties: z.array(z.string()),
    property_mappings: z.record(z.string(), z.string()),
    estimated_success_rate: z.number().min(0).max(1)
  }),
  
  // Requirements Check
  requirements_status: z.object({
    met: z.boolean(),
    missing_requirements: z.array(z.string()),
    user_requirements_met: z.boolean()
  }),
  
  // Predictions
  predictions: z.object({
    estimated_cost: z.object({
      amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
      currency: z.string()
    }),
    estimated_time: z.number().min(0),
    quality_retention: z.number().min(0).max(1),
    recommended: z.boolean()
  })
});

/**
 * Cross-Game Asset Portfolio validation schema
 */
export const CrossGamePortfolioSchema = z.object({
  owner: z.string().min(3, 'Owner username is required'),
  portfolio_id: z.string().min(1, 'Portfolio ID is required'),
  last_updated: z.string().datetime(),
  
  // Asset Summary
  summary: z.object({
    total_assets: z.number().min(0),
    total_variants: z.number().min(0),
    domains_covered: z.array(z.string()),
    games_covered: z.array(z.string()),
    cross_game_assets: z.number().min(0),
    conversion_opportunities: z.number().min(0),
    total_portfolio_value: z.object({
      amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
      currency: z.string()
    }).optional()
  }),
  
  // Grouped Assets
  assets_by_domain: z.record(z.string(), z.array(z.any())), // UniversalAsset array
  assets_by_game: z.record(z.string(), z.array(z.any())), // UniversalAsset array
  assets_by_type: z.record(z.string(), z.array(z.any())), // UniversalAsset array
  
  // Cross-Game Analysis
  cross_game_analysis: z.object({
    compatibility_coverage: z.number().min(0).max(1),
    conversion_recommendations: z.array(z.any()), // ConversionRecommendation array
    portfolio_diversification: z.object({
      domain_distribution: z.record(z.string(), z.number()),
      game_distribution: z.record(z.string(), z.number()),
      element_distribution: z.record(z.string(), z.number())
    })
  }),
  
  // Activity Summary
  recent_activity: z.object({
    conversions_30d: z.number().min(0),
    acquisitions_30d: z.number().min(0),
    trades_30d: z.number().min(0),
    most_active_games: z.array(z.string())
  })
});

/**
 * Tournament Requirements validation schema
 */
export const TournamentRequirementsSchema = z.object({
  // Player Requirements
  min_player_level: z.number().min(0).optional(),
  min_reputation: z.number().min(0).optional(),
  registration_fee: z.object({
    amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
    currency: z.string()
  }).optional(),
  
  // Asset Requirements
  min_assets_owned: z.number().min(0),
  required_asset_types: z.array(z.string()).optional(),
  min_total_asset_value: z.object({
    amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
    currency: z.string()
  }).optional(),
  
  // Eligibility
  geographical_restrictions: z.array(z.string()).optional(),
  age_restrictions: z.object({
    min_age: z.number().min(0),
    max_age: z.number().min(0).optional()
  }).optional(),
  previous_participation_limits: z.number().min(0).optional()
});

/**
 * Asset Fusion validation schema
 */
export const AssetFusionSchema = z.object({
  fusion_id: z.string().min(1, 'Fusion ID is required'),
  fusion_type: z.enum(['combine', 'evolve', 'upgrade', 'transmute']),
  
  // Source Assets
  source_assets: z.array(z.object({
    universal_id: z.string().min(1, 'Universal ID is required'),
    game_context: z.string().min(1, 'Game context is required'),
    contribution_weight: z.number().min(0).max(1),
    consumed_in_fusion: z.boolean()
  })).min(1, 'At least one source asset is required'),
  
  // Fusion Rules
  fusion_rules: z.object({
    // Compatibility
    compatible_elements: z.array(z.string()),
    incompatible_elements: z.array(z.string()),
    required_archetypes: z.array(z.string()).optional(),
    
    // Requirements
    min_combined_power: z.number().min(0),
    max_combined_power: z.number().min(0).optional(),
    required_essence_factors: z.array(z.string()),
    
    // Process
    success_rate: z.number().min(0).max(1),
    fusion_cost: z.object({
      amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
      currency: z.string()
    }),
    fusion_time: z.number().min(0),
    reversible: z.boolean()
  }),
  
  // Predicted Outcomes
  outcome_predictions: z.object({
    most_likely_outcome: z.any(), // FusionOutcome schema
    possible_outcomes: z.array(z.any()), // FusionOutcome array
    failure_probability: z.number().min(0).max(1),
    catastrophic_failure_probability: z.number().min(0).max(1)
  }),
  
  // Result (if completed)
  fusion_result: z.object({
    success: z.boolean(),
    created_asset: z.any().optional(), // UniversalAsset schema
    source_assets_status: z.record(z.string(), z.enum(['consumed', 'modified', 'returned'])),
    unexpected_effects: z.array(z.string()).optional(),
    transaction_id: z.string()
  }).optional()
}).refine((data) => {
  // Total contribution weights should not exceed 1
  const totalWeight = data.source_assets.reduce((sum, asset) => sum + asset.contribution_weight, 0);
  return totalWeight <= 1;
}, {
  message: 'Total contribution weights cannot exceed 1',
  path: ['source_assets']
}).refine((data) => {
  // Max combined power should be greater than min if both are specified
  if (data.fusion_rules.max_combined_power !== undefined) {
    return data.fusion_rules.max_combined_power >= data.fusion_rules.min_combined_power;
  }
  return true;
}, {
  message: 'Maximum combined power must be greater than or equal to minimum',
  path: ['fusion_rules', 'max_combined_power']
});

/**
 * Helper functions for cross-game validation
 */
export const validateGameInfo = (data: unknown) => {
  return GameInfoSchema.safeParse(data);
};

export const validateDomainInfo = (data: unknown) => {
  return DomainInfoSchema.safeParse(data);
};

export const validateConversionRule = (data: unknown) => {
  return ConversionRuleSchema.safeParse(data);
};

export const validateAssetConversionRequest = (data: unknown) => {
  return AssetConversionRequestSchema.safeParse(data);
};

export const validateAssetConversionResponse = (data: unknown) => {
  return AssetConversionResponseSchema.safeParse(data);
};

export const validateCompatibilityResult = (data: unknown) => {
  return CompatibilityResultSchema.safeParse(data);
};

export const validateCrossGamePortfolio = (data: unknown) => {
  return CrossGamePortfolioSchema.safeParse(data);
};

export const validateAssetFusion = (data: unknown) => {
  return AssetFusionSchema.safeParse(data);
};

/**
 * Type inference from schemas
 */
export type ValidatedGameInfo = z.infer<typeof GameInfoSchema>;
export type ValidatedDomainInfo = z.infer<typeof DomainInfoSchema>;
export type ValidatedConversionRule = z.infer<typeof ConversionRuleSchema>;
export type ValidatedAssetConversionRequest = z.infer<typeof AssetConversionRequestSchema>;
export type ValidatedAssetConversionResponse = z.infer<typeof AssetConversionResponseSchema>;
export type ValidatedCompatibilityResult = z.infer<typeof CompatibilityResultSchema>;
export type ValidatedCrossGamePortfolio = z.infer<typeof CrossGamePortfolioSchema>;
export type ValidatedAssetFusion = z.infer<typeof AssetFusionSchema>;