/**
 * Essence Interpreter - Interprets universal essence for specific games
 * 
 * This utility translates universal asset essence into game-specific
 * properties, abilities, and characteristics.
 */

import { CoreEssence, GameVariant, EssenceInterpretationRules } from '../types';

export class EssenceInterpreter {
  private interpretationCache: Map<string, any> = new Map();

  /**
   * Interprets essence for a specific game using interpretation rules
   */
  interpretEssenceForGame(
    essence: CoreEssence,
    gameId: string,
    rules: EssenceInterpretationRules
  ): Partial<GameVariant> {
    const cacheKey = `${gameId}_${this.getEssenceHash(essence)}`;
    
    if (this.interpretationCache.has(cacheKey)) {
      return this.interpretationCache.get(cacheKey);
    }

    const interpretation = this.performInterpretation(essence, rules);
    this.interpretationCache.set(cacheKey, interpretation);
    
    return interpretation;
  }

  /**
   * Performs the actual essence interpretation
   */
  private performInterpretation(
    essence: CoreEssence,
    rules: EssenceInterpretationRules
  ): Partial<GameVariant> {
    // Determine asset type
    const assetType = this.determineAssetType(essence, rules);
    
    // Generate properties
    const properties = this.generateProperties(essence, rules);
    
    // Generate abilities
    const abilities = this.generateAbilities(essence, rules);
    
    // Generate display information
    const display = this.generateDisplayInfo(essence, rules);
    
    // Generate mechanics
    const mechanics = {
      usable_in: this.determineUsageContexts(essence),
      abilities: abilities,
      restrictions: this.generateRestrictions(essence)
    };

    return {
      asset_type: assetType,
      properties: properties,
      display: display,
      mechanics: mechanics
    };
  }

  /**
   * Determines asset type based on essence and rules
   */
  private determineAssetType(essence: CoreEssence, rules: EssenceInterpretationRules): string {
    // Evaluate asset type rules in order
    for (const rule of rules.asset_type_rules) {
      if (this.evaluateConditions(essence, rule.conditions)) {
        return rule.result_type;
      }
    }

    // Fallback to archetype-based determination
    return this.getDefaultAssetType(essence.archetype);
  }

  /**
   * Generates game-specific properties from essence
   */
  private generateProperties(essence: CoreEssence, rules: EssenceInterpretationRules): Record<string, any> {
    const properties: Record<string, any> = {};

    // Apply stat calculations from rules
    for (const [statName, calculation] of Object.entries(rules.stat_calculations)) {
      try {
        const value = this.evaluateStatFormula(calculation.formula, essence);
        properties[statName] = this.applyStatConstraints(value, calculation);
      } catch (error) {
        console.warn(`Failed to calculate stat ${statName}: ${error}`);
        properties[statName] = this.getDefaultStatValue(statName, essence);
      }
    }

    // Apply property mappings
    for (const [targetProp, mapping] of Object.entries(rules.property_mappings)) {
      try {
        const value = this.evaluatePropertyMapping(mapping, essence);
        properties[targetProp] = value;
      } catch (error) {
        console.warn(`Failed to map property ${targetProp}: ${error}`);
      }
    }

    // Add essence-derived properties
    properties.essence_power = essence.power_tier;
    properties.rarity_tier = essence.rarity_class;
    
    if (essence.element) {
      properties.element_type = essence.element;
      properties.elemental_power = this.calculateElementalPower(essence);
    }

    return properties;
  }

  /**
   * Generates abilities based on essence and rules
   */
  private generateAbilities(essence: CoreEssence, rules: EssenceInterpretationRules): string[] {
    const abilities: string[] = [];

    // Apply ability rules
    for (const abilityRule of rules.ability_rules) {
      if (this.evaluateConditions(essence, abilityRule.conditions)) {
        abilities.push(...abilityRule.granted_abilities);
      }
    }

    // Add essence-based abilities
    abilities.push(...this.getEssenceBasedAbilities(essence));

    // Remove duplicates and return
    return [...new Set(abilities)];
  }

  /**
   * Generates display information
   */
  private generateDisplayInfo(essence: CoreEssence, rules: EssenceInterpretationRules): GameVariant['display'] {
    return {
      name: this.generateDisplayName(essence),
      description: this.generateDisplayDescription(essence),
      image_url: this.generateImageUrl(essence, rules.game_id)
    };
  }

  /**
   * Evaluates conditions against essence
   */
  private evaluateConditions(essence: CoreEssence, conditions: any[]): boolean {
    return conditions.every(condition => {
      const essenceValue = this.getEssenceProperty(essence, condition.property);
      return this.evaluateCondition(essenceValue, condition.operator, condition.value);
    });
  }

  /**
   * Evaluates a single condition
   */
  private evaluateCondition(value: any, operator: string, target: any): boolean {
    switch (operator) {
      case '==': return value === target;
      case '!=': return value !== target;
      case '>': return Number(value) > Number(target);
      case '<': return Number(value) < Number(target);
      case '>=': return Number(value) >= Number(target);
      case '<=': return Number(value) <= Number(target);
      case 'includes': 
        return Array.isArray(value) ? value.includes(target) : String(value).includes(target);
      case 'excludes': 
        return Array.isArray(value) ? !value.includes(target) : !String(value).includes(target);
      default: return false;
    }
  }

  /**
   * Evaluates a stat formula with essence context
   */
  private evaluateStatFormula(formula: string, essence: CoreEssence): number {
    // Create a safe evaluation context
    const context = this.createEvaluationContext(essence);
    
    // Replace variables in formula
    let evaluableFormula = formula;
    Object.entries(context).forEach(([key, value]) => {
      evaluableFormula = evaluableFormula.replace(
        new RegExp(`\\b${key}\\b`, 'g'), 
        String(value)
      );
    });

    // Simple math evaluation (in production, use a proper expression parser)
    try {
      return this.safeEvaluate(evaluableFormula);
    } catch (error) {
      throw new Error(`Formula evaluation failed: ${formula}`);
    }
  }

  /**
   * Evaluates a property mapping
   */
  private evaluatePropertyMapping(mapping: any, essence: CoreEssence): any {
    const sourceValues = mapping.source_properties.map((prop: string) => 
      this.getEssenceProperty(essence, prop)
    );

    // Simple formula evaluation with source values
    let formula = mapping.formula;
    sourceValues.forEach((value: any, index: number) => {
      const placeholder = `source${index}`;
      formula = formula.replace(new RegExp(`\\b${placeholder}\\b`, 'g'), String(value));
    });

    // Apply modifiers if present
    let result = this.safeEvaluate(formula);
    
    if (mapping.modifiers) {
      Object.entries(mapping.modifiers).forEach(([condition, modifier]) => {
        if (this.evaluateModifierCondition(condition, essence)) {
          result *= Number(modifier);
        }
      });
    }

    return result;
  }

  /**
   * Applies stat constraints (min/max, rounding)
   */
  private applyStatConstraints(value: number, calculation: any): number {
    let result = value;

    // Apply rounding
    if (calculation.rounding) {
      switch (calculation.rounding) {
        case 'floor': result = Math.floor(result); break;
        case 'ceil': result = Math.ceil(result); break;
        case 'round': result = Math.round(result); break;
      }
    }

    // Apply min/max constraints
    if (calculation.min_value !== undefined) {
      result = Math.max(result, calculation.min_value);
    }
    if (calculation.max_value !== undefined) {
      result = Math.min(result, calculation.max_value);
    }

    return result;
  }

  /**
   * Gets essence-based abilities
   */
  private getEssenceBasedAbilities(essence: CoreEssence): string[] {
    const abilities: string[] = [];

    // Element-based abilities
    if (essence.element) {
      const elementAbilities = this.getElementAbilities(essence.element);
      abilities.push(...elementAbilities);
    }

    // Archetype-based abilities
    const archetypeAbilities = this.getArchetypeAbilities(essence.archetype);
    abilities.push(...archetypeAbilities);

    // Power tier abilities
    if (essence.power_tier >= 80) {
      abilities.push('Elite_Power');
    }
    if (essence.power_tier >= 90) {
      abilities.push('Legendary_Might');
    }

    // Rarity abilities
    if (['legendary', 'mythic'].includes(essence.rarity_class)) {
      abilities.push('Rare_Essence');
    }

    // Intelligence abilities
    if (['high', 'ancient'].includes(essence.intelligence || '')) {
      abilities.push('Strategic_Thinking');
    }

    return abilities;
  }

  /**
   * Gets element-specific abilities
   */
  private getElementAbilities(element: string): string[] {
    const elementAbilities: Record<string, string[]> = {
      'fire': ['Fire_Blast', 'Burn', 'Heat_Aura'],
      'water': ['Water_Jet', 'Heal', 'Cleanse'],
      'earth': ['Stone_Armor', 'Earthquake', 'Root'],
      'wind': ['Gust', 'Flight', 'Speed_Boost'],
      'lightning': ['Lightning_Bolt', 'Shock', 'Chain_Lightning'],
      'ice': ['Freeze', 'Ice_Shard', 'Slow'],
      'nature': ['Grow', 'Poison', 'Regenerate'],
      'light': ['Heal', 'Blind', 'Purify'],
      'dark': ['Drain', 'Fear', 'Shadow'],
      'metal': ['Harden', 'Conduct', 'Magnetize']
    };

    return elementAbilities[element.toLowerCase()] || [];
  }

  /**
   * Gets archetype-specific abilities
   */
  private getArchetypeAbilities(archetype: string): string[] {
    const archetypeAbilities: Record<string, string[]> = {
      'dragon': ['Dragon_Breath', 'Flight', 'Intimidate'],
      'phoenix': ['Rebirth', 'Flight', 'Fire_Immunity'],
      'unicorn': ['Heal', 'Purify', 'Magic_Horn'],
      'sword': ['Slash', 'Parry', 'Critical_Strike'],
      'staff': ['Magic_Missile', 'Mana_Boost', 'Spell_Focus'],
      'bow': ['Precise_Shot', 'Multi_Shot', 'Long_Range'],
      'shield': ['Block', 'Reflect', 'Protect_Ally'],
      'armor': ['Damage_Reduction', 'Immunity', 'Durability'],
      'potion': ['Instant_Effect', 'Temporary_Boost', 'Stack_Effect']
    };

    return archetypeAbilities[archetype.toLowerCase()] || [];
  }

  /**
   * Determines usage contexts based on essence
   */
  private determineUsageContexts(essence: CoreEssence): string[] {
    const contexts: string[] = [];

    // Power-based contexts
    if (essence.power_tier >= 80) {
      contexts.push('tournaments', 'raids', 'pvp_elite');
    } else if (essence.power_tier >= 60) {
      contexts.push('ranked_battles', 'dungeons');
    } else if (essence.power_tier >= 40) {
      contexts.push('casual_pvp', 'quests');
    } else {
      contexts.push('training', 'casual_play');
    }

    // Rarity-based contexts
    if (['legendary', 'mythic'].includes(essence.rarity_class)) {
      contexts.push('special_events', 'championships');
    }

    // Element-based contexts
    if (essence.element) {
      contexts.push(`${essence.element}_trials`);
    }

    return contexts;
  }

  /**
   * Generates restrictions based on essence
   */
  private generateRestrictions(essence: CoreEssence): string[] {
    const restrictions: string[] = [];

    // Power-based restrictions
    if (essence.power_tier >= 90) {
      restrictions.push('level_requirement_50');
    } else if (essence.power_tier >= 70) {
      restrictions.push('level_requirement_25');
    }

    // Rarity-based restrictions
    if (essence.rarity_class === 'mythic') {
      restrictions.push('one_per_team', 'special_unlock_required');
    } else if (essence.rarity_class === 'legendary') {
      restrictions.push('limited_use');
    }

    // Element-based restrictions
    if (essence.element === 'light' || essence.element === 'dark') {
      restrictions.push('alignment_requirement');
    }

    return restrictions;
  }

  /**
   * Creates evaluation context from essence
   */
  private createEvaluationContext(essence: CoreEssence): Record<string, number> {
    return {
      power_tier: essence.power_tier,
      essence_score: essence.essence_score,
      rarity_multiplier: this.getRarityMultiplier(essence.rarity_class),
      element_power: essence.element ? this.getElementPower(essence.element) : 50,
      intelligence_factor: this.getIntelligenceFactor(essence.intelligence || 'moderate'),
      size_factor: this.getSizeFactor(essence.size_class || 'medium')
    };
  }

  /**
   * Safe mathematical expression evaluation
   */
  private safeEvaluate(expression: string): number {
    // Remove any non-mathematical characters for security
    const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
    
    try {
      // Use Function constructor for safer evaluation than eval
      return new Function('return ' + sanitized)();
    } catch (error) {
      throw new Error(`Invalid mathematical expression: ${expression}`);
    }
  }

  /**
   * Gets property from essence safely
   */
  private getEssenceProperty(essence: CoreEssence, property: string): any {
    return (essence as any)[property];
  }

  /**
   * Evaluates modifier conditions
   */
  private evaluateModifierCondition(condition: string, essence: CoreEssence): boolean {
    // Simple condition evaluation - would be more sophisticated in production
    if (condition === 'high_power' && essence.power_tier >= 80) return true;
    if (condition === 'legendary' && ['legendary', 'mythic'].includes(essence.rarity_class)) return true;
    if (condition === 'elemental' && essence.element) return true;
    return false;
  }

  /**
   * Calculates elemental power based on essence
   */
  private calculateElementalPower(essence: CoreEssence): number {
    const elementPower = this.getElementPower(essence.element!);
    const powerBonus = essence.power_tier * 0.8;
    return Math.round(elementPower + powerBonus);
  }

  /**
   * Gets default asset type for archetype
   */
  private getDefaultAssetType(archetype: string): string {
    const typeMap: Record<string, string> = {
      'dragon': 'creature',
      'phoenix': 'creature',
      'unicorn': 'creature',
      'sword': 'weapon',
      'staff': 'weapon',
      'bow': 'weapon',
      'armor': 'equipment',
      'shield': 'equipment',
      'potion': 'consumable',
      'scroll': 'consumable',
      'gem': 'treasure',
      'crystal': 'treasure'
    };

    return typeMap[archetype.toLowerCase()] || 'item';
  }

  /**
   * Gets default stat value for essence
   */
  private getDefaultStatValue(statName: string, essence: CoreEssence): number {
    // Provide reasonable defaults based on essence
    switch (statName.toLowerCase()) {
      case 'power':
      case 'attack':
      case 'strength': return Math.round(essence.power_tier * 0.8);
      case 'defense':
      case 'health': return Math.round(essence.power_tier * 0.6);
      case 'speed':
      case 'agility': return Math.round(essence.power_tier * 0.5);
      case 'magic':
      case 'mana': return Math.round(essence.power_tier * 0.7);
      default: return Math.round(essence.power_tier * 0.5);
    }
  }

  /**
   * Helper methods for getting various factors
   */
  private getRarityMultiplier(rarity: string): number {
    const multipliers: Record<string, number> = {
      'common': 1.0, 'uncommon': 1.2, 'rare': 1.5,
      'epic': 2.0, 'legendary': 2.5, 'mythic': 3.0
    };
    return multipliers[rarity] || 1.0;
  }

  private getElementPower(element: string): number {
    const powers: Record<string, number> = {
      'fire': 85, 'water': 80, 'earth': 75, 'wind': 82,
      'lightning': 90, 'ice': 78, 'nature': 77, 'light': 95,
      'dark': 95, 'metal': 83, 'neutral': 70
    };
    return powers[element.toLowerCase()] || 70;
  }

  private getIntelligenceFactor(intelligence: string): number {
    const factors: Record<string, number> = {
      'low': 0.8, 'moderate': 1.0, 'high': 1.3, 'ancient': 1.5
    };
    return factors[intelligence.toLowerCase()] || 1.0;
  }

  private getSizeFactor(size: string): number {
    const factors: Record<string, number> = {
      'tiny': 0.5, 'small': 0.7, 'medium': 1.0,
      'large': 1.3, 'huge': 1.6, 'massive': 2.0
    };
    return factors[size.toLowerCase()] || 1.0;
  }

  private generateDisplayName(essence: CoreEssence): string {
    const prefixes = essence.element ? [essence.element] : [];
    const suffixes = ['of Power', 'of Legend', 'of Ancient Times'];
    
    if (essence.rarity_class === 'legendary') prefixes.push('Legendary');
    if (essence.rarity_class === 'mythic') prefixes.push('Mythic');
    
    const baseName = essence.archetype.charAt(0).toUpperCase() + essence.archetype.slice(1);
    const prefix = prefixes.length > 0 ? prefixes.join(' ') + ' ' : '';
    const suffix = essence.power_tier >= 85 ? ` ${suffixes[Math.floor(Math.random() * suffixes.length)]}` : '';
    
    return `${prefix}${baseName}${suffix}`;
  }

  private generateDisplayDescription(essence: CoreEssence): string {
    const parts = [
      `A ${essence.rarity_class} ${essence.archetype}`,
      essence.element ? `imbued with ${essence.element} essence` : null,
      essence.temperament ? `with a ${essence.temperament} nature` : null,
      `possessing considerable power (${essence.power_tier}/100)`
    ].filter(Boolean);

    return parts.join(' ') + '.';
  }

  private generateImageUrl(essence: CoreEssence, gameId: string): string {
    // Generate a predictable image URL based on essence properties
    const element = essence.element || 'neutral';
    const archetype = essence.archetype;
    const rarity = essence.rarity_class;
    
    return `https://assets.${gameId}.com/${element}/${archetype}/${rarity}.png`;
  }

  private getEssenceHash(essence: CoreEssence): string {
    const hashInput = JSON.stringify({
      archetype: essence.archetype,
      element: essence.element,
      power_tier: essence.power_tier,
      rarity_class: essence.rarity_class
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}