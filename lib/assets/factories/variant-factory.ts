/**
 * Variant Factory - Creates and manages game-specific asset variants
 * 
 * This factory handles the creation of game variants from universal asset essence,
 * manages variant interpretations, and handles cross-game conversions.
 */

import { 
  GameVariant, 
  CoreEssence, 
  UniversalAsset,
  GameInfo,
  EssenceInterpretationRules,
  ManifestationTemplate 
} from '../types';
import { validateGameVariant } from '../schemas';
import { EssenceInterpreter } from '../utils/essence-interpreter';
import { VariantValidator } from '../utils/variant-validator';

export class VariantFactory {
  private essenceInterpreter: EssenceInterpreter;
  private variantValidator: VariantValidator;
  private gameRulesCache: Map<string, EssenceInterpretationRules>;
  private templateCache: Map<string, ManifestationTemplate[]>;

  constructor() {
    this.essenceInterpreter = new EssenceInterpreter();
    this.variantValidator = new VariantValidator();
    this.gameRulesCache = new Map();
    this.templateCache = new Map();
  }

  /**
   * Creates a game variant from universal asset essence using game-specific interpretation rules
   */
  async createVariantFromEssence(
    essence: CoreEssence,
    gameId: string,
    assetType?: string,
    customizations?: Record<string, any>
  ): Promise<GameVariant> {
    // Get game interpretation rules
    const interpretationRules = await this.getGameInterpretationRules(gameId);
    
    // Determine asset type if not provided
    const determinedAssetType = assetType || this.determineAssetType(essence, interpretationRules);
    
    // Get applicable manifestation templates
    const templates = await this.getManifestationTemplates(gameId, essence);
    const primaryTemplate = this.selectPrimaryTemplate(templates, essence);
    
    // Generate base properties from essence
    const baseProperties = this.generatePropertiesFromEssence(essence, interpretationRules);
    
    // Apply template modifications
    const templateProperties = primaryTemplate 
      ? this.applyTemplate(primaryTemplate, essence, baseProperties)
      : baseProperties;
    
    // Apply customizations if provided
    const finalProperties = customizations 
      ? { ...templateProperties, ...customizations }
      : templateProperties;
    
    // Generate display information
    const displayInfo = this.generateDisplayInfo(essence, gameId, primaryTemplate);
    
    // Generate mechanics
    const mechanics = this.generateMechanics(essence, interpretationRules);
    
    // Generate compatibility info
    const compatibility = this.generateCompatibilityInfo(gameId);
    
    // Create the variant
    const variant: GameVariant = {
      game_id: gameId,
      asset_type: determinedAssetType,
      properties: finalProperties,
      display: displayInfo,
      mechanics: mechanics,
      compatibility: compatibility,
      status: {
        active: true,
        deprecated: false
      }
    };
    
    // Validate the created variant
    const validation = validateGameVariant(variant);
    if (!validation.success) {
      throw new Error(`Created variant failed validation: ${JSON.stringify(validation.error)}`);
    }
    
    return variant;
  }

  /**
   * Converts an existing variant to a different game
   */
  async convertVariant(
    sourceVariant: GameVariant,
    sourceEssence: CoreEssence,
    targetGameId: string,
    conversionOptions?: {
      preserve_properties?: string[];
      accept_property_loss?: boolean;
      quality_threshold?: number;
    }
  ): Promise<{
    variant: GameVariant;
    conversion_quality: number;
    properties_lost: string[];
    properties_gained: string[];
  }> {
    // Get target game interpretation rules
    const targetRules = await this.getGameInterpretationRules(targetGameId);
    
    // Create base variant from essence
    const baseTargetVariant = await this.createVariantFromEssence(
      sourceEssence, 
      targetGameId
    );
    
    // Attempt to preserve specified properties
    const preservedProperties = this.preserveProperties(
      sourceVariant.properties,
      baseTargetVariant.properties,
      conversionOptions?.preserve_properties || []
    );
    
    // Calculate conversion quality
    const conversionQuality = this.calculateConversionQuality(
      sourceVariant,
      baseTargetVariant,
      preservedProperties
    );
    
    // Check quality threshold
    if (conversionOptions?.quality_threshold && 
        conversionQuality < conversionOptions.quality_threshold && 
        !conversionOptions.accept_property_loss) {
      throw new Error(`Conversion quality ${conversionQuality} below threshold ${conversionOptions.quality_threshold}`);
    }
    
    // Create final converted variant
    const convertedVariant: GameVariant = {
      ...baseTargetVariant,
      properties: { ...baseTargetVariant.properties, ...preservedProperties }
    };
    
    // Analyze property changes
    const propertiesLost = this.getPropertiesLost(sourceVariant.properties, convertedVariant.properties);
    const propertiesGained = this.getPropertiesGained(sourceVariant.properties, convertedVariant.properties);
    
    // Validate converted variant
    const validation = validateGameVariant(convertedVariant);
    if (!validation.success) {
      throw new Error(`Converted variant failed validation: ${JSON.stringify(validation.error)}`);
    }
    
    return {
      variant: convertedVariant,
      conversion_quality: conversionQuality,
      properties_lost: propertiesLost,
      properties_gained: propertiesGained
    };
  }

  /**
   * Updates an existing variant with new properties
   */
  async updateVariant(
    variant: GameVariant,
    updates: {
      properties?: Partial<GameVariant['properties']>;
      display?: Partial<GameVariant['display']>;
      mechanics?: Partial<GameVariant['mechanics']>;
      status?: Partial<GameVariant['status']>;
    }
  ): Promise<GameVariant> {
    const updatedVariant: GameVariant = {
      ...variant,
      properties: updates.properties ? { ...variant.properties, ...updates.properties } : variant.properties,
      display: updates.display ? { ...variant.display, ...updates.display } : variant.display,
      mechanics: updates.mechanics ? { ...variant.mechanics, ...updates.mechanics } : variant.mechanics,
      status: updates.status ? { ...variant.status, ...updates.status } : variant.status
    };
    
    // Validate updated variant
    const validation = validateGameVariant(updatedVariant);
    if (!validation.success) {
      throw new Error(`Updated variant failed validation: ${JSON.stringify(validation.error)}`);
    }
    
    return updatedVariant;
  }

  /**
   * Determines the asset type based on essence and game rules
   */
  private determineAssetType(essence: CoreEssence, rules: EssenceInterpretationRules): string {
    // Evaluate asset type rules in priority order
    for (const rule of rules.asset_type_rules) {
      if (this.evaluateConditions(essence, rule.conditions)) {
        return rule.result_type;
      }
    }
    
    // Default asset type based on archetype
    return this.getDefaultAssetType(essence.archetype);
  }

  /**
   * Generates properties from essence using interpretation rules
   */
  private generatePropertiesFromEssence(
    essence: CoreEssence, 
    rules: EssenceInterpretationRules
  ): Record<string, any> {
    const properties: Record<string, any> = {};
    
    // Apply stat calculations
    for (const [statName, calculation] of Object.entries(rules.stat_calculations)) {
      try {
        const value = this.evaluateFormula(calculation.formula, essence);
        let finalValue = value;
        
        // Apply rounding
        if (calculation.rounding) {
          finalValue = this.applyRounding(value, calculation.rounding);
        }
        
        // Apply min/max constraints
        if (calculation.min_value !== undefined) {
          finalValue = Math.max(finalValue, calculation.min_value);
        }
        if (calculation.max_value !== undefined) {
          finalValue = Math.min(finalValue, calculation.max_value);
        }
        
        properties[statName] = finalValue;
      } catch (error) {
        console.warn(`Failed to calculate stat ${statName}: ${error}`);
        properties[statName] = 0; // Default fallback
      }
    }
    
    return properties;
  }

  /**
   * Generates display information for a variant
   */
  private generateDisplayInfo(
    essence: CoreEssence, 
    gameId: string, 
    template?: ManifestationTemplate
  ): GameVariant['display'] {
    const display: GameVariant['display'] = {};
    
    if (template?.template_rules.display_generation) {
      const displayRules = template.template_rules.display_generation;
      
      // Generate name from template
      if (displayRules.name_template) {
        display.name = this.interpolateTemplate(displayRules.name_template, essence);
      }
      
      // Generate description from template
      if (displayRules.description_template) {
        display.description = this.interpolateTemplate(displayRules.description_template, essence);
      }
      
      // Apply image rules (simplified)
      if (displayRules.image_rules) {
        display.image_url = this.selectImageFromRules(displayRules.image_rules, essence);
      }
    }
    
    return display;
  }

  /**
   * Generates mechanics information for a variant
   */
  private generateMechanics(
    essence: CoreEssence, 
    rules: EssenceInterpretationRules
  ): GameVariant['mechanics'] {
    const mechanics: GameVariant['mechanics'] = {
      usable_in: this.determineUsageContexts(essence),
      abilities: [],
      restrictions: []
    };
    
    // Apply ability rules
    for (const abilityRule of rules.ability_rules) {
      if (this.evaluateConditions(essence, abilityRule.conditions)) {
        mechanics.abilities?.push(...abilityRule.granted_abilities);
      }
    }
    
    // Remove duplicates
    if (mechanics.abilities) {
      mechanics.abilities = [...new Set(mechanics.abilities)];
    }
    
    return mechanics;
  }

  /**
   * Generates compatibility information
   */
  private generateCompatibilityInfo(gameId: string): GameVariant['compatibility'] {
    // This would typically fetch from game registry
    // For now, return default compatibility
    return {
      min_game_version: '1.0.0',
      required_features: [],
      incompatible_with: []
    };
  }

  /**
   * Applies a manifestation template to base properties
   */
  private applyTemplate(
    template: ManifestationTemplate,
    essence: CoreEssence,
    baseProperties: Record<string, any>
  ): Record<string, any> {
    const properties = { ...baseProperties };
    
    // Apply template property generation rules
    for (const [propertyName, generation] of Object.entries(template.template_rules.property_generation)) {
      switch (generation.source) {
        case 'essence':
          properties[propertyName] = this.extractFromEssence(essence, generation.value_spec);
          break;
        case 'formula':
          properties[propertyName] = this.evaluateFormula(generation.value_spec, essence);
          break;
        case 'constant':
          properties[propertyName] = generation.value_spec;
          break;
        case 'random':
          properties[propertyName] = this.generateRandomValue(generation.value_spec);
          break;
      }
    }
    
    return properties;
  }

  /**
   * Evaluates conditions against essence properties
   */
  private evaluateConditions(essence: CoreEssence, conditions: any[]): boolean {
    return conditions.every(condition => {
      const essenceValue = (essence as any)[condition.property];
      
      switch (condition.operator) {
        case '==': return essenceValue === condition.value;
        case '!=': return essenceValue !== condition.value;
        case '>': return essenceValue > condition.value;
        case '<': return essenceValue < condition.value;
        case '>=': return essenceValue >= condition.value;
        case '<=': return essenceValue <= condition.value;
        case 'includes': 
          return Array.isArray(essenceValue) && essenceValue.includes(condition.value);
        case 'excludes': 
          return !Array.isArray(essenceValue) || !essenceValue.includes(condition.value);
        default: return false;
      }
    });
  }

  /**
   * Evaluates a formula string with essence context
   */
  private evaluateFormula(formula: string, essence: CoreEssence): number {
    // Simple formula evaluation - in production, use a proper expression parser
    let result = formula;
    
    // Replace essence properties
    Object.entries(essence).forEach(([key, value]) => {
      if (typeof value === 'number') {
        result = result.replace(new RegExp(`\\b${key}\\b`, 'g'), value.toString());
      }
    });
    
    // Simple math evaluation (unsafe - use proper parser in production)
    try {
      return Function(`"use strict"; return (${result})`)();
    } catch (error) {
      console.warn(`Formula evaluation failed: ${formula}`);
      return 0;
    }
  }

  /**
   * Applies rounding to a numeric value
   */
  private applyRounding(value: number, rounding: 'floor' | 'ceil' | 'round'): number {
    switch (rounding) {
      case 'floor': return Math.floor(value);
      case 'ceil': return Math.ceil(value);
      case 'round': return Math.round(value);
      default: return value;
    }
  }

  /**
   * Gets default asset type based on archetype
   */
  private getDefaultAssetType(archetype: string): string {
    const archetypeMapping: Record<string, string> = {
      'dragon': 'creature',
      'sword': 'weapon',
      'potion': 'consumable',
      'spell': 'ability',
      'armor': 'equipment',
      'song': 'media',
      'artwork': 'collectible'
    };
    
    return archetypeMapping[archetype.toLowerCase()] || 'item';
  }

  /**
   * Determines usage contexts based on essence
   */
  private determineUsageContexts(essence: CoreEssence): string[] {
    const contexts: string[] = [];
    
    // Basic contexts based on power tier
    if (essence.power_tier >= 80) {
      contexts.push('tournaments', 'raids', 'pvp');
    } else if (essence.power_tier >= 50) {
      contexts.push('ranked_battles', 'dungeons');
    } else {
      contexts.push('casual_play', 'training');
    }
    
    // Element-specific contexts
    if (essence.element) {
      contexts.push(`${essence.element}_challenges`);
    }
    
    return contexts;
  }

  /**
   * Interpolates template strings with essence data
   */
  private interpolateTemplate(template: string, essence: CoreEssence): string {
    let result = template;
    
    Object.entries(essence).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });
    
    return result;
  }

  /**
   * Selects image based on rules and essence
   */
  private selectImageFromRules(rules: any, essence: CoreEssence): string {
    // Simplified image selection - would be more complex in production
    return `https://assets.game.com/${essence.archetype}/${essence.element || 'default'}.png`;
  }

  /**
   * Extracts value from essence based on specification
   */
  private extractFromEssence(essence: CoreEssence, spec: any): any {
    if (typeof spec === 'string') {
      return (essence as any)[spec];
    }
    return spec;
  }

  /**
   * Generates a random value based on specification
   */
  private generateRandomValue(spec: any): any {
    if (spec.type === 'range') {
      return Math.random() * (spec.max - spec.min) + spec.min;
    } else if (spec.type === 'choice') {
      return spec.choices[Math.floor(Math.random() * spec.choices.length)];
    }
    return 0;
  }

  /**
   * Calculates conversion quality between variants
   */
  private calculateConversionQuality(
    sourceVariant: GameVariant,
    targetVariant: GameVariant,
    preservedProperties: Record<string, any>
  ): number {
    const sourceProps = Object.keys(sourceVariant.properties);
    const targetProps = Object.keys(targetVariant.properties);
    const preservedProps = Object.keys(preservedProperties);
    
    // Simple quality calculation based on property preservation
    const propertyPreservationRate = preservedProps.length / sourceProps.length;
    const targetCoverageRate = preservedProps.length / targetProps.length;
    
    return (propertyPreservationRate + targetCoverageRate) / 2;
  }

  /**
   * Attempts to preserve properties during conversion
   */
  private preserveProperties(
    sourceProperties: Record<string, any>,
    targetProperties: Record<string, any>,
    preserveList: string[]
  ): Record<string, any> {
    const preserved: Record<string, any> = {};
    
    preserveList.forEach(propertyName => {
      if (sourceProperties[propertyName] !== undefined && 
          targetProperties[propertyName] !== undefined) {
        preserved[propertyName] = sourceProperties[propertyName];
      }
    });
    
    return preserved;
  }

  /**
   * Gets properties that were lost in conversion
   */
  private getPropertiesLost(
    sourceProperties: Record<string, any>,
    targetProperties: Record<string, any>
  ): string[] {
    return Object.keys(sourceProperties).filter(
      key => targetProperties[key] === undefined
    );
  }

  /**
   * Gets properties that were gained in conversion
   */
  private getPropertiesGained(
    sourceProperties: Record<string, any>,
    targetProperties: Record<string, any>
  ): string[] {
    return Object.keys(targetProperties).filter(
      key => sourceProperties[key] === undefined
    );
  }

  /**
   * Gets game interpretation rules (with caching)
   */
  private async getGameInterpretationRules(gameId: string): Promise<EssenceInterpretationRules> {
    if (this.gameRulesCache.has(gameId)) {
      return this.gameRulesCache.get(gameId)!;
    }
    
    // In production, this would fetch from a game registry service
    const defaultRules: EssenceInterpretationRules = {
      game_id: gameId,
      property_mappings: {},
      asset_type_rules: [],
      stat_calculations: {
        'power': { formula: 'power_tier', min_value: 1, max_value: 100 }
      },
      ability_rules: []
    };
    
    this.gameRulesCache.set(gameId, defaultRules);
    return defaultRules;
  }

  /**
   * Gets manifestation templates for a game and essence
   */
  private async getManifestationTemplates(
    gameId: string, 
    essence: CoreEssence
  ): Promise<ManifestationTemplate[]> {
    const cacheKey = `${gameId}_${essence.archetype}`;
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }
    
    // In production, this would fetch from a template registry
    const templates: ManifestationTemplate[] = [];
    
    this.templateCache.set(cacheKey, templates);
    return templates;
  }

  /**
   * Selects the most appropriate template for an essence
   */
  private selectPrimaryTemplate(
    templates: ManifestationTemplate[], 
    essence: CoreEssence
  ): ManifestationTemplate | undefined {
    if (templates.length === 0) return undefined;
    
    // Score templates based on how well they match the essence
    const scoredTemplates = templates.map(template => ({
      template,
      score: this.scoreTemplateMatch(template, essence)
    }));
    
    // Sort by score and return the best match
    scoredTemplates.sort((a, b) => b.score - a.score);
    return scoredTemplates[0]?.template;
  }

  /**
   * Scores how well a template matches an essence
   */
  private scoreTemplateMatch(template: ManifestationTemplate, essence: CoreEssence): number {
    // Simple scoring - in production would be more sophisticated
    let score = 0;
    
    if (template.template_rules.applies_to) {
      for (const condition of template.template_rules.applies_to) {
        if (this.evaluateConditions(essence, [condition])) {
          score += condition.weight || 1;
        }
      }
    }
    
    return score;
  }
}