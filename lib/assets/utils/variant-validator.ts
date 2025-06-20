/**
 * Variant Validator - Validates game-specific asset variants
 * 
 * Provides specialized validation for game variants including
 * game-specific rules, property constraints, and consistency checks.
 */

import { GameVariant, CoreEssence, GameInfo } from '../types';
import { validateGameVariant } from '../schemas';

export interface VariantValidationResult {
  valid: boolean;
  errors: VariantValidationError[];
  warnings: VariantValidationWarning[];
}

export interface VariantValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface VariantValidationWarning {
  field: string;
  code: string;
  message: string;
  recommendation?: string;
}

export class VariantValidator {
  private gameRulesCache: Map<string, GameValidationRules> = new Map();

  /**
   * Validates a game variant
   */
  validateVariant(
    variant: GameVariant,
    essence?: CoreEssence,
    gameInfo?: GameInfo
  ): VariantValidationResult {
    const errors: VariantValidationError[] = [];
    const warnings: VariantValidationWarning[] = [];

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

    // Game-specific validation
    this.validateGameSpecificRules(variant, gameInfo, errors, warnings);

    // Property validation
    this.validateVariantProperties(variant, errors, warnings);

    // Mechanics validation
    this.validateVariantMechanics(variant, errors, warnings);

    // Essence consistency validation
    if (essence) {
      this.validateEssenceConsistency(variant, essence, errors, warnings);
    }

    // Cross-variant compatibility
    this.validateVariantCompatibility(variant, errors, warnings);

    return {
      valid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates multiple variants for consistency
   */
  validateVariantSet(
    variants: GameVariant[],
    essence?: CoreEssence
  ): VariantValidationResult {
    const errors: VariantValidationError[] = [];
    const warnings: VariantValidationWarning[] = [];

    // Validate each variant individually
    variants.forEach((variant, index) => {
      const result = this.validateVariant(variant, essence);
      result.errors.forEach(error => {
        errors.push({
          ...error,
          field: `variants[${index}].${error.field}`
        });
      });
      result.warnings.forEach(warning => {
        warnings.push({
          ...warning,
          field: `variants[${index}].${warning.field}`
        });
      });
    });

    // Cross-variant validation
    this.validateCrossVariantConsistency(variants, errors, warnings);

    return {
      valid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates conversion between variants
   */
  validateVariantConversion(
    sourceVariant: GameVariant,
    targetVariant: GameVariant,
    essence: CoreEssence
  ): VariantValidationResult {
    const errors: VariantValidationError[] = [];
    const warnings: VariantValidationWarning[] = [];

    // Validate both variants individually
    const sourceResult = this.validateVariant(sourceVariant, essence);
    const targetResult = this.validateVariant(targetVariant, essence);

    // Add errors from both validations
    errors.push(...sourceResult.errors.map(e => ({ ...e, field: `source.${e.field}` })));
    errors.push(...targetResult.errors.map(e => ({ ...e, field: `target.${e.field}` })));

    // Conversion-specific validation
    this.validateConversionCompatibility(sourceVariant, targetVariant, errors, warnings);
    this.validateConversionQuality(sourceVariant, targetVariant, essence, errors, warnings);

    return {
      valid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates game-specific rules
   */
  private validateGameSpecificRules(
    variant: GameVariant,
    gameInfo: GameInfo | undefined,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    if (!gameInfo) {
      warnings.push({
        field: 'game_info',
        code: 'NO_GAME_INFO',
        message: 'No game information provided for validation',
        recommendation: 'Provide game information for comprehensive validation'
      });
      return;
    }

    // Validate asset type is supported
    if (!gameInfo.asset_integration.supported_asset_types.includes(variant.asset_type)) {
      errors.push({
        field: 'asset_type',
        code: 'UNSUPPORTED_ASSET_TYPE',
        message: `Asset type ${variant.asset_type} is not supported by game ${variant.game_id}`,
        severity: 'critical'
      });
    }

    // Validate game-specific properties
    const requiredProperties = this.getRequiredProperties(variant.game_id, variant.asset_type);
    requiredProperties.forEach(propName => {
      if (variant.properties[propName] === undefined) {
        errors.push({
          field: `properties.${propName}`,
          code: 'MISSING_REQUIRED_PROPERTY',
          message: `Required property ${propName} is missing for ${variant.asset_type} in ${variant.game_id}`,
          severity: 'error'
        });
      }
    });

    // Validate property ranges
    this.validatePropertyRanges(variant, errors, warnings);

    // Validate abilities
    this.validateGameAbilities(variant, gameInfo, errors, warnings);
  }

  /**
   * Validates variant properties
   */
  private validateVariantProperties(
    variant: GameVariant,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    const properties = variant.properties;

    // Check for negative values where they shouldn't exist
    const nonNegativeProperties = ['health', 'defense', 'attack', 'power', 'mana', 'speed'];
    nonNegativeProperties.forEach(prop => {
      if (properties[prop] !== undefined && Number(properties[prop]) < 0) {
        errors.push({
          field: `properties.${prop}`,
          code: 'NEGATIVE_PROPERTY_VALUE',
          message: `Property ${prop} cannot have negative value`,
          severity: 'error'
        });
      }
    });

    // Check for unreasonably high values
    Object.entries(properties).forEach(([key, value]) => {
      if (typeof value === 'number' && value > 10000) {
        warnings.push({
          field: `properties.${key}`,
          code: 'EXTREMELY_HIGH_VALUE',
          message: `Property ${key} has an extremely high value (${value})`,
          recommendation: 'Verify this value is intentional and balanced'
        });
      }
    });

    // Check for missing core properties
    const coreProperties = this.getCoreProperties(variant.asset_type);
    coreProperties.forEach(prop => {
      if (properties[prop] === undefined) {
        warnings.push({
          field: `properties.${prop}`,
          code: 'MISSING_CORE_PROPERTY',
          message: `Core property ${prop} is missing for asset type ${variant.asset_type}`,
          recommendation: `Consider adding ${prop} property for better game balance`
        });
      }
    });

    // Validate property relationships
    this.validatePropertyRelationships(variant, errors, warnings);
  }

  /**
   * Validates variant mechanics
   */
  private validateVariantMechanics(
    variant: GameVariant,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    const mechanics = variant.mechanics;

    // Validate usage contexts
    if (mechanics.usable_in.length === 0) {
      warnings.push({
        field: 'mechanics.usable_in',
        code: 'NO_USAGE_CONTEXTS',
        message: 'Variant has no defined usage contexts',
        recommendation: 'Define where this asset can be used'
      });
    }

    // Validate abilities
    if (mechanics.abilities && mechanics.abilities.length > 0) {
      this.validateAbilities(mechanics.abilities, variant.game_id, errors, warnings);
    }

    // Validate restrictions
    if (mechanics.restrictions && mechanics.restrictions.length > 0) {
      this.validateRestrictions(mechanics.restrictions, errors, warnings);
    }

    // Validate cooldown and durability
    if (mechanics.cooldown !== undefined && mechanics.cooldown < 0) {
      errors.push({
        field: 'mechanics.cooldown',
        code: 'NEGATIVE_COOLDOWN',
        message: 'Cooldown cannot be negative',
        severity: 'error'
      });
    }

    if (mechanics.durability !== undefined && mechanics.durability <= 0) {
      errors.push({
        field: 'mechanics.durability',
        code: 'INVALID_DURABILITY',
        message: 'Durability must be positive',
        severity: 'error'
      });
    }
  }

  /**
   * Validates essence consistency with variant
   */
  private validateEssenceConsistency(
    variant: GameVariant,
    essence: CoreEssence,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    // Power level consistency
    const variantPower = this.extractVariantPower(variant);
    if (variantPower !== null) {
      const expectedRange = {
        min: essence.power_tier * 0.7,
        max: essence.power_tier * 1.3
      };

      if (variantPower < expectedRange.min || variantPower > expectedRange.max) {
        warnings.push({
          field: 'properties.power',
          code: 'POWER_ESSENCE_MISMATCH',
          message: `Variant power (${variantPower}) doesn't align with essence power tier (${essence.power_tier})`,
          recommendation: 'Ensure variant properties reflect core essence'
        });
      }
    }

    // Element consistency
    if (essence.element) {
      const hasElementReflection = this.checkElementReflection(variant, essence.element);
      if (!hasElementReflection) {
        warnings.push({
          field: 'properties',
          code: 'ELEMENT_NOT_REFLECTED',
          message: `Variant doesn't reflect ${essence.element} element`,
          recommendation: 'Add element-specific properties or abilities'
        });
      }
    }

    // Archetype consistency
    const archetypeConsistent = this.checkArchetypeConsistency(variant, essence.archetype);
    if (!archetypeConsistent) {
      warnings.push({
        field: 'asset_type',
        code: 'ARCHETYPE_INCONSISTENT',
        message: `Asset type ${variant.asset_type} may not align with archetype ${essence.archetype}`,
        recommendation: 'Verify asset type matches the essence archetype'
      });
    }

    // Rarity consistency
    if (['legendary', 'mythic'].includes(essence.rarity_class)) {
      const hasRareProperties = this.checkRareProperties(variant);
      if (!hasRareProperties) {
        warnings.push({
          field: 'properties',
          code: 'RARE_ESSENCE_NOT_REFLECTED',
          message: `${essence.rarity_class} rarity not reflected in variant properties`,
          recommendation: 'Add unique or powerful properties for rare assets'
        });
      }
    }
  }

  /**
   * Validates variant compatibility
   */
  private validateVariantCompatibility(
    variant: GameVariant,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    const compatibility = variant.compatibility;

    // Version validation
    if (!this.isValidVersion(compatibility.min_game_version)) {
      errors.push({
        field: 'compatibility.min_game_version',
        code: 'INVALID_VERSION_FORMAT',
        message: `Invalid version format: ${compatibility.min_game_version}`,
        severity: 'error'
      });
    }

    if (compatibility.max_game_version && !this.isValidVersion(compatibility.max_game_version)) {
      errors.push({
        field: 'compatibility.max_game_version',
        code: 'INVALID_VERSION_FORMAT',
        message: `Invalid version format: ${compatibility.max_game_version}`,
        severity: 'error'
      });
    }

    // Version range validation
    if (compatibility.max_game_version) {
      if (this.compareVersions(compatibility.min_game_version, compatibility.max_game_version) > 0) {
        errors.push({
          field: 'compatibility.max_game_version',
          code: 'INVALID_VERSION_RANGE',
          message: 'Maximum version must be greater than minimum version',
          severity: 'error'
        });
      }
    }

    // Status consistency with compatibility
    if (variant.status.deprecated && !compatibility.max_game_version) {
      warnings.push({
        field: 'compatibility.max_game_version',
        code: 'DEPRECATED_NO_MAX_VERSION',
        message: 'Deprecated variant should specify maximum supported version',
        recommendation: 'Set max_game_version for deprecated variants'
      });
    }
  }

  /**
   * Validates cross-variant consistency
   */
  private validateCrossVariantConsistency(
    variants: GameVariant[],
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    if (variants.length <= 1) return;

    // Check for game ID uniqueness
    const gameIds = variants.map(v => v.game_id);
    const duplicateGames = gameIds.filter((id, index) => gameIds.indexOf(id) !== index);
    
    if (duplicateGames.length > 0) {
      errors.push({
        field: 'variants',
        code: 'DUPLICATE_GAME_VARIANTS',
        message: `Duplicate variants for games: ${duplicateGames.join(', ')}`,
        severity: 'critical'
      });
    }

    // Check for consistent power levels across variants
    const powerLevels = variants.map(v => this.extractVariantPower(v)).filter(p => p !== null);
    if (powerLevels.length > 1) {
      const powerRange = Math.max(...powerLevels) - Math.min(...powerLevels);
      const avgPower = powerLevels.reduce((a, b) => a + b, 0) / powerLevels.length;
      
      if (powerRange > avgPower * 0.5) {
        warnings.push({
          field: 'variants',
          code: 'INCONSISTENT_POWER_LEVELS',
          message: 'Large power variation between variants',
          recommendation: 'Consider if power differences are intentional'
        });
      }
    }

    // Check for deprecated variants
    const deprecatedCount = variants.filter(v => v.status.deprecated).length;
    if (deprecatedCount === variants.length) {
      errors.push({
        field: 'variants',
        code: 'ALL_VARIANTS_DEPRECATED',
        message: 'All variants are deprecated',
        severity: 'error'
      });
    }
  }

  /**
   * Validates conversion compatibility between variants
   */
  private validateConversionCompatibility(
    sourceVariant: GameVariant,
    targetVariant: GameVariant,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    // Check if asset types are compatible
    const typeCompatible = this.checkTypeCompatibility(sourceVariant.asset_type, targetVariant.asset_type);
    if (!typeCompatible) {
      warnings.push({
        field: 'conversion',
        code: 'INCOMPATIBLE_ASSET_TYPES',
        message: `Converting from ${sourceVariant.asset_type} to ${targetVariant.asset_type} may lose functionality`,
        recommendation: 'Consider if this conversion makes sense'
      });
    }

    // Check for property compatibility
    const propertyOverlap = this.calculatePropertyOverlap(sourceVariant.properties, targetVariant.properties);
    if (propertyOverlap < 0.3) {
      warnings.push({
        field: 'conversion',
        code: 'LOW_PROPERTY_OVERLAP',
        message: 'Low property overlap between variants may result in significant data loss',
        recommendation: 'Review property mappings for conversion'
      });
    }
  }

  /**
   * Validates conversion quality
   */
  private validateConversionQuality(
    sourceVariant: GameVariant,
    targetVariant: GameVariant,
    essence: CoreEssence,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    // Calculate expected quality loss
    const qualityLoss = this.calculateQualityLoss(sourceVariant, targetVariant);
    
    if (qualityLoss > 0.5) {
      warnings.push({
        field: 'conversion',
        code: 'HIGH_QUALITY_LOSS',
        message: `Conversion may result in significant quality loss (${Math.round(qualityLoss * 100)}%)`,
        recommendation: 'Consider improving property mappings or conversion rules'
      });
    }

    // Check for ability loss
    const abilityLoss = this.calculateAbilityLoss(sourceVariant, targetVariant);
    if (abilityLoss > 0.3) {
      warnings.push({
        field: 'conversion',
        code: 'SIGNIFICANT_ABILITY_LOSS',
        message: `Conversion will lose ${Math.round(abilityLoss * 100)}% of abilities`,
        recommendation: 'Map more abilities to target variant'
      });
    }
  }

  // Helper methods

  private getRequiredProperties(gameId: string, assetType: string): string[] {
    // This would typically come from game configuration
    const defaultRequired: Record<string, string[]> = {
      'creature': ['health', 'attack'],
      'weapon': ['damage', 'durability'],
      'equipment': ['defense', 'durability'],
      'consumable': ['effect_power'],
      'treasure': ['value']
    };

    return defaultRequired[assetType] || [];
  }

  private validatePropertyRanges(
    variant: GameVariant,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    // Game-specific property ranges would be defined here
    const ranges = this.getPropertyRanges(variant.game_id, variant.asset_type);
    
    Object.entries(variant.properties).forEach(([prop, value]) => {
      if (typeof value === 'number' && ranges[prop]) {
        const range = ranges[prop];
        if (value < range.min || value > range.max) {
          warnings.push({
            field: `properties.${prop}`,
            code: 'PROPERTY_OUT_OF_RANGE',
            message: `Property ${prop} (${value}) is outside expected range [${range.min}, ${range.max}]`,
            recommendation: `Consider adjusting ${prop} to be within normal range`
          });
        }
      }
    });
  }

  private validateGameAbilities(
    variant: GameVariant,
    gameInfo: GameInfo,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    if (!variant.mechanics.abilities) return;

    // This would validate against known abilities for the game
    // For now, just check for reasonable ability count
    if (variant.mechanics.abilities.length > 8) {
      warnings.push({
        field: 'mechanics.abilities',
        code: 'TOO_MANY_ABILITIES',
        message: 'Variant has many abilities which may be overwhelming',
        recommendation: 'Consider grouping or reducing abilities'
      });
    }
  }

  private getCoreProperties(assetType: string): string[] {
    const coreProps: Record<string, string[]> = {
      'creature': ['health', 'attack', 'defense'],
      'weapon': ['damage', 'accuracy'],
      'equipment': ['defense', 'durability'],
      'consumable': ['effect_power', 'duration'],
      'treasure': ['value', 'rarity_bonus']
    };

    return coreProps[assetType] || [];
  }

  private validatePropertyRelationships(
    variant: GameVariant,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    const props = variant.properties;

    // Example relationships
    if (props.attack && props.defense) {
      const ratio = Number(props.attack) / Number(props.defense);
      if (ratio > 10 || ratio < 0.1) {
        warnings.push({
          field: 'properties',
          code: 'UNBALANCED_STATS',
          message: 'Attack and defense stats seem unbalanced',
          recommendation: 'Review stat balance for game play'
        });
      }
    }

    if (props.mana_cost && props.power) {
      const efficiency = Number(props.power) / Number(props.mana_cost);
      if (efficiency > 20) {
        warnings.push({
          field: 'properties',
          code: 'HIGH_EFFICIENCY',
          message: 'Very high power-to-cost ratio detected',
          recommendation: 'Verify this efficiency is balanced'
        });
      }
    }
  }

  private validateAbilities(
    abilities: string[],
    gameId: string,
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    // Check for duplicate abilities
    const uniqueAbilities = new Set(abilities);
    if (uniqueAbilities.size !== abilities.length) {
      warnings.push({
        field: 'mechanics.abilities',
        code: 'DUPLICATE_ABILITIES',
        message: 'Variant has duplicate abilities',
        recommendation: 'Remove duplicate abilities'
      });
    }

    // Check for known problematic combinations
    if (abilities.includes('Invulnerable') && abilities.includes('Regenerate')) {
      warnings.push({
        field: 'mechanics.abilities',
        code: 'OVERPOWERED_COMBINATION',
        message: 'Invulnerable + Regenerate combination may be overpowered',
        recommendation: 'Consider removing one of these abilities'
      });
    }
  }

  private validateRestrictions(
    restrictions: string[],
    errors: VariantValidationError[],
    warnings: VariantValidationWarning[]
  ): void {
    // Check for conflicting restrictions
    if (restrictions.includes('unlimited_use') && restrictions.includes('single_use')) {
      errors.push({
        field: 'mechanics.restrictions',
        code: 'CONFLICTING_RESTRICTIONS',
        message: 'Conflicting usage restrictions specified',
        severity: 'error'
      });
    }
  }

  private extractVariantPower(variant: GameVariant): number | null {
    const powerProps = ['power', 'attack', 'strength', 'damage', 'force'];
    
    for (const prop of powerProps) {
      if (variant.properties[prop] !== undefined) {
        return Number(variant.properties[prop]);
      }
    }
    
    return null;
  }

  private checkElementReflection(variant: GameVariant, element: string): boolean {
    // Check properties
    const hasElementProp = Object.keys(variant.properties).some(key =>
      key.toLowerCase().includes(element.toLowerCase())
    );

    // Check abilities
    const hasElementAbility = variant.mechanics.abilities?.some(ability =>
      ability.toLowerCase().includes(element.toLowerCase())
    ) || false;

    return hasElementProp || hasElementAbility;
  }

  private checkArchetypeConsistency(variant: GameVariant, archetype: string): boolean {
    // Simple mapping of archetypes to expected asset types
    const archetypeMapping: Record<string, string[]> = {
      'dragon': ['creature', 'mount', 'companion'],
      'sword': ['weapon', 'equipment'],
      'potion': ['consumable', 'item'],
      'armor': ['equipment', 'gear']
    };

    const expectedTypes = archetypeMapping[archetype.toLowerCase()] || [];
    return expectedTypes.length === 0 || expectedTypes.includes(variant.asset_type);
  }

  private checkRareProperties(variant: GameVariant): boolean {
    // Check for unique or powerful properties
    const rareIndicators = [
      'legendary', 'mythic', 'unique', 'artifact', 'divine',
      'ancient', 'transcendent', 'ultimate', 'supreme'
    ];

    return Object.keys(variant.properties).some(key =>
      rareIndicators.some(indicator => key.toLowerCase().includes(indicator))
    ) || (variant.mechanics.abilities?.some(ability =>
      rareIndicators.some(indicator => ability.toLowerCase().includes(indicator))
    ) || false);
  }

  private isValidVersion(version: string): boolean {
    // Simple semantic version validation
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    
    return 0;
  }

  private checkTypeCompatibility(sourceType: string, targetType: string): boolean {
    // Define type compatibility matrix
    const compatibilityMatrix: Record<string, string[]> = {
      'creature': ['creature', 'mount', 'companion'],
      'weapon': ['weapon', 'tool', 'equipment'],
      'equipment': ['equipment', 'gear', 'armor'],
      'consumable': ['consumable', 'item', 'resource'],
      'treasure': ['treasure', 'currency', 'collectible']
    };

    const compatibleTypes = compatibilityMatrix[sourceType] || [];
    return compatibleTypes.includes(targetType);
  }

  private calculatePropertyOverlap(
    sourceProps: Record<string, any>,
    targetProps: Record<string, any>
  ): number {
    const sourceKeys = Object.keys(sourceProps);
    const targetKeys = Object.keys(targetProps);
    const overlap = sourceKeys.filter(key => targetKeys.includes(key)).length;
    
    return overlap / Math.max(sourceKeys.length, targetKeys.length);
  }

  private calculateQualityLoss(sourceVariant: GameVariant, targetVariant: GameVariant): number {
    // Simple quality loss calculation based on property preservation
    const sourceProps = Object.keys(sourceVariant.properties);
    const targetProps = Object.keys(targetVariant.properties);
    const preserved = sourceProps.filter(key => targetProps.includes(key)).length;
    
    return 1 - (preserved / sourceProps.length);
  }

  private calculateAbilityLoss(sourceVariant: GameVariant, targetVariant: GameVariant): number {
    const sourceAbilities = sourceVariant.mechanics.abilities || [];
    const targetAbilities = targetVariant.mechanics.abilities || [];
    
    if (sourceAbilities.length === 0) return 0;
    
    const preserved = sourceAbilities.filter(ability => 
      targetAbilities.includes(ability)
    ).length;
    
    return 1 - (preserved / sourceAbilities.length);
  }

  private getPropertyRanges(gameId: string, assetType: string): Record<string, { min: number; max: number }> {
    // This would come from game configuration
    // Default ranges for common properties
    return {
      'health': { min: 1, max: 1000 },
      'attack': { min: 1, max: 500 },
      'defense': { min: 0, max: 200 },
      'speed': { min: 1, max: 100 },
      'mana': { min: 0, max: 100 },
      'damage': { min: 1, max: 300 },
      'accuracy': { min: 1, max: 100 },
      'durability': { min: 1, max: 1000 }
    };
  }
}

interface GameValidationRules {
  gameId: string;
  supportedAssetTypes: string[];
  requiredProperties: Record<string, string[]>;
  propertyRanges: Record<string, { min: number; max: number }>;
  knownAbilities: string[];
  validRestrictions: string[];
}