/**
 * Asset Factory - Creates and manages Universal Assets
 * 
 * This factory class handles the creation of Universal Assets from creation requests,
 * calculates essence scores, generates universal IDs, and ensures data consistency.
 */

import { 
  UniversalAsset, 
  AssetCreationRequest, 
  CoreEssence, 
  GameVariant,
  AssetTransaction 
} from '../types';
import { 
  validateAssetCreationRequest, 
  validateUniversalAsset,
  validateCoreEssence 
} from '../schemas';
import { EssenceCalculator } from '../utils/essence-calculator';
import { AssetIdGenerator } from '../utils/asset-id-generator';
import { AssetValidator } from '../utils/asset-validator';

export class AssetFactory {
  private essenceCalculator: EssenceCalculator;
  private idGenerator: AssetIdGenerator;
  private validator: AssetValidator;

  constructor() {
    this.essenceCalculator = new EssenceCalculator();
    this.idGenerator = new AssetIdGenerator();
    this.validator = new AssetValidator();
  }

  /**
   * Creates a new Universal Asset from a creation request
   */
  async createUniversalAsset(
    request: AssetCreationRequest,
    creationContext: {
      creator: string;
      transaction_id: string;
      block_number: number;
      network: 'steem' | 'steem_testnet';
    }
  ): Promise<UniversalAsset> {
    // Validate the creation request
    const validationResult = validateAssetCreationRequest(request);
    if (!validationResult.success) {
      throw new Error(`Invalid asset creation request: ${JSON.stringify(validationResult.error)}`);
    }

    // Generate universal ID
    const universal_id = await this.idGenerator.generateUniversalId(
      request.domain,
      request.initial_game_id,
      request.base_metadata.name
    );

    // Calculate essence score and compatibility factors
    const enhancedEssence = await this.enhanceEssence(request.core_essence);

    // Create initial game variant
    const initialVariant = this.createGameVariant(
      request.initial_game_id,
      request.initial_variant,
      enhancedEssence
    );

    // Create the Universal Asset
    const universalAsset: UniversalAsset = {
      // Universal Identifiers
      universal_id,
      domain: request.domain,
      creation_timestamp: new Date().toISOString(),
      creator: creationContext.creator,
      current_owner: request.creation_options.owner,

      // Core Asset Metadata
      base_metadata: {
        ...request.base_metadata,
        tags: request.base_metadata.tags || []
      },

      // Web2 Integration (if provided)
      web2_integration: request.web2_integration ? {
        ...request.web2_integration,
        sync_status: 'pending' as const,
        last_sync: new Date().toISOString()
      } : undefined,

      // Core Essence
      core_essence: enhancedEssence,

      // Game-Specific Variants
      variants: {
        [request.initial_game_id]: initialVariant
      },

      // Asset Properties
      properties: {
        tradeable: request.creation_options.tradeable,
        transferable: request.creation_options.transferable,
        burnable: request.creation_options.burnable,
        mintable: request.creation_options.mintable,
        supply: {
          total: request.creation_options.total_supply || 1,
          circulating: 1,
          burned: 0
        },
        rarity: {
          tier: enhancedEssence.rarity_class,
          score: this.calculateRarityScore(enhancedEssence),
          rank: undefined // Will be calculated based on other assets
        }
      },

      // Economic Information
      economic_data: {
        royalty_percentage: request.creation_options.royalty_percentage,
        royalty_recipient: request.creation_options.royalty_recipient
      },

      // Blockchain Information
      blockchain_info: {
        transaction_id: creationContext.transaction_id,
        block_number: creationContext.block_number,
        confirmation_count: 0,
        network: creationContext.network
      },

      // Transfer History
      transfer_history: [{
        transaction_id: creationContext.transaction_id,
        operation_type: 'mint',
        timestamp: new Date().toISOString(),
        to_user: request.creation_options.owner,
        game_context: request.initial_game_id,
        operation_data: {
          creation_request: request
        },
        success: true
      }]
    };

    // Validate the created asset
    const assetValidation = validateUniversalAsset(universalAsset);
    if (!assetValidation.success) {
      throw new Error(`Created asset failed validation: ${JSON.stringify(assetValidation.error)}`);
    }

    return universalAsset;
  }

  /**
   * Creates a game variant for an existing Universal Asset
   */
  createGameVariant(
    gameId: string,
    variantData: Omit<GameVariant, 'game_id' | 'status'>,
    essence: CoreEssence
  ): GameVariant {
    return {
      game_id: gameId,
      asset_type: variantData.asset_type,
      properties: variantData.properties,
      display: variantData.display,
      mechanics: variantData.mechanics,
      compatibility: variantData.compatibility,
      status: {
        active: true,
        deprecated: false
      }
    };
  }

  /**
   * Adds a new variant to an existing Universal Asset
   */
  async addVariantToAsset(
    asset: UniversalAsset,
    gameId: string,
    variantData: Omit<GameVariant, 'game_id' | 'status'>,
    context: {
      transaction_id: string;
      authorized_by: string;
    }
  ): Promise<UniversalAsset> {
    // Check if variant already exists
    if (asset.variants[gameId]) {
      throw new Error(`Asset ${asset.universal_id} already has a variant for game ${gameId}`);
    }

    // Create the new variant
    const newVariant = this.createGameVariant(gameId, variantData, asset.core_essence);

    // Create updated asset
    const updatedAsset: UniversalAsset = {
      ...asset,
      variants: {
        ...asset.variants,
        [gameId]: newVariant
      },
      transfer_history: [
        ...asset.transfer_history,
        {
          transaction_id: context.transaction_id,
          operation_type: 'update',
          timestamp: new Date().toISOString(),
          operation_data: {
            update_type: 'variant_add',
            game_id: gameId,
            variant_data: newVariant
          },
          success: true
        }
      ]
    };

    // Validate the updated asset
    const validation = validateUniversalAsset(updatedAsset);
    if (!validation.success) {
      throw new Error(`Updated asset failed validation: ${JSON.stringify(validation.error)}`);
    }

    return updatedAsset;
  }

  /**
   * Updates the properties of an existing Universal Asset
   */
  async updateAssetProperties(
    asset: UniversalAsset,
    updates: {
      base_metadata?: Partial<UniversalAsset['base_metadata']>;
      properties?: Partial<UniversalAsset['properties']>;
      economic_data?: Partial<UniversalAsset['economic_data']>;
    },
    context: {
      transaction_id: string;
      authorized_by: string;
    }
  ): Promise<UniversalAsset> {
    // Create updated asset
    const updatedAsset: UniversalAsset = {
      ...asset,
      base_metadata: updates.base_metadata ? {
        ...asset.base_metadata,
        ...updates.base_metadata
      } : asset.base_metadata,
      properties: updates.properties ? {
        ...asset.properties,
        ...updates.properties
      } : asset.properties,
      economic_data: updates.economic_data ? {
        ...asset.economic_data,
        ...updates.economic_data
      } : asset.economic_data,
      transfer_history: [
        ...asset.transfer_history,
        {
          transaction_id: context.transaction_id,
          operation_type: 'update',
          timestamp: new Date().toISOString(),
          operation_data: {
            update_type: 'properties',
            updates
          },
          success: true
        }
      ]
    };

    // Validate the updated asset
    const validation = validateUniversalAsset(updatedAsset);
    if (!validation.success) {
      throw new Error(`Updated asset failed validation: ${JSON.stringify(validation.error)}`);
    }

    return updatedAsset;
  }

  /**
   * Transfers ownership of an asset
   */
  async transferAsset(
    asset: UniversalAsset,
    transfer: {
      from_user: string;
      to_user: string;
      price?: { amount: string; currency: string };
      memo?: string;
      game_context?: string;
    },
    context: {
      transaction_id: string;
    }
  ): Promise<UniversalAsset> {
    // Verify current ownership
    if (asset.current_owner !== transfer.from_user) {
      throw new Error(`Asset ${asset.universal_id} is not owned by ${transfer.from_user}`);
    }

    // Check if asset is transferable
    if (!asset.properties.transferable) {
      throw new Error(`Asset ${asset.universal_id} is not transferable`);
    }

    // Create transfer transaction record
    const transferTransaction: AssetTransaction = {
      transaction_id: context.transaction_id,
      operation_type: 'transfer',
      timestamp: new Date().toISOString(),
      from_user: transfer.from_user,
      to_user: transfer.to_user,
      game_context: transfer.game_context,
      price: transfer.price,
      memo: transfer.memo,
      operation_data: {
        transfer_details: transfer
      },
      success: true
    };

    // Create updated asset with new owner
    const updatedAsset: UniversalAsset = {
      ...asset,
      current_owner: transfer.to_user,
      transfer_history: [
        ...asset.transfer_history,
        transferTransaction
      ]
    };

    // Validate the updated asset
    const validation = validateUniversalAsset(updatedAsset);
    if (!validation.success) {
      throw new Error(`Transferred asset failed validation: ${JSON.stringify(validation.error)}`);
    }

    return updatedAsset;
  }

  /**
   * Burns (destroys) an asset
   */
  async burnAsset(
    asset: UniversalAsset,
    context: {
      transaction_id: string;
      authorized_by: string;
      reason?: string;
    }
  ): Promise<UniversalAsset> {
    // Check if asset is burnable
    if (!asset.properties.burnable) {
      throw new Error(`Asset ${asset.universal_id} is not burnable`);
    }

    // Create burn transaction record
    const burnTransaction: AssetTransaction = {
      transaction_id: context.transaction_id,
      operation_type: 'burn',
      timestamp: new Date().toISOString(),
      from_user: asset.current_owner,
      operation_data: {
        burn_reason: context.reason,
        authorized_by: context.authorized_by
      },
      success: true
    };

    // Update supply information
    const updatedAsset: UniversalAsset = {
      ...asset,
      properties: {
        ...asset.properties,
        supply: {
          ...asset.properties.supply,
          circulating: Math.max(0, asset.properties.supply.circulating - 1),
          burned: asset.properties.supply.burned + 1
        }
      },
      transfer_history: [
        ...asset.transfer_history,
        burnTransaction
      ]
    };

    return updatedAsset;
  }

  /**
   * Enhances core essence with calculated properties
   */
  private async enhanceEssence(essence: Omit<CoreEssence, 'essence_score' | 'compatibility_factors'>): Promise<CoreEssence> {
    // Validate basic essence structure
    const basicEssence = { ...essence, essence_score: 0, compatibility_factors: [] };
    const validation = validateCoreEssence(basicEssence);
    if (!validation.success) {
      throw new Error(`Invalid core essence: ${JSON.stringify(validation.error)}`);
    }

    // Calculate essence score
    const essence_score = this.essenceCalculator.calculateEssenceScore(essence);

    // Determine compatibility factors
    const compatibility_factors = this.essenceCalculator.determineCompatibilityFactors(essence);

    return {
      ...essence,
      essence_score,
      compatibility_factors
    };
  }

  /**
   * Calculates rarity score based on essence properties
   */
  private calculateRarityScore(essence: CoreEssence): number {
    const rarityMap = {
      'common': 10,
      'uncommon': 25,
      'rare': 50,
      'epic': 75,
      'legendary': 90,
      'mythic': 100
    };

    const baseScore = rarityMap[essence.rarity_class as keyof typeof rarityMap] || 10;
    
    // Adjust based on power tier and essence score
    const powerAdjustment = (essence.power_tier / 100) * 10;
    const essenceAdjustment = (essence.essence_score / 1000) * 10;
    
    return Math.min(100, Math.max(0, baseScore + powerAdjustment + essenceAdjustment));
  }

  /**
   * Validates asset creation parameters
   */
  async validateCreationRequest(request: AssetCreationRequest): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Schema validation
    const schemaValidation = validateAssetCreationRequest(request);
    if (!schemaValidation.success) {
      errors.push(`Schema validation failed: ${JSON.stringify(schemaValidation.error)}`);
    }

    // Business logic validation
    if (request.creation_options.total_supply === 0 && !request.creation_options.mintable) {
      errors.push('Non-mintable assets must have a total supply greater than 0');
    }

    if (request.creation_options.royalty_percentage && request.creation_options.royalty_percentage > 0) {
      if (!request.creation_options.royalty_recipient) {
        errors.push('Royalty recipient is required when royalty percentage is set');
      }
    }

    // Essence validation
    try {
      await this.enhanceEssence(request.core_essence);
    } catch (error) {
      errors.push(`Essence validation failed: ${error}`);
    }

    // Uniqueness checks (would need to be implemented with actual data access)
    // This is a placeholder for checks against existing assets
    if (await this.checkNameConflict(request.base_metadata.name, request.domain)) {
      warnings.push('Asset name may conflict with existing assets in the domain');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Checks if an asset name conflicts with existing assets
   * (Placeholder - would need actual data access implementation)
   */
  private async checkNameConflict(name: string, domain: string): Promise<boolean> {
    // This would integrate with the asset registry to check for conflicts
    // For now, return false (no conflict)
    return false;
  }

  /**
   * Generates a preview of what an asset would look like before creation
   */
  async previewAsset(request: AssetCreationRequest): Promise<{
    preview: Partial<UniversalAsset>;
    estimated_essence_score: number;
    estimated_rarity_score: number;
    compatibility_factors: string[];
  }> {
    const enhancedEssence = await this.enhanceEssence(request.core_essence);
    const estimatedRarityScore = this.calculateRarityScore(enhancedEssence);

    const preview: Partial<UniversalAsset> = {
      domain: request.domain,
      base_metadata: {
        ...request.base_metadata,
        tags: request.base_metadata.tags || []
      },
      core_essence: enhancedEssence,
      properties: {
        tradeable: request.creation_options.tradeable,
        transferable: request.creation_options.transferable,
        burnable: request.creation_options.burnable,
        mintable: request.creation_options.mintable,
        supply: {
          total: request.creation_options.total_supply || 1,
          circulating: 1,
          burned: 0
        },
        rarity: {
          tier: enhancedEssence.rarity_class,
          score: estimatedRarityScore
        }
      }
    };

    return {
      preview,
      estimated_essence_score: enhancedEssence.essence_score,
      estimated_rarity_score: estimatedRarityScore,
      compatibility_factors: enhancedEssence.compatibility_factors
    };
  }
}