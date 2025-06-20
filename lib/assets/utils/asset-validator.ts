/**
 * Asset Validator - Validates asset data and business rules
 * 
 * Provides comprehensive validation for assets including business logic,
 * data consistency, and integrity checks.
 */

import { 
  UniversalAsset, 
  AssetCreationRequest, 
  GameVariant, 
  CoreEssence 
} from '../types';
import { 
  validateUniversalAsset,
  validateAssetCreationRequest,
  validateGameVariant,
  validateCoreEssence
} from '../schemas';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  recommendation?: string;
}

export class AssetValidator {
  
  /**
   * Validates a complete Universal Asset
   */
  validateAsset(asset: UniversalAsset): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Schema validation
    const schemaResult = validateUniversalAsset(asset);
    if (!schemaResult.success) {
      errors.push({
        field: 'schema',
        code: 'SCHEMA_VALIDATION_FAILED',
        message: `Schema validation failed: ${JSON.stringify(schemaResult.error)}`,
        severity: 'critical'
      });
    }
    
    // Business logic validation
    this.validateAssetBusinessLogic(asset, errors, warnings);
    
    // Data consistency validation
    this.validateAssetConsistency(asset, errors, warnings);
    
    // Cross-variant validation
    this.validateCrossVariantConsistency(asset, errors, warnings);
    
    return {
      valid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates an Asset Creation Request
   */
  validateCreationRequest(request: AssetCreationRequest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Schema validation
    const schemaResult = validateAssetCreationRequest(request);
    if (!schemaResult.success) {
      errors.push({
        field: 'schema',
        code: 'SCHEMA_VALIDATION_FAILED',
        message: `Schema validation failed: ${JSON.stringify(schemaResult.error)}`,
        severity: 'critical'
      });
    }
    
    // Business logic validation
    this.validateCreationBusinessLogic(request, errors, warnings);
    
    // Content validation
    this.validateCreationContent(request, errors, warnings);
    
    return {
      valid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates a Game Variant
   */
  validateVariant(variant: GameVariant, essence?: CoreEssence): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Schema validation
    const schemaResult = validateGameVariant(variant);
    if (!schemaResult.success) {
      errors.push({
        field: 'schema',
        code: 'SCHEMA_VALIDATION_FAILED',
        message: `Schema validation failed: ${JSON.stringify(schemaResult.error)}`,
        severity: 'critical'
      });
    }
    
    // Business logic validation
    this.validateVariantBusinessLogic(variant, errors, warnings);
    
    // Essence consistency validation (if essence provided)
    if (essence) {
      this.validateVariantEssenceConsistency(variant, essence, errors, warnings);
    }
    
    return {
      valid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates Core Essence
   */
  validateEssence(essence: CoreEssence): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Schema validation
    const schemaResult = validateCoreEssence(essence);
    if (!schemaResult.success) {
      errors.push({
        field: 'schema',
        code: 'SCHEMA_VALIDATION_FAILED',
        message: `Schema validation failed: ${JSON.stringify(schemaResult.error)}`,
        severity: 'critical'
      });
    }
    
    // Essence consistency validation
    this.validateEssenceConsistency(essence, errors, warnings);
    
    return {
      valid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates asset business logic
   */
  private validateAssetBusinessLogic(
    asset: UniversalAsset, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Supply logic validation
    if (asset.properties.supply.circulating > asset.properties.supply.total) {
      errors.push({
        field: 'properties.supply.circulating',
        code: 'INVALID_CIRCULATING_SUPPLY',
        message: 'Circulating supply cannot exceed total supply',
        severity: 'critical'
      });
    }
    
    if (asset.properties.supply.burned > asset.properties.supply.total) {
      errors.push({
        field: 'properties.supply.burned',
        code: 'INVALID_BURNED_SUPPLY',
        message: 'Burned supply cannot exceed total supply',
        severity: 'critical'
      });
    }
    
    if (asset.properties.supply.circulating + asset.properties.supply.burned > asset.properties.supply.total) {
      errors.push({
        field: 'properties.supply',
        code: 'INVALID_SUPPLY_TOTAL',
        message: 'Circulating + burned supply cannot exceed total supply',
        severity: 'critical'
      });
    }
    
    // Mintable logic validation
    if (!asset.properties.mintable && asset.properties.supply.total === 0) {
      errors.push({
        field: 'properties.mintable',
        code: 'NON_MINTABLE_ZERO_SUPPLY',
        message: 'Non-mintable assets must have a total supply greater than 0',
        severity: 'critical'
      });
    }
    
    // Royalty validation
    if (asset.economic_data?.royalty_percentage && asset.economic_data.royalty_percentage > 0) {
      if (!asset.economic_data.royalty_recipient) {
        errors.push({
          field: 'economic_data.royalty_recipient',
          code: 'MISSING_ROYALTY_RECIPIENT',
          message: 'Royalty recipient is required when royalty percentage is set',
          severity: 'error'
        });
      }
    }
    
    // Transfer history validation
    if (asset.transfer_history.length === 0) {
      warnings.push({
        field: 'transfer_history',
        code: 'NO_TRANSFER_HISTORY',
        message: 'Asset has no transfer history',
        recommendation: 'Assets should have at least a mint transaction'
      });
    }
    
    // Variant validation
    if (Object.keys(asset.variants).length === 0) {
      errors.push({
        field: 'variants',
        code: 'NO_VARIANTS',
        message: 'Asset must have at least one game variant',
        severity: 'critical'
      });
    }
    
    // Ownership validation
    if (!asset.current_owner) {
      errors.push({
        field: 'current_owner',
        code: 'NO_OWNER',
        message: 'Asset must have a current owner',
        severity: 'critical'
      });
    }
  }

  /**
   * Validates asset data consistency
   */
  private validateAssetConsistency(
    asset: UniversalAsset, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Creator vs owner validation
    const mintTransaction = asset.transfer_history.find(tx => tx.operation_type === 'mint');
    if (mintTransaction && mintTransaction.to_user !== asset.current_owner) {
      // Check if there are subsequent transfers
      const transfers = asset.transfer_history.filter(tx => tx.operation_type === 'transfer');
      if (transfers.length === 0) {
        warnings.push({
          field: 'current_owner',
          code: 'OWNER_MISMATCH',
          message: 'Current owner does not match mint recipient with no transfer history',
          recommendation: 'Verify ownership history is complete'
        });
      }
    }
    
    // Rarity vs power tier consistency
    if (asset.core_essence.power_tier >= 85 && !['legendary', 'mythic'].includes(asset.core_essence.rarity_class)) {
      warnings.push({
        field: 'core_essence.rarity_class',
        code: 'POWER_RARITY_MISMATCH',
        message: 'High power tier assets typically have legendary or mythic rarity',
        recommendation: 'Consider adjusting rarity class to match power tier'
      });
    }
    
    // Tags vs properties consistency
    const elementTag = asset.base_metadata.tags.find(tag => tag.includes('element_'));
    if (elementTag && asset.core_essence.element) {
      const tagElement = elementTag.replace('element_', '');
      if (tagElement !== asset.core_essence.element) {
        warnings.push({
          field: 'base_metadata.tags',
          code: 'TAG_ELEMENT_MISMATCH',
          message: 'Element tag does not match core essence element',
          recommendation: 'Ensure tags are consistent with core essence'
        });
      }
    }
  }

  /**
   * Validates cross-variant consistency
   */
  private validateCrossVariantConsistency(
    asset: UniversalAsset, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    const variants = Object.values(asset.variants);
    
    // Check for conflicting asset types
    const assetTypes = new Set(variants.map(v => v.asset_type));
    if (assetTypes.size > 3) {
      warnings.push({
        field: 'variants',
        code: 'TOO_MANY_ASSET_TYPES',
        message: `Asset has ${assetTypes.size} different asset types across variants`,
        recommendation: 'Consider if this many different manifestations are consistent'
      });
    }
    
    // Check for deprecated variants
    const deprecatedVariants = variants.filter(v => v.status.deprecated);
    if (deprecatedVariants.length > 0 && deprecatedVariants.length === variants.length) {
      errors.push({
        field: 'variants',
        code: 'ALL_VARIANTS_DEPRECATED',
        message: 'All asset variants are deprecated',
        severity: 'error'
      });
    }
    
    // Check variant compatibility versions
    variants.forEach((variant, index) => {
      if (!variant.compatibility.min_game_version) {
        warnings.push({
          field: `variants.${variant.game_id}.compatibility.min_game_version`,
          code: 'MISSING_MIN_VERSION',
          message: `Variant ${variant.game_id} has no minimum game version specified`,
          recommendation: 'Specify minimum game version for compatibility tracking'
        });
      }
    });
  }

  /**
   * Validates creation request business logic
   */
  private validateCreationBusinessLogic(
    request: AssetCreationRequest, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Supply validation
    if (request.creation_options.total_supply === 0 && !request.creation_options.mintable) {
      errors.push({
        field: 'creation_options.total_supply',
        code: 'INVALID_SUPPLY_CONFIG',
        message: 'Non-mintable assets must have a total supply greater than 0',
        severity: 'critical'
      });
    }
    
    // Royalty validation
    if (request.creation_options.royalty_percentage && request.creation_options.royalty_percentage > 0) {
      if (!request.creation_options.royalty_recipient) {
        errors.push({
          field: 'creation_options.royalty_recipient',
          code: 'MISSING_ROYALTY_RECIPIENT',
          message: 'Royalty recipient is required when royalty percentage is set',
          severity: 'error'
        });
      }
      
      if (request.creation_options.royalty_percentage > 25) {
        warnings.push({
          field: 'creation_options.royalty_percentage',
          code: 'HIGH_ROYALTY_PERCENTAGE',
          message: 'Royalty percentage is unusually high (>25%)',
          recommendation: 'Consider if this royalty rate is appropriate'
        });
      }
    }
    
    // Game and domain consistency
    if (request.domain === 'gaming' && ['song', 'album', 'track'].includes(request.asset_type)) {
      warnings.push({
        field: 'asset_type',
        code: 'DOMAIN_TYPE_MISMATCH',
        message: 'Music asset types in gaming domain may be inconsistent',
        recommendation: 'Consider using music domain for audio assets'
      });
    }
  }

  /**
   * Validates creation request content
   */
  private validateCreationContent(
    request: AssetCreationRequest, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Name validation
    if (request.base_metadata.name.length < 3) {
      warnings.push({
        field: 'base_metadata.name',
        code: 'SHORT_NAME',
        message: 'Asset name is very short',
        recommendation: 'Consider a more descriptive name'
      });
    }
    
    // Description validation
    if (request.base_metadata.description.length < 20) {
      warnings.push({
        field: 'base_metadata.description',
        code: 'SHORT_DESCRIPTION',
        message: 'Asset description is very short',
        recommendation: 'Provide more detailed description for better discoverability'
      });
    }
    
    // Tags validation
    if (!request.base_metadata.tags || request.base_metadata.tags.length === 0) {
      warnings.push({
        field: 'base_metadata.tags',
        code: 'NO_TAGS',
        message: 'Asset has no tags',
        recommendation: 'Add relevant tags to improve discoverability'
      });
    }
    
    // Image URL validation
    if (!request.base_metadata.image_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      warnings.push({
        field: 'base_metadata.image_url',
        code: 'UNUSUAL_IMAGE_FORMAT',
        message: 'Image URL does not end with common image extension',
        recommendation: 'Ensure image URL points to a valid image file'
      });
    }
  }

  /**
   * Validates variant business logic
   */
  private validateVariantBusinessLogic(
    variant: GameVariant, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Status validation
    if (variant.status.deprecated && variant.status.active) {
      errors.push({
        field: 'status',
        code: 'DEPRECATED_ACTIVE_CONFLICT',
        message: 'Variant cannot be both deprecated and active',
        severity: 'error'
      });
    }
    
    if (variant.status.deprecated && !variant.status.migration_target) {
      warnings.push({
        field: 'status.migration_target',
        code: 'DEPRECATED_NO_MIGRATION',
        message: 'Deprecated variant has no migration target specified',
        recommendation: 'Specify migration target for deprecated variants'
      });
    }
    
    // Mechanics validation
    if (variant.mechanics.abilities && variant.mechanics.abilities.length > 10) {
      warnings.push({
        field: 'mechanics.abilities',
        code: 'TOO_MANY_ABILITIES',
        message: 'Variant has many abilities which may be overwhelming',
        recommendation: 'Consider grouping related abilities'
      });
    }
    
    // Properties validation
    const numericProperties = Object.entries(variant.properties).filter(([_, value]) => typeof value === 'number');
    if (numericProperties.length === 0) {
      warnings.push({
        field: 'properties',
        code: 'NO_NUMERIC_PROPERTIES',
        message: 'Variant has no numeric properties',
        recommendation: 'Consider adding measurable properties for game balance'
      });
    }
  }

  /**
   * Validates variant consistency with essence
   */
  private validateVariantEssenceConsistency(
    variant: GameVariant, 
    essence: CoreEssence, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Power tier consistency
    const powerProperty = variant.properties.power || variant.properties.attack || variant.properties.strength;
    if (typeof powerProperty === 'number') {
      const expectedRange = {
        min: essence.power_tier * 0.8,
        max: essence.power_tier * 1.2
      };
      
      if (powerProperty < expectedRange.min || powerProperty > expectedRange.max) {
        warnings.push({
          field: 'properties.power',
          code: 'POWER_ESSENCE_MISMATCH',
          message: `Variant power (${powerProperty}) does not align with essence power tier (${essence.power_tier})`,
          recommendation: 'Ensure variant properties reflect core essence'
        });
      }
    }
    
    // Element consistency
    if (essence.element) {
      const hasElementProperty = Object.keys(variant.properties).some(key => 
        key.toLowerCase().includes(essence.element!.toLowerCase())
      );
      const hasElementAbility = variant.mechanics.abilities?.some(ability => 
        ability.toLowerCase().includes(essence.element!.toLowerCase())
      );
      
      if (!hasElementProperty && !hasElementAbility) {
        warnings.push({
          field: 'properties',
          code: 'ELEMENT_NOT_REFLECTED',
          message: `Variant does not reflect ${essence.element} element in properties or abilities`,
          recommendation: 'Add element-specific properties or abilities'
        });
      }
    }
  }

  /**
   * Validates essence consistency
   */
  private validateEssenceConsistency(
    essence: CoreEssence, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Power tier vs rarity consistency
    if (essence.power_tier >= 90 && !['legendary', 'mythic'].includes(essence.rarity_class)) {
      warnings.push({
        field: 'rarity_class',
        code: 'HIGH_POWER_LOW_RARITY',
        message: 'Very high power tier with lower rarity class',
        recommendation: 'Consider legendary or mythic rarity for high power assets'
      });
    }
    
    if (essence.power_tier <= 20 && ['legendary', 'mythic'].includes(essence.rarity_class)) {
      warnings.push({
        field: 'power_tier',
        code: 'LOW_POWER_HIGH_RARITY',
        message: 'Very low power tier with high rarity class',
        recommendation: 'Consider increasing power tier or lowering rarity'
      });
    }
    
    // Element vs temperament consistency
    const inconsistentCombinations = [
      { element: 'fire', temperament: 'peaceful' },
      { element: 'water', temperament: 'aggressive' },
      { element: 'earth', temperament: 'chaotic' },
      { element: 'ice', temperament: 'hot-tempered' }
    ];
    
    const inconsistent = inconsistentCombinations.find(combo => 
      essence.element === combo.element && essence.temperament === combo.temperament
    );
    
    if (inconsistent) {
      warnings.push({
        field: 'temperament',
        code: 'ELEMENT_TEMPERAMENT_INCONSISTENT',
        message: `${essence.element} element with ${essence.temperament} temperament is unusual`,
        recommendation: 'Consider if this combination is intentional'
      });
    }
    
    // Intelligence vs archetype consistency
    if (['dragon', 'phoenix', 'angel'].includes(essence.archetype) && essence.intelligence === 'low') {
      warnings.push({
        field: 'intelligence',
        code: 'MYTHICAL_LOW_INTELLIGENCE',
        message: 'Mythical creatures typically have higher intelligence',
        recommendation: 'Consider moderate or high intelligence for mythical beings'
      });
    }
  }
}