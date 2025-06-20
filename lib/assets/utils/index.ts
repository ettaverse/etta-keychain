/**
 * Asset System Utilities
 * 
 * This module exports utility classes and functions for the Multi-Level Asset System.
 * These utilities provide essential functionality for asset creation, validation,
 * essence calculation, and variant management.
 */

// Core utility classes
export { EssenceCalculator } from './essence-calculator';
export { AssetIdGenerator } from './asset-id-generator';
export { AssetValidator } from './asset-validator';
export { EssenceInterpreter } from './essence-interpreter';
export { VariantValidator } from './variant-validator';

// Re-export validation result types
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning
} from './asset-validator';

export type {
  VariantValidationResult,
  VariantValidationError,
  VariantValidationWarning
} from './variant-validator';

/**
 * Utility functions for common asset operations
 */

/**
 * Formats an asset ID for display
 */
export function formatAssetId(assetId: string): string {
  // Convert snake_case to Title Case for display
  return assetId
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Extracts domain from asset ID
 */
export function extractDomainFromId(assetId: string): string | null {
  const parts = assetId.split('_');
  if (parts.length >= 4) {
    // Universal ID format: domain_archetype_hash_sequence
    return parts[0];
  }
  return null;
}

/**
 * Generates a deterministic color for an asset based on its properties
 */
export function generateAssetColor(assetId: string, element?: string): string {
  // Element-based colors
  const elementColors: Record<string, string> = {
    'fire': '#FF4444',
    'water': '#4444FF',
    'earth': '#8B4513',
    'wind': '#87CEEB',
    'lightning': '#FFD700',
    'ice': '#E0FFFF',
    'nature': '#228B22',
    'light': '#FFFACD',
    'dark': '#2F2F2F',
    'metal': '#C0C0C0',
    'neutral': '#808080'
  };

  if (element && elementColors[element.toLowerCase()]) {
    return elementColors[element.toLowerCase()];
  }

  // Fallback: generate color from asset ID
  let hash = 0;
  for (let i = 0; i < assetId.length; i++) {
    hash = assetId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const color = `hsl(${hash % 360}, 70%, 50%)`;
  return color;
}

/**
 * Calculates the relative rarity score between assets
 */
export function calculateRelativeRarity(
  assetRarityScore: number,
  allRarityScores: number[]
): number {
  if (allRarityScores.length === 0) return 0;
  
  const sorted = [...allRarityScores].sort((a, b) => a - b);
  const position = sorted.findIndex(score => score >= assetRarityScore);
  
  return position / sorted.length;
}

/**
 * Formats a power tier for display
 */
export function formatPowerTier(powerTier: number): string {
  if (powerTier >= 95) return 'Transcendent';
  if (powerTier >= 90) return 'Legendary';
  if (powerTier >= 80) return 'Epic';
  if (powerTier >= 70) return 'Rare';
  if (powerTier >= 50) return 'Uncommon';
  return 'Common';
}

/**
 * Formats rarity class for display
 */
export function formatRarityClass(rarityClass: string): string {
  return rarityClass
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generates a summary description for an asset
 */
export function generateAssetSummary(
  name: string,
  archetype: string,
  element?: string,
  rarityClass?: string
): string {
  const parts = [
    rarityClass ? formatRarityClass(rarityClass) : null,
    element ? element : null,
    archetype
  ].filter(Boolean);

  return `${parts.join(' ')} - ${name}`;
}

/**
 * Calculates compatibility score between two assets
 */
export function calculateCompatibilityScore(
  asset1CompatibilityFactors: string[],
  asset2CompatibilityFactors: string[]
): number {
  if (asset1CompatibilityFactors.length === 0 || asset2CompatibilityFactors.length === 0) {
    return 0;
  }

  const common = asset1CompatibilityFactors.filter(factor => 
    asset2CompatibilityFactors.includes(factor)
  );

  const total = new Set([...asset1CompatibilityFactors, ...asset2CompatibilityFactors]).size;
  
  return common.length / total;
}

/**
 * Validates if an asset can be used in a specific context
 */
export function canUseAssetInContext(
  assetMechanics: { usable_in: string[]; restrictions?: string[] },
  context: string,
  userLevel?: number
): { canUse: boolean; reason?: string } {
  // Check if context is in usable_in list
  if (!assetMechanics.usable_in.includes(context)) {
    return {
      canUse: false,
      reason: `Asset cannot be used in ${context}`
    };
  }

  // Check restrictions
  if (assetMechanics.restrictions) {
    for (const restriction of assetMechanics.restrictions) {
      if (restriction.startsWith('level_requirement_')) {
        const requiredLevel = parseInt(restriction.replace('level_requirement_', ''));
        if (userLevel !== undefined && userLevel < requiredLevel) {
          return {
            canUse: false,
            reason: `Requires level ${requiredLevel} (current: ${userLevel})`
          };
        }
      }
    }
  }

  return { canUse: true };
}

/**
 * Sorts assets by multiple criteria
 */
export function sortAssets<T extends { 
  core_essence: { power_tier: number; rarity_class: string };
  base_metadata: { name: string };
  creation_timestamp: string;
}>(
  assets: T[],
  sortBy: 'name' | 'power' | 'rarity' | 'date' | 'random' = 'name',
  order: 'asc' | 'desc' = 'asc'
): T[] {
  const sorted = [...assets].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.base_metadata.name.localeCompare(b.base_metadata.name);
        break;
      case 'power':
        comparison = a.core_essence.power_tier - b.core_essence.power_tier;
        break;
      case 'rarity':
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
        const aRarity = rarityOrder.indexOf(a.core_essence.rarity_class);
        const bRarity = rarityOrder.indexOf(b.core_essence.rarity_class);
        comparison = aRarity - bRarity;
        break;
      case 'date':
        comparison = new Date(a.creation_timestamp).getTime() - new Date(b.creation_timestamp).getTime();
        break;
      case 'random':
        comparison = Math.random() - 0.5;
        break;
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Groups assets by a specified field
 */
export function groupAssets<T extends Record<string, any>>(
  assets: T[],
  groupBy: string
): Record<string, T[]> {
  return assets.reduce((groups, asset) => {
    const key = getNestedProperty(asset, groupBy) || 'unknown';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(asset);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Helper function to get nested properties from objects
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Calculates the total value of a collection of assets
 */
export function calculateCollectionValue(
  assets: Array<{
    economic_data?: {
      current_value?: { amount: string; currency: string };
    };
  }>,
  currency: string = 'STEEM'
): { amount: string; currency: string } {
  let total = 0;

  assets.forEach(asset => {
    if (asset.economic_data?.current_value?.currency === currency) {
      total += parseFloat(asset.economic_data.current_value.amount);
    }
  });

  return {
    amount: total.toFixed(3),
    currency
  };
}

/**
 * Filters assets based on multiple criteria
 */
export function filterAssets<T extends {
  core_essence: { power_tier: number; element?: string; rarity_class: string };
  base_metadata: { tags: string[] };
  properties: { tradeable: boolean };
}>(
  assets: T[],
  filters: {
    minPowerTier?: number;
    maxPowerTier?: number;
    elements?: string[];
    rarities?: string[];
    tags?: string[];
    tradeable?: boolean;
  }
): T[] {
  return assets.filter(asset => {
    // Power tier filter
    if (filters.minPowerTier !== undefined && asset.core_essence.power_tier < filters.minPowerTier) {
      return false;
    }
    if (filters.maxPowerTier !== undefined && asset.core_essence.power_tier > filters.maxPowerTier) {
      return false;
    }

    // Element filter
    if (filters.elements && filters.elements.length > 0) {
      if (!asset.core_essence.element || !filters.elements.includes(asset.core_essence.element)) {
        return false;
      }
    }

    // Rarity filter
    if (filters.rarities && filters.rarities.length > 0) {
      if (!filters.rarities.includes(asset.core_essence.rarity_class)) {
        return false;
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasTag = filters.tags.some(tag => asset.base_metadata.tags.includes(tag));
      if (!hasTag) {
        return false;
      }
    }

    // Tradeable filter
    if (filters.tradeable !== undefined && asset.properties.tradeable !== filters.tradeable) {
      return false;
    }

    return true;
  });
}

/**
 * Debounce function for search operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for frequent operations
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}