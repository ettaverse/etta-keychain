/**
 * Essence Calculator - Calculates essence scores and compatibility factors
 * 
 * This utility handles the mathematical calculations for asset essence properties,
 * determining compatibility factors and overall essence strength scores.
 */

import { CoreEssence } from '../types';

export class EssenceCalculator {
  // Weight factors for different essence properties
  private readonly PROPERTY_WEIGHTS = {
    power_tier: 0.3,
    rarity_class: 0.25,
    element: 0.15,
    archetype: 0.1,
    temperament: 0.08,
    intelligence: 0.05,
    craftsmanship: 0.04,
    size_class: 0.03
  };

  // Rarity multipliers
  private readonly RARITY_MULTIPLIERS = {
    'common': 1.0,
    'uncommon': 1.2,
    'rare': 1.5,
    'epic': 2.0,
    'legendary': 2.5,
    'mythic': 3.0
  };

  // Element compatibility matrix
  private readonly ELEMENT_COMPATIBILITY = {
    'fire': ['lightning', 'earth', 'metal'],
    'water': ['ice', 'nature', 'wind'],
    'earth': ['fire', 'nature', 'metal'],
    'wind': ['water', 'lightning', 'ice'],
    'lightning': ['fire', 'wind', 'metal'],
    'ice': ['water', 'wind'],
    'nature': ['earth', 'water'],
    'metal': ['fire', 'earth', 'lightning'],
    'light': ['all'],
    'dark': ['all'],
    'neutral': ['all']
  };

  /**
   * Calculates the overall essence score for an asset
   */
  calculateEssenceScore(essence: Omit<CoreEssence, 'essence_score' | 'compatibility_factors'>): number {
    let score = 0;

    // Base score from power tier
    score += essence.power_tier * this.PROPERTY_WEIGHTS.power_tier;

    // Rarity class contribution
    const rarityMultiplier = this.RARITY_MULTIPLIERS[essence.rarity_class as keyof typeof this.RARITY_MULTIPLIERS] || 1.0;
    score += 100 * rarityMultiplier * this.PROPERTY_WEIGHTS.rarity_class;

    // Element contribution
    if (essence.element) {
      const elementScore = this.calculateElementScore(essence.element);
      score += elementScore * this.PROPERTY_WEIGHTS.element;
    }

    // Archetype contribution
    const archetypeScore = this.calculateArchetypeScore(essence.archetype);
    score += archetypeScore * this.PROPERTY_WEIGHTS.archetype;

    // Temperament contribution
    if (essence.temperament) {
      const temperamentScore = this.calculateTemperamentScore(essence.temperament);
      score += temperamentScore * this.PROPERTY_WEIGHTS.temperament;
    }

    // Intelligence contribution
    if (essence.intelligence) {
      const intelligenceScore = this.calculateIntelligenceScore(essence.intelligence);
      score += intelligenceScore * this.PROPERTY_WEIGHTS.intelligence;
    }

    // Craftsmanship contribution
    if (essence.craftsmanship) {
      const craftsmanshipScore = this.calculateCraftsmanshipScore(essence.craftsmanship);
      score += craftsmanshipScore * this.PROPERTY_WEIGHTS.craftsmanship;
    }

    // Size class contribution
    if (essence.size_class) {
      const sizeScore = this.calculateSizeScore(essence.size_class);
      score += sizeScore * this.PROPERTY_WEIGHTS.size_class;
    }

    // Bonus for unique combinations
    score += this.calculateUniquenessBonus(essence);

    // Normalize to 0-1000 range
    return Math.min(1000, Math.max(0, Math.round(score * 10)));
  }

  /**
   * Determines compatibility factors based on essence properties
   */
  determineCompatibilityFactors(essence: Omit<CoreEssence, 'essence_score' | 'compatibility_factors'>): string[] {
    const factors: string[] = [];

    // Element-based compatibility
    if (essence.element) {
      factors.push(`element_${essence.element}`);
      
      // Add compatible elements
      const compatibleElements = this.ELEMENT_COMPATIBILITY[essence.element as keyof typeof this.ELEMENT_COMPATIBILITY] || [];
      compatibleElements.forEach(element => {
        if (element !== 'all') {
          factors.push(`compatible_${element}`);
        }
      });
      
      // Universal compatibility for light/dark/neutral
      if (['light', 'dark', 'neutral'].includes(essence.element)) {
        factors.push('universal_element');
      }
    }

    // Archetype-based compatibility
    factors.push(`archetype_${essence.archetype}`);
    
    // Add archetype family compatibility
    const archetypeFamily = this.getArchetypeFamily(essence.archetype);
    if (archetypeFamily) {
      factors.push(`family_${archetypeFamily}`);
    }

    // Power tier compatibility ranges
    if (essence.power_tier >= 80) {
      factors.push('high_power', 'elite_tier');
    } else if (essence.power_tier >= 60) {
      factors.push('mid_power', 'veteran_tier');
    } else if (essence.power_tier >= 40) {
      factors.push('balanced_power', 'standard_tier');
    } else {
      factors.push('low_power', 'novice_tier');
    }

    // Rarity-based compatibility
    factors.push(`rarity_${essence.rarity_class}`);
    
    // Rarity tier groupings
    if (['legendary', 'mythic'].includes(essence.rarity_class)) {
      factors.push('premium_rarity');
    } else if (['rare', 'epic'].includes(essence.rarity_class)) {
      factors.push('advanced_rarity');
    } else {
      factors.push('basic_rarity');
    }

    // Temperament compatibility
    if (essence.temperament) {
      factors.push(`temperament_${essence.temperament}`);
      
      // Temperament groupings
      if (['aggressive', 'chaotic', 'wild'].includes(essence.temperament)) {
        factors.push('volatile_nature');
      } else if (['peaceful', 'calm', 'serene'].includes(essence.temperament)) {
        factors.push('stable_nature');
      } else if (['balanced', 'neutral', 'adaptive'].includes(essence.temperament)) {
        factors.push('flexible_nature');
      }
    }

    // Intelligence-based compatibility
    if (essence.intelligence) {
      factors.push(`intelligence_${essence.intelligence}`);
      
      if (['high', 'ancient', 'transcendent'].includes(essence.intelligence)) {
        factors.push('high_intelligence');
      } else if (['moderate', 'average'].includes(essence.intelligence)) {
        factors.push('moderate_intelligence');
      } else {
        factors.push('basic_intelligence');
      }
    }

    // Size class compatibility
    if (essence.size_class) {
      factors.push(`size_${essence.size_class}`);
      
      // Size groupings for compatibility
      if (['massive', 'giant', 'colossal'].includes(essence.size_class)) {
        factors.push('large_scale');
      } else if (['medium', 'average', 'standard'].includes(essence.size_class)) {
        factors.push('medium_scale');
      } else {
        factors.push('small_scale');
      }
    }

    // Special compatibility factors
    factors.push(...this.getSpecialCompatibilityFactors(essence));

    return [...new Set(factors)]; // Remove duplicates
  }

  /**
   * Calculates element score based on element rarity and power
   */
  private calculateElementScore(element: string): number {
    const elementScores: Record<string, number> = {
      'fire': 85,
      'water': 80,
      'earth': 75,
      'wind': 82,
      'lightning': 90,
      'ice': 78,
      'nature': 77,
      'metal': 83,
      'light': 95,
      'dark': 95,
      'neutral': 70,
      'void': 100,
      'time': 100,
      'space': 100
    };

    return elementScores[element.toLowerCase()] || 50;
  }

  /**
   * Calculates archetype score based on complexity and power
   */
  private calculateArchetypeScore(archetype: string): number {
    const archetypeScores: Record<string, number> = {
      'dragon': 95,
      'phoenix': 90,
      'unicorn': 88,
      'demon': 85,
      'angel': 87,
      'sword': 75,
      'staff': 78,
      'bow': 72,
      'shield': 70,
      'armor': 68,
      'potion': 60,
      'scroll': 65,
      'gem': 80,
      'crystal': 82,
      'song': 70,
      'story': 68,
      'painting': 72,
      'sculpture': 75
    };

    return archetypeScores[archetype.toLowerCase()] || 50;
  }

  /**
   * Calculates temperament score
   */
  private calculateTemperamentScore(temperament: string): number {
    const temperamentScores: Record<string, number> = {
      'aggressive': 85,
      'peaceful': 75,
      'chaotic': 90,
      'balanced': 70,
      'wild': 88,
      'calm': 72,
      'fierce': 87,
      'gentle': 73,
      'mysterious': 82,
      'noble': 78,
      'ancient': 95
    };

    return temperamentScores[temperament.toLowerCase()] || 60;
  }

  /**
   * Calculates intelligence score
   */
  private calculateIntelligenceScore(intelligence: string): number {
    const intelligenceScores: Record<string, number> = {
      'low': 30,
      'basic': 40,
      'moderate': 60,
      'average': 65,
      'high': 80,
      'superior': 90,
      'genius': 95,
      'ancient': 100,
      'transcendent': 100
    };

    return intelligenceScores[intelligence.toLowerCase()] || 50;
  }

  /**
   * Calculates craftsmanship score
   */
  private calculateCraftsmanshipScore(craftsmanship: string): number {
    const craftsmanshipScores: Record<string, number> = {
      'crude': 20,
      'basic': 35,
      'standard': 50,
      'fine': 70,
      'masterwork': 85,
      'legendary': 95,
      'divine': 100,
      'artifacts': 100
    };

    return craftsmanshipScores[craftsmanship.toLowerCase()] || 40;
  }

  /**
   * Calculates size score
   */
  private calculateSizeScore(sizeClass: string): number {
    const sizeScores: Record<string, number> = {
      'tiny': 40,
      'small': 55,
      'medium': 70,
      'large': 85,
      'huge': 90,
      'massive': 95,
      'colossal': 100
    };

    return sizeScores[sizeClass.toLowerCase()] || 60;
  }

  /**
   * Calculates uniqueness bonus for rare combinations
   */
  private calculateUniquenessBonus(essence: Omit<CoreEssence, 'essence_score' | 'compatibility_factors'>): number {
    let bonus = 0;

    // Rare element + archetype combinations
    const rareElementArchetypeCombos = [
      ['light', 'dragon'],
      ['dark', 'unicorn'],
      ['void', 'phoenix'],
      ['time', 'sword'],
      ['space', 'crystal']
    ];

    const currentCombo = [essence.element?.toLowerCase(), essence.archetype.toLowerCase()];
    if (rareElementArchetypeCombos.some(combo => 
      combo[0] === currentCombo[0] && combo[1] === currentCombo[1])) {
      bonus += 15;
    }

    // High intelligence + high power combination
    if (['high', 'ancient', 'transcendent'].includes(essence.intelligence || '') && essence.power_tier >= 85) {
      bonus += 10;
    }

    // Legendary+ rarity with unique properties
    if (['legendary', 'mythic'].includes(essence.rarity_class) && essence.power_tier >= 90) {
      bonus += 12;
    }

    // Ancient or divine craftsmanship bonus
    if (['ancient', 'divine', 'artifacts'].includes(essence.craftsmanship || '')) {
      bonus += 8;
    }

    return bonus;
  }

  /**
   * Gets archetype family for compatibility grouping
   */
  private getArchetypeFamily(archetype: string): string | null {
    const families: Record<string, string> = {
      'dragon': 'mythical_creatures',
      'phoenix': 'mythical_creatures',
      'unicorn': 'mythical_creatures',
      'griffin': 'mythical_creatures',
      'demon': 'supernatural_beings',
      'angel': 'supernatural_beings',
      'spirit': 'supernatural_beings',
      'sword': 'weapons',
      'bow': 'weapons',
      'staff': 'weapons',
      'dagger': 'weapons',
      'armor': 'equipment',
      'shield': 'equipment',
      'helmet': 'equipment',
      'potion': 'consumables',
      'scroll': 'consumables',
      'elixir': 'consumables',
      'gem': 'treasures',
      'crystal': 'treasures',
      'coin': 'treasures',
      'song': 'media',
      'story': 'media',
      'painting': 'media'
    };

    return families[archetype.toLowerCase()] || null;
  }

  /**
   * Gets special compatibility factors based on unique combinations
   */
  private getSpecialCompatibilityFactors(essence: Omit<CoreEssence, 'essence_score' | 'compatibility_factors'>): string[] {
    const factors: string[] = [];

    // Cross-domain compatibility
    if (essence.element && ['light', 'dark', 'neutral'].includes(essence.element)) {
      factors.push('cross_domain_compatible');
    }

    // Evolution potential
    if (essence.power_tier >= 70 && ['legendary', 'mythic'].includes(essence.rarity_class)) {
      factors.push('evolution_capable');
    }

    // Fusion compatibility
    if (essence.element && essence.archetype) {
      factors.push('fusion_compatible');
    }

    // Tournament eligible
    if (essence.power_tier >= 60) {
      factors.push('tournament_eligible');
    }

    // Collectible value
    if (['legendary', 'mythic'].includes(essence.rarity_class) || 
        ['ancient', 'divine'].includes(essence.craftsmanship || '')) {
      factors.push('high_collectible_value');
    }

    // Cross-game adaptable
    if (essence.temperament === 'balanced' || essence.intelligence === 'high') {
      factors.push('cross_game_adaptable');
    }

    return factors;
  }

  /**
   * Validates essence consistency
   */
  validateEssenceConsistency(essence: Omit<CoreEssence, 'essence_score' | 'compatibility_factors'>): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check power tier vs rarity consistency
    if (essence.power_tier >= 85 && !['legendary', 'mythic'].includes(essence.rarity_class)) {
      warnings.push('High power tier should typically have legendary or mythic rarity');
    }

    if (essence.power_tier <= 30 && ['legendary', 'mythic'].includes(essence.rarity_class)) {
      warnings.push('Legendary/mythic rarity should typically have higher power tier');
    }

    // Check element + temperament consistency
    if (essence.element === 'fire' && essence.temperament === 'peaceful') {
      warnings.push('Fire element with peaceful temperament is unusual');
    }

    if (essence.element === 'water' && essence.temperament === 'aggressive') {
      warnings.push('Water element with aggressive temperament is unusual');
    }

    // Check intelligence + archetype consistency
    if (['dragon', 'phoenix'].includes(essence.archetype) && essence.intelligence === 'low') {
      warnings.push('Mythical creatures typically have higher intelligence');
    }

    // Check size + power consistency
    if (essence.size_class === 'massive' && essence.power_tier < 60) {
      warnings.push('Massive entities typically have higher power levels');
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }
}