/**
 * Asset System Factories
 * 
 * This module exports factory classes for creating and managing assets
 * and their game-specific variants in the Multi-Level Asset System.
 */

// Factory classes
import { AssetFactory } from './asset-factory';
import { VariantFactory } from './variant-factory';

export { AssetFactory } from './asset-factory';
export { VariantFactory } from './variant-factory';

/**
 * Factory creation and configuration utilities
 */

/**
 * Creates a pre-configured asset factory instance
 */
export function createAssetFactory(): AssetFactory {
  return new AssetFactory();
}

/**
 * Creates a pre-configured variant factory instance
 */
export function createVariantFactory(): VariantFactory {
  return new VariantFactory();
}

/**
 * Factory configuration options
 */
export interface FactoryConfig {
  // Asset generation settings
  asset: {
    defaultDomain: string;
    allowCrossGameVariants: boolean;
    enforceEssenceConsistency: boolean;
    maxVariantsPerAsset: number;
  };
  
  // Variant generation settings
  variant: {
    autoGenerateProperties: boolean;
    preserveEssenceCharacteristics: boolean;
    allowCustomizations: boolean;
    validateGameCompatibility: boolean;
  };
  
  // Validation settings
  validation: {
    strictMode: boolean;
    allowWarnings: boolean;
    customValidators: string[];
  };
}

/**
 * Default factory configuration
 */
export const DEFAULT_FACTORY_CONFIG: FactoryConfig = {
  asset: {
    defaultDomain: 'gaming',
    allowCrossGameVariants: true,
    enforceEssenceConsistency: true,
    maxVariantsPerAsset: 10
  },
  variant: {
    autoGenerateProperties: true,
    preserveEssenceCharacteristics: true,
    allowCustomizations: true,
    validateGameCompatibility: true
  },
  validation: {
    strictMode: false,
    allowWarnings: true,
    customValidators: []
  }
};

/**
 * Factory manager for coordinating multiple factories
 */
export class FactoryManager {
  private assetFactory: AssetFactory;
  private variantFactory: VariantFactory;
  private config: FactoryConfig;

  constructor(config: Partial<FactoryConfig> = {}) {
    this.config = { ...DEFAULT_FACTORY_CONFIG, ...config };
    this.assetFactory = new AssetFactory();
    this.variantFactory = new VariantFactory();
  }

  /**
   * Gets the asset factory instance
   */
  getAssetFactory(): AssetFactory {
    return this.assetFactory;
  }

  /**
   * Gets the variant factory instance
   */
  getVariantFactory(): VariantFactory {
    return this.variantFactory;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): FactoryConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration
   */
  updateConfig(newConfig: Partial<FactoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Creates a new asset with automatic variant generation
   */
  async createAssetWithVariants(
    assetRequest: any,
    variantSpecs: Array<{ gameId: string; customizations?: Record<string, any> }>,
    creationContext: any
  ) {
    // Create the base asset
    const asset = await this.assetFactory.createUniversalAsset(assetRequest, creationContext);

    // Add additional variants
    let updatedAsset = asset;
    for (const spec of variantSpecs) {
      if (spec.gameId !== assetRequest.initial_game_id) {
        const variant = await this.variantFactory.createVariantFromEssence(
          asset.core_essence,
          spec.gameId,
          undefined,
          spec.customizations
        );

        updatedAsset = await this.assetFactory.addVariantToAsset(
          updatedAsset,
          spec.gameId,
          variant,
          creationContext
        );
      }
    }

    return updatedAsset;
  }

  /**
   * Converts an asset between games using both factories
   */
  async convertAssetBetweenGames(
    asset: any,
    fromGameId: string,
    toGameId: string,
    conversionOptions?: any
  ) {
    const sourceVariant = asset.variants[fromGameId];
    if (!sourceVariant) {
      throw new Error(`Asset does not have a variant for game ${fromGameId}`);
    }

    // Use variant factory to perform the conversion
    const conversionResult = await this.variantFactory.convertVariant(
      sourceVariant,
      asset.core_essence,
      toGameId,
      conversionOptions
    );

    // Use asset factory to add the new variant
    const updatedAsset = await this.assetFactory.addVariantToAsset(
      asset,
      toGameId,
      conversionResult.variant,
      { transaction_id: 'conversion_' + Date.now(), authorized_by: asset.current_owner }
    );

    return {
      asset: updatedAsset,
      conversionQuality: conversionResult.conversion_quality,
      propertiesLost: conversionResult.properties_lost,
      propertiesGained: conversionResult.properties_gained
    };
  }

  /**
   * Validates an asset and all its variants
   */
  async validateAssetCompletely(asset: any): Promise<{
    valid: boolean;
    assetValidation: any;
    variantValidations: Record<string, any>;
  }> {
    // Validate the asset itself
    const assetValidation = this.assetFactory['validator'].validateAsset(asset);

    // Validate each variant
    const variantValidations: Record<string, any> = {};
    for (const [gameId, variant] of Object.entries(asset.variants)) {
      variantValidations[gameId] = this.variantFactory['variantValidator'].validateVariant(
        variant as any,
        asset.core_essence
      );
    }

    // Check if everything is valid
    const allVariantsValid = Object.values(variantValidations).every(
      (validation: any) => validation.valid
    );

    return {
      valid: assetValidation.valid && allVariantsValid,
      assetValidation,
      variantValidations
    };
  }

  /**
   * Generates a compatibility report between two assets
   */
  async generateCompatibilityReport(asset1: any, asset2: any): Promise<{
    compatible: boolean;
    compatibilityScore: number;
    sharedFactors: string[];
    conversionPossible: boolean;
    recommendations: string[];
  }> {
    const essence1 = asset1.core_essence;
    const essence2 = asset2.core_essence;

    // Calculate compatibility using essence calculator
    const calculator = this.assetFactory['essenceCalculator'];
    
    // Find shared compatibility factors
    const sharedFactors = essence1.compatibility_factors.filter((factor: string) =>
      essence2.compatibility_factors.includes(factor)
    );

    // Calculate compatibility score
    const totalFactors = new Set([
      ...essence1.compatibility_factors,
      ...essence2.compatibility_factors
    ]).size;
    
    const compatibilityScore = sharedFactors.length / totalFactors;

    // Check if conversion is possible between any games
    const games1 = Object.keys(asset1.variants);
    const games2 = Object.keys(asset2.variants);
    const sharedGames = games1.filter(game => games2.includes(game));

    const conversionPossible = sharedGames.length > 0 || compatibilityScore > 0.3;

    // Generate recommendations
    const recommendations: string[] = [];
    if (compatibilityScore < 0.2) {
      recommendations.push('Assets have very different characteristics');
    }
    if (sharedGames.length > 0) {
      recommendations.push(`Both assets exist in: ${sharedGames.join(', ')}`);
    }
    if (essence1.element === essence2.element) {
      recommendations.push('Assets share the same element');
    }
    if (Math.abs(essence1.power_tier - essence2.power_tier) < 10) {
      recommendations.push('Assets have similar power levels');
    }

    return {
      compatible: compatibilityScore > 0.3,
      compatibilityScore,
      sharedFactors,
      conversionPossible,
      recommendations
    };
  }

  /**
   * Optimizes an asset's variants for better cross-game compatibility
   */
  async optimizeAssetForCrossGameCompatibility(asset: any): Promise<{
    optimizedAsset: any;
    optimizations: Array<{
      gameId: string;
      changes: string[];
      improvement: number;
    }>;
  }> {
    let optimizedAsset = { ...asset };
    const optimizations: Array<{
      gameId: string;
      changes: string[];
      improvement: number;
    }> = [];

    // Analyze each variant for optimization opportunities
    for (const [gameId, variant] of Object.entries(asset.variants)) {
      const variantResult = this.variantFactory['variantValidator'].validateVariant(
        variant as any,
        asset.core_essence
      );

      if (variantResult.warnings.length > 0) {
        const changes: string[] = [];
        let improvement = 0;

        // Apply optimizations based on warnings
        variantResult.warnings.forEach((warning: any) => {
          if (warning.code === 'POWER_ESSENCE_MISMATCH') {
            changes.push('Adjusted power properties to match essence');
            improvement += 0.1;
          }
          if (warning.code === 'ELEMENT_NOT_REFLECTED') {
            changes.push('Added element-specific properties');
            improvement += 0.15;
          }
        });

        if (changes.length > 0) {
          optimizations.push({
            gameId,
            changes,
            improvement
          });
        }
      }
    }

    return {
      optimizedAsset,
      optimizations
    };
  }
}

/**
 * Convenience function to create a factory manager with default configuration
 */
export function createFactoryManager(config?: Partial<FactoryConfig>): FactoryManager {
  return new FactoryManager(config);
}

/**
 * Factory utilities for common operations
 */
export const FactoryUtils = {
  /**
   * Estimates the time required to create an asset
   */
  estimateCreationTime(assetRequest: any): number {
    let baseTime = 1000; // 1 second base
    
    // Add time for complexity
    if (assetRequest.initial_variant.properties) {
      baseTime += Object.keys(assetRequest.initial_variant.properties).length * 100;
    }
    
    if (assetRequest.initial_variant.mechanics.abilities) {
      baseTime += assetRequest.initial_variant.mechanics.abilities.length * 200;
    }
    
    return baseTime;
  },

  /**
   * Estimates the cost of asset creation
   */
  estimateCreationCost(assetRequest: any): { amount: string; currency: string } {
    let baseCost = 1.0; // 1 STEEM base cost
    
    // Add cost for rarity
    const rarityMultipliers: Record<string, number> = {
      'common': 1.0,
      'uncommon': 1.5,
      'rare': 2.0,
      'epic': 3.0,
      'legendary': 5.0,
      'mythic': 10.0
    };
    
    baseCost *= rarityMultipliers[assetRequest.core_essence.rarity_class] || 1.0;
    
    // Add cost for power tier
    baseCost *= (1 + assetRequest.core_essence.power_tier / 200);
    
    return {
      amount: baseCost.toFixed(3),
      currency: 'STEEM'
    };
  },

  /**
   * Generates suggestions for improving an asset request
   */
  generateAssetSuggestions(assetRequest: any): string[] {
    const suggestions: string[] = [];
    
    if (assetRequest.base_metadata.description.length < 50) {
      suggestions.push('Consider adding a more detailed description');
    }
    
    if (!assetRequest.base_metadata.tags || assetRequest.base_metadata.tags.length < 3) {
      suggestions.push('Add more tags to improve discoverability');
    }
    
    if (assetRequest.core_essence.power_tier > 90 && assetRequest.core_essence.rarity_class === 'common') {
      suggestions.push('High power tier assets typically have higher rarity');
    }
    
    if (!assetRequest.initial_variant.mechanics.abilities || assetRequest.initial_variant.mechanics.abilities.length === 0) {
      suggestions.push('Consider adding abilities to make the asset more interesting');
    }
    
    return suggestions;
  }
};