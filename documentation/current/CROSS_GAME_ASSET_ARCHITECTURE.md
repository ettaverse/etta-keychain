# Cross-Game Asset Architecture

## Overview

The Cross-Game Asset Architecture enables a single universal asset to exist across multiple games with game-specific properties, behaviors, and representations while maintaining a unified identity on the STEEM blockchain.

## Core Concepts

### Universal Asset Identity

Every asset has a **Universal Identity** that persists across games:

```typescript
interface UniversalIdentity {
  universal_id: string;        // e.g., "fire_dragon_001"
  base_name: string;          // e.g., "Fire Dragon"
  core_essence: {             // Properties that define the asset's essence
    element: string;          // e.g., "fire"
    archetype: string;        // e.g., "dragon"
    power_tier: number;       // e.g., 95 (0-100 scale)
    origin_story: string;     // Lore/background
  };
  creation_metadata: {
    created_by: string;
    creation_date: string;
    original_game: string;
    creation_transaction: string;
  };
}
```

### Game-Specific Manifestations

Each game interprets the universal asset differently:

```typescript
interface GameManifestation {
  game_id: string;
  manifestation_type: string;    // "card", "creature", "ingredient", "item"
  
  // How the universal essence translates to this game
  interpretation: {
    display_name: string;        // Game-specific name
    visual_representation: {
      image_url: string;
      animation_url?: string;
      model_url?: string;
      particle_effects?: string[];
    };
    
    // Game mechanics translation
    mechanics_mapping: {
      [universal_property: string]: GameSpecificProperty;
    };
  };
  
  // Game-specific properties derived from universal essence
  game_properties: Record<string, any>;
  
  // Game-specific behaviors
  behaviors: {
    usable_in: string[];
    interactions: GameInteraction[];
    evolution_paths?: EvolutionPath[];
  };
}
```

## Architectural Patterns

### 1. Essence-Based Architecture

The system uses an **Essence-Based Architecture** where the universal asset's core essence determines how it manifests in different games:

```typescript
// Example: Fire Dragon across games
const fireDragonEssence = {
  universal_id: "fire_dragon_001",
  base_name: "Fire Dragon",
  core_essence: {
    element: "fire",
    archetype: "dragon",
    power_tier: 95,
    temperament: "aggressive",
    size_class: "large",
    intelligence: "high"
  }
};

// Manifestations in different games:
const manifestations = {
  "splinterlands": {
    manifestation_type: "battle_card",
    interpretation: {
      display_name: "Ancient Fire Dragon",
      mechanics_mapping: {
        "power_tier": { stat: "attack", formula: "power_tier * 0.08" },      // 95 * 0.08 = 7.6 ≈ 8
        "element": { stat: "splinter", value: "fire" },
        "size_class": { stat: "mana_cost", formula: "size_class_modifier * 1.5" }, // large = 7 mana
        "temperament": { abilities: ["Blast", "Fury"] }
      }
    },
    game_properties: {
      mana_cost: 7,
      attack: 8,
      health: 6,
      armor: 2,
      speed: 4,
      abilities: ["Flying", "Blast", "Scorch"]
    }
  },
  
  "cryptobrewmaster": {
    manifestation_type: "brewing_ingredient",
    interpretation: {
      display_name: "Dragon Fire Extract",
      mechanics_mapping: {
        "power_tier": { stat: "brewing_power", formula: "power_tier" },     // 95
        "element": { stat: "flavor_profile", value: "intense_heat" },
        "temperament": { stat: "volatility", value: "high" }
      }
    },
    game_properties: {
      brewing_power: 95,
      flavor_profile: "intense_heat",
      alcohol_boost: 0.8,
      volatility: "high",
      rarity_modifier: 3.0,
      ingredient_type: "essence"
    }
  },
  
  "steemmonsters": {
    manifestation_type: "battle_creature",
    interpretation: {
      display_name: "Primordial Fire Dragon",
      mechanics_mapping: {
        "power_tier": { stat: "combat_power", formula: "power_tier" },
        "intelligence": { stat: "spell_power", formula: "intelligence_level * 20" },
        "size_class": { stat: "health", formula: "size_modifier * 30" }
      }
    },
    game_properties: {
      combat_power: 95,
      health: 120,
      spell_power: 80,
      elemental_resistance: { fire: 90, ice: 10, lightning: 40 },
      special_abilities: ["Dragon_Breath", "Wing_Buffet", "Intimidate"]
    }
  }
};
```

### 2. Compatibility Matrix System

Games are connected through a **Compatibility Matrix** that defines how assets can be converted between games:

```typescript
interface CompatibilityMatrix {
  [sourceGame: string]: {
    [targetGame: string]: CompatibilityRule;
  };
}

interface CompatibilityRule {
  // Basic compatibility
  compatible: boolean;
  compatibility_score: number;  // 0-1 scale
  
  // Conversion requirements
  requirements: {
    min_power_tier?: number;
    required_essence?: string[];
    excluded_essence?: string[];
    user_level?: number;
    holding_period?: number;      // minimum time owned
  };
  
  // Conversion process
  conversion: {
    success_rate: number;         // 0-1 probability
    conversion_cost: { amount: string; currency: string };
    conversion_time: number;      // seconds
    reversible: boolean;
  };
  
  // Property mapping
  property_mapping: {
    [sourceProperty: string]: {
      target_property: string;
      conversion_formula: string;
      precision_loss?: number;    // 0-1 scale
    };
  };
  
  // Restrictions and limitations
  restrictions: {
    properties_lost: string[];
    properties_gained: string[];
    level_reset?: boolean;
    ability_remapping?: boolean;
  };
}
```

### 3. Conversion Engine

The **Conversion Engine** handles asset transformations between games:

```typescript
class AssetConversionEngine {
  private compatibilityMatrix: CompatibilityMatrix;
  private essenceCalculator: EssenceCalculator;
  
  async convertAsset(
    universalId: string,
    fromGame: string,
    toGame: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    
    // 1. Validate conversion possibility
    const compatibility = this.getCompatibility(fromGame, toGame);
    if (!compatibility.compatible) {
      throw new ConversionError('Games are not compatible');
    }
    
    // 2. Get current asset data
    const asset = await this.getAsset(universalId);
    const sourceVariant = asset.variants[fromGame];
    
    // 3. Check requirements
    await this.validateRequirements(asset, compatibility.requirements);
    
    // 4. Calculate conversion success
    const conversionSuccess = await this.calculateConversionSuccess(
      asset, compatibility, options
    );
    
    if (!conversionSuccess.success) {
      return {
        success: false,
        error: conversionSuccess.error,
        rollback_available: true
      };
    }
    
    // 5. Perform essence-based conversion
    const newVariant = await this.performEssenceConversion(
      asset.core_essence,
      toGame,
      compatibility.property_mapping
    );
    
    // 6. Handle property transformations
    const transformedProperties = await this.transformProperties(
      sourceVariant.game_properties,
      compatibility.property_mapping
    );
    
    // 7. Create new game variant
    const convertedVariant: GameVariant = {
      game_id: toGame,
      asset_type: this.determineAssetType(asset.core_essence, toGame),
      properties: transformedProperties,
      display: await this.generateDisplayData(asset.core_essence, toGame),
      mechanics: await this.generateMechanics(asset.core_essence, toGame),
      compatibility: this.generateCompatibilityInfo(toGame),
      status: { active: true, deprecated: false }
    };
    
    // 8. Update blockchain record
    const updateResult = await this.updateAssetOnBlockchain(
      universalId,
      convertedVariant,
      compatibility.conversion
    );
    
    return {
      success: true,
      conversion_id: updateResult.transaction_id,
      original_variant: sourceVariant,
      new_variant: convertedVariant,
      conversion_cost: compatibility.conversion.conversion_cost,
      properties_changed: this.getPropertiesChanged(sourceVariant, convertedVariant),
      rollback_deadline: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
  }
  
  private async performEssenceConversion(
    essence: CoreEssence,
    targetGame: string,
    propertyMapping: Record<string, any>
  ): Promise<GameVariant> {
    
    // Use essence-based rules to generate game-specific properties
    const gameRules = await this.getGameRules(targetGame);
    const interpreter = new EssenceInterpreter(gameRules);
    
    return interpreter.interpretEssence(essence);
  }
}
```

## Cross-Game Asset Examples

### Example 1: Fire Dragon Across Three Games

```typescript
const fireDragonCrossGame = {
  universal_id: "fire_dragon_001",
  
  // Core essence that defines the asset
  core_essence: {
    element: "fire",
    creature_type: "dragon",
    power_level: 95,
    temperament: "aggressive",
    size: "large",
    intelligence: "high",
    rarity_class: "legendary"
  },
  
  // Game-specific manifestations
  variants: {
    "splinterlands": {
      // Card Game Manifestation
      manifestation_type: "battle_card",
      display_name: "Ancient Fire Dragon",
      properties: {
        mana_cost: 7,      // Derived from size (large = high mana)
        attack: 8,         // Derived from power_level (95 → 8)
        health: 6,         // Balanced for card game
        armor: 2,          // Dragon natural armor
        speed: 4,          // Large creatures are slower
        abilities: ["Flying", "Blast", "Scorch"]
      },
      game_mechanics: {
        usable_in: ["ranked_battles", "tournaments", "brawls"],
        element_bonuses: { fire: 1.5, water: 0.5 },
        evolution_available: false
      }
    },
    
    "cryptobrewmaster": {
      // Brewing Game Manifestation
      manifestation_type: "rare_ingredient",
      display_name: "Dragon Fire Essence",
      properties: {
        brewing_power: 95,     // Direct from power_level
        flavor_intensity: 9.5, // High intensity from temperament
        alcohol_boost: 0.8,    // Fire element = alcohol boost
        volatility: "extreme", // Aggressive temperament
        ingredient_class: "mythical"
      },
      game_mechanics: {
        usable_in: ["premium_brewing", "competition_recipes"],
        brewing_effects: ["heat_infusion", "flavor_explosion"],
        max_per_recipe: 1,     // Too powerful for multiple use
        requires_master_brewer: true
      }
    },
    
    "steemmonsters": {
      // RPG Game Manifestation
      manifestation_type: "companion_creature",
      display_name: "Primordial Fire Dragon",
      properties: {
        combat_rating: 95,     // Direct from power_level
        health_points: 850,    // Large size = high HP
        magic_power: 320,      // High intelligence = good magic
        physical_attack: 180,  // Aggressive temperament
        defense: 120,          // Natural dragon defense
        speed: 60,             // Large size = lower speed
        level: 1,              // Always starts at level 1
        experience: 0
      },
      game_mechanics: {
        usable_in: ["dungeons", "pvp_battles", "raids"],
        special_abilities: [
          "Dragon_Breath",     // Fire element
          "Wing_Buffet",       // Flying capability
          "Intimidate",        // Aggressive temperament
          "Fire_Immunity"      // Fire element immunity
        ],
        evolution_paths: [
          { name: "Elder Fire Dragon", level_required: 50 },
          { name: "Fire Dragon Lord", level_required: 100 }
        ]
      }
    }
  },
  
  // Conversion possibilities
  conversion_matrix: {
    "splinterlands_to_cryptobrewmaster": {
      compatible: true,
      success_rate: 0.95,
      conversion_cost: { amount: "5.000", currency: "STEEM" },
      property_mapping: {
        "attack": { target: "brewing_power", formula: "attack * 11.875" },
        "mana_cost": { target: "rarity_modifier", formula: "mana_cost * 0.5" }
      },
      properties_lost: ["armor", "speed", "abilities"],
      properties_gained: ["brewing_power", "flavor_intensity", "volatility"]
    },
    
    "cryptobrewmaster_to_steemmonsters": {
      compatible: true,
      success_rate: 0.90,
      conversion_cost: { amount: "8.000", currency: "STEEM" },
      property_mapping: {
        "brewing_power": { target: "combat_rating", formula: "brewing_power" },
        "flavor_intensity": { target: "magic_power", formula: "flavor_intensity * 30" }
      },
      properties_lost: ["brewing_power", "volatility", "ingredient_class"],
      properties_gained: ["health_points", "experience", "level"]
    }
  }
};
```

### Example 2: Lightning Staff Across Games

```typescript
const lightningStaffCrossGame = {
  universal_id: "lightning_staff_001",
  
  core_essence: {
    element: "lightning",
    item_type: "staff",
    power_level: 78,
    craftsmanship: "masterwork",
    enchantment_level: "high",
    size: "medium"
  },
  
  variants: {
    "splinterlands": {
      // Equipment Card
      manifestation_type: "equipment_card",
      display_name: "Staff of Lightning",
      properties: {
        mana_cost: 4,
        equipment_bonus: { magic_attack: 3, speed: 1 },
        durability: 5,
        rarity: "rare"
      }
    },
    
    "steemmonsters": {
      // Weapon Item
      manifestation_type: "weapon",
      display_name: "Thunderbolt Staff",
      properties: {
        weapon_damage: 78,
        magic_bonus: 45,
        critical_chance: 15,
        elemental_damage: "lightning",
        durability: 100,
        level_requirement: 35
      }
    },
    
    "mage_academy": {
      // Spell Focus
      manifestation_type: "spell_focus",
      display_name: "Arcane Lightning Rod",
      properties: {
        spell_power: 78,
        mana_efficiency: 0.85,
        lightning_mastery: 25,
        channeling_speed: 1.3,
        focus_stability: "high"
      }
    }
  }
};
```

## Advanced Cross-Game Features

### 1. Asset Fusion System

Assets from different games can be combined to create new, more powerful assets:

```typescript
interface AssetFusion {
  fusion_id: string;
  source_assets: {
    universal_id: string;
    game_context: string;
    contribution_weight: number;
  }[];
  
  fusion_rules: {
    compatible_elements: string[];
    required_power_threshold: number;
    success_rate: number;
    fusion_cost: { amount: string; currency: string };
  };
  
  result_prediction: {
    estimated_power_level: number;
    possible_outcomes: {
      universal_id: string;
      probability: number;
      essence_combination: CoreEssence;
    }[];
  };
}

// Example: Fusing Fire Dragon + Lightning Staff
const fusionExample = {
  fusion_id: "fusion_fire_lightning_001",
  source_assets: [
    {
      universal_id: "fire_dragon_001",
      game_context: "splinterlands",
      contribution_weight: 0.7
    },
    {
      universal_id: "lightning_staff_001", 
      game_context: "steemmonsters",
      contribution_weight: 0.3
    }
  ],
  result_prediction: {
    estimated_power_level: 120,
    possible_outcomes: [
      {
        universal_id: "storm_dragon_001",
        probability: 0.6,
        essence_combination: {
          element: "storm",          // Fire + Lightning = Storm
          creature_type: "dragon",   // Dominant from Fire Dragon
          power_level: 118,          // 95 + 78 * 0.3 = 118.4
          temperament: "volatile",   // Fire + Lightning = Volatile
          abilities: ["lightning_breath", "storm_call"]
        }
      }
    ]
  }
};
```

### 2. Cross-Game Tournaments

Assets can participate in tournaments that span multiple games:

```typescript
interface CrossGameTournament {
  tournament_id: string;
  name: string;
  participating_games: string[];
  
  tournament_structure: {
    phases: {
      phase_name: string;
      game_id: string;
      asset_requirements: {
        min_power_level: number;
        allowed_types: string[];
        max_participants: number;
      };
    }[];
  };
  
  scoring_system: {
    [game_id: string]: {
      victory_points: number;
      bonus_conditions: Record<string, number>;
    };
  };
  
  prizes: {
    ranks: {
      rank: number;
      rewards: {
        steem_prize: { amount: string; currency: string };
        exclusive_assets?: string[];
        title?: string;
      };
    }[];
  };
}
```

### 3. Asset Evolution Chains

Assets can evolve differently based on their game context:

```typescript
interface EvolutionChain {
  base_asset: string;
  evolution_paths: {
    [game_id: string]: {
      evolution_stages: {
        stage: number;
        requirements: {
          usage_count?: number;
          time_owned?: number;
          specific_actions?: string[];
          resource_cost?: { amount: string; currency: string };
        };
        result: {
          essence_changes: Partial<CoreEssence>;
          new_abilities?: string[];
          stat_multipliers?: Record<string, number>;
        };
      }[];
    };
  };
}

// Example: Fire Dragon evolution paths
const fireDragonEvolution = {
  base_asset: "fire_dragon_001",
  evolution_paths: {
    "splinterlands": [
      {
        stage: 1,
        requirements: { usage_count: 100, resource_cost: { amount: "10.000", currency: "STEEM" } },
        result: {
          essence_changes: { power_level: 105 },
          new_abilities: ["Amplify"],
          stat_multipliers: { attack: 1.2 }
        }
      }
    ],
    "steemmonsters": [
      {
        stage: 1,
        requirements: { time_owned: 30 * 24 * 60 * 60, specific_actions: ["defeat_ice_boss"] },
        result: {
          essence_changes: { power_level: 110, temperament: "ancient_wisdom" },
          new_abilities: ["Elder_Flame", "Wisdom_Aura"]
        }
      }
    ]
  }
};
```

## Technical Implementation

### 1. Blockchain Storage Strategy

Cross-game assets use a layered storage approach:

```json
{
  "id": "cross_game_asset",
  "json": {
    "operation": "asset_update",
    "universal_id": "fire_dragon_001",
    "update_type": "variant_added",
    "data": {
      "universal_identity": {
        "universal_id": "fire_dragon_001",
        "base_name": "Fire Dragon",
        "core_essence": { "element": "fire", "power_level": 95 }
      },
      "new_variant": {
        "game_id": "new_game_id",
        "manifestation_data": { "..." }
      },
      "cross_game_links": {
        "compatible_games": ["splinterlands", "steemmonsters"],
        "conversion_history": [
          {
            "from": "splinterlands",
            "to": "steemmonsters", 
            "timestamp": "2024-01-15T10:00:00Z",
            "success": true
          }
        ]
      }
    }
  }
}
```

### 2. Synchronization System

```typescript
class CrossGameSyncManager {
  async syncAssetAcrossGames(universalId: string): Promise<SyncResult> {
    const asset = await this.getUniversalAsset(universalId);
    const syncTasks: Promise<GameSyncResult>[] = [];
    
    // Sync to all games where asset has variants
    for (const gameId of Object.keys(asset.variants)) {
      syncTasks.push(this.syncToGame(asset, gameId));
    }
    
    const results = await Promise.allSettled(syncTasks);
    
    return {
      universal_id: universalId,
      sync_timestamp: new Date().toISOString(),
      game_results: results.map((result, index) => ({
        game_id: Object.keys(asset.variants)[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
      }))
    };
  }
  
  private async syncToGame(asset: UniversalAsset, gameId: string): Promise<GameSyncResult> {
    const gameAPI = this.getGameAPI(gameId);
    const variant = asset.variants[gameId];
    
    // Update game-specific data
    return await gameAPI.updateAsset(asset.universal_id, variant);
  }
}
```

## Performance Considerations

### 1. Caching Strategy

```typescript
interface CrossGameCache {
  // Universal asset cache
  universalAssets: Map<string, UniversalAsset>;
  
  // Game-specific caches
  gameVariants: Map<string, Map<string, GameVariant>>;
  
  // Compatibility matrix cache
  compatibilityMatrix: Map<string, Map<string, CompatibilityRule>>;
  
  // Conversion history cache
  conversionHistory: Map<string, ConversionRecord[]>;
}
```

### 2. Lazy Loading

```typescript
class AssetLoader {
  async loadAssetVariant(universalId: string, gameId: string): Promise<GameVariant> {
    // Only load variant when needed
    const cacheKey = `${universalId}:${gameId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const variant = await this.fetchVariantFromBlockchain(universalId, gameId);
    this.cache.set(cacheKey, variant);
    
    return variant;
  }
}
```

## Security Considerations

### 1. Cross-Game Authorization

```typescript
interface CrossGameAuthorization {
  validateCrossGameOperation(
    universalId: string,
    sourceGame: string,
    targetGame: string,
    user: string
  ): Promise<AuthorizationResult>;
  
  checkConversionPermissions(
    asset: UniversalAsset,
    conversion: ConversionRequest
  ): Promise<boolean>;
}
```

### 2. Asset Integrity Verification

```typescript
class AssetIntegrityVerifier {
  async verifyAssetConsistency(universalId: string): Promise<IntegrityReport> {
    const asset = await this.getUniversalAsset(universalId);
    const issues: IntegrityIssue[] = [];
    
    // Check essence consistency across variants
    for (const [gameId, variant] of Object.entries(asset.variants)) {
      const essenceMapping = await this.getEssenceMapping(gameId);
      const expectedProperties = essenceMapping.calculateProperties(asset.core_essence);
      
      if (!this.propertiesMatch(expectedProperties, variant.properties)) {
        issues.push({
          type: 'essence_mismatch',
          game_id: gameId,
          expected: expectedProperties,
          actual: variant.properties
        });
      }
    }
    
    return {
      universal_id: universalId,
      is_consistent: issues.length === 0,
      issues: issues,
      verification_timestamp: new Date().toISOString()
    };
  }
}
```

This architecture enables true cross-game asset interoperability while maintaining game-specific identity and mechanics, creating a unified Web3 asset ecosystem on the STEEM blockchain.