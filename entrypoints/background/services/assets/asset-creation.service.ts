/**
 * Asset Creation Service - Handles the creation and minting of new assets
 * 
 * Orchestrates the asset creation process including validation, essence calculation,
 * blockchain storage, and registry updates.
 */

import { AssetRegistryService } from '../asset-registry.service';
import { AssetBlockchainService } from '../asset-blockchain.service';
import { AssetFactory } from '../../../../lib/assets/factories';
import { 
  AssetCreationRequest, 
  UniversalAsset, 
  AssetCreationResponse 
} from '../../../../lib/assets/types';
import { validateAssetCreationRequest } from '../../../../lib/assets/schemas';
import Logger from '../../../../src/utils/logger.utils';

export interface AssetCreationContext {
  creator: string;
  creation_method: 'manual' | 'batch' | 'api' | 'import';
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

export interface AssetCreationResult {
  success: boolean;
  asset?: UniversalAsset;
  transaction_id?: string;
  universal_id?: string;
  errors?: string[];
  warnings?: string[];
  creation_time_ms?: number;
  estimated_cost?: { amount: string; currency: string };
}

export class AssetCreationService {
  private static instance: AssetCreationService;
  private registryService: AssetRegistryService;
  private blockchainService: AssetBlockchainService;
  private assetFactory: AssetFactory;
  
  // Creation statistics
  private creationCount: number = 0;
  private totalCreationTime: number = 0;
  private creationErrors: number = 0;

  constructor() {
    this.registryService = AssetRegistryService.getInstance();
    this.blockchainService = AssetBlockchainService.getAssetInstance();
    this.assetFactory = new AssetFactory();
  }

  static getInstance(): AssetCreationService {
    if (!AssetCreationService.instance) {
      AssetCreationService.instance = new AssetCreationService();
    }
    return AssetCreationService.instance;
  }

  /**
   * Creates a new universal asset
   */
  async createAsset(
    request: AssetCreationRequest,
    context: AssetCreationContext
  ): Promise<AssetCreationResult> {
    const startTime = Date.now();
    
    try {
      Logger.log('Creating asset:', { 
        name: request.base_metadata.name, 
        domain: request.domain,
        creator: context.creator 
      });

      // Phase 1: Validation
      const validationResult = await this.validateCreationRequest(request);
      if (!validationResult.valid) {
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          creation_time_ms: Date.now() - startTime
        };
      }

      // Phase 2: Pre-creation checks
      const preChecks = await this.performPreCreationChecks(request, context);
      if (!preChecks.success) {
        return {
          success: false,
          errors: preChecks.errors,
          creation_time_ms: Date.now() - startTime
        };
      }

      // Phase 3: Asset creation
      const asset = await this.createUniversalAsset(request, context);
      
      // Phase 4: Blockchain storage
      const storageResult = await this.storeAssetOnBlockchain(asset, context);
      if (!storageResult.success) {
        return {
          success: false,
          errors: storageResult.errors,
          creation_time_ms: Date.now() - startTime
        };
      }

      // Phase 5: Registry registration
      const registrationResult = await this.registerAssetInRegistry(asset, context);
      if (!registrationResult.success) {
        // Asset is on blockchain but not in registry - log warning
        Logger.warn('Asset stored on blockchain but registry registration failed:', {
          universal_id: asset.universal_id,
          errors: registrationResult.errors
        });
      }

      // Phase 6: Post-creation tasks
      await this.performPostCreationTasks(asset, context);

      const creationTime = Date.now() - startTime;
      this.updateStatistics(creationTime, true);

      Logger.log('Asset created successfully:', {
        universal_id: asset.universal_id,
        transaction_id: storageResult.transaction_id,
        creation_time_ms: creationTime
      });

      return {
        success: true,
        asset,
        transaction_id: storageResult.transaction_id,
        universal_id: asset.universal_id,
        warnings: validationResult.warnings,
        creation_time_ms: creationTime,
        estimated_cost: this.calculateCreationCost(request)
      };

    } catch (error) {
      const creationTime = Date.now() - startTime;
      this.updateStatistics(creationTime, false);
      
      Logger.error('Asset creation failed:', error);
      return {
        success: false,
        errors: [`Asset creation failed: ${error}`],
        creation_time_ms: creationTime
      };
    }
  }

  /**
   * Creates multiple assets in batch
   */
  async createAssetBatch(
    requests: AssetCreationRequest[],
    context: AssetCreationContext
  ): Promise<{
    results: AssetCreationResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      total_time_ms: number;
    };
  }> {
    const startTime = Date.now();
    const results: AssetCreationResult[] = [];
    
    Logger.log('Creating asset batch:', { 
      count: requests.length, 
      creator: context.creator 
    });

    // Process each request
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      const batchContext = {
        ...context,
        creation_method: 'batch' as const,
        session_id: `${context.session_id}_${i}`
      };

      try {
        const result = await this.createAsset(request, batchContext);
        results.push(result);
        
        // Add small delay between creations to avoid overwhelming the blockchain
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        results.push({
          success: false,
          errors: [`Batch creation failed: ${error}`]
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    Logger.log('Batch creation completed:', {
      total: requests.length,
      successful,
      failed,
      total_time_ms: totalTime
    });

    return {
      results,
      summary: {
        total: requests.length,
        successful,
        failed,
        total_time_ms: totalTime
      }
    };
  }

  /**
   * Validates an asset creation request
   */
  async validateCreationRequest(request: AssetCreationRequest): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Schema validation
      const schemaValidation = validateAssetCreationRequest(request);
      if (!schemaValidation.success) {
        errors.push(`Schema validation failed: ${JSON.stringify(schemaValidation.error)}`);
      }

      // Business logic validation using factory
      const factoryValidation = await this.assetFactory.validateCreationRequest(request);
      errors.push(...factoryValidation.errors);
      warnings.push(...factoryValidation.warnings);

      // Domain validation
      const domain = this.registryService.getDomain(request.domain);
      if (!domain) {
        warnings.push(`Domain '${request.domain}' is not registered`);
      }

      // Game validation
      const game = this.registryService.getGame(request.initial_game_id);
      if (!game) {
        warnings.push(`Game '${request.initial_game_id}' is not registered`);
      } else {
        // Check if asset type is supported by the game
        if (!game.asset_integration.supported_asset_types.includes(request.asset_type)) {
          errors.push(`Asset type '${request.asset_type}' is not supported by game '${request.initial_game_id}'`);
        }
      }

      // Content validation
      if (request.base_metadata.name.length < 3) {
        warnings.push('Asset name is very short, consider a more descriptive name');
      }

      if (request.base_metadata.description.length < 20) {
        warnings.push('Asset description is short, consider providing more details');
      }

      // Check for potential duplicates
      const duplicateCheck = await this.checkForDuplicates(request);
      if (duplicateCheck.found) {
        warnings.push(`Similar asset found: ${duplicateCheck.similarAsset}`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      Logger.error('Validation failed:', error);
      return {
        valid: false,
        errors: [`Validation process failed: ${error}`],
        warnings
      };
    }
  }

  /**
   * Estimates the cost of creating an asset
   */
  calculateCreationCost(request: AssetCreationRequest): { amount: string; currency: string } {
    let baseCost = 1.0; // Base cost in STEEM

    // Rarity multiplier
    const rarityMultipliers: Record<string, number> = {
      'common': 1.0,
      'uncommon': 1.2,
      'rare': 1.5,
      'epic': 2.0,
      'legendary': 3.0,
      'mythic': 5.0
    };

    baseCost *= rarityMultipliers[request.core_essence.rarity_class] || 1.0;

    // Power tier multiplier
    baseCost *= (1 + request.core_essence.power_tier / 200);

    // Complexity multiplier
    const propertyCount = Object.keys(request.initial_variant.properties).length;
    const abilityCount = request.initial_variant.mechanics.abilities?.length || 0;
    const complexityMultiplier = 1 + (propertyCount + abilityCount) * 0.01;
    baseCost *= complexityMultiplier;

    // Web2 integration cost
    if (request.web2_integration) {
      baseCost += 0.5;
    }

    return {
      amount: baseCost.toFixed(3),
      currency: 'STEEM'
    };
  }

  /**
   * Gets creation statistics
   */
  getCreationStatistics(): {
    total_created: number;
    average_creation_time_ms: number;
    success_rate: number;
    error_rate: number;
  } {
    const successRate = this.creationCount > 0 ? 
      ((this.creationCount - this.creationErrors) / this.creationCount) : 0;
    
    const averageTime = this.creationCount > 0 ? 
      (this.totalCreationTime / this.creationCount) : 0;

    return {
      total_created: this.creationCount,
      average_creation_time_ms: averageTime,
      success_rate: successRate,
      error_rate: this.creationErrors / Math.max(this.creationCount, 1)
    };
  }

  /**
   * Generates a preview of what an asset would look like
   */
  async previewAsset(request: AssetCreationRequest): Promise<{
    preview: any;
    estimated_cost: { amount: string; currency: string };
    estimated_creation_time_ms: number;
    validation_warnings: string[];
  }> {
    try {
      // Generate preview using factory
      const factoryPreview = await this.assetFactory.previewAsset(request);
      
      // Estimate cost and time
      const estimatedCost = this.calculateCreationCost(request);
      const estimatedTime = this.estimateCreationTime(request);
      
      // Run validation to get warnings
      const validation = await this.validateCreationRequest(request);

      return {
        preview: factoryPreview.preview,
        estimated_cost: estimatedCost,
        estimated_creation_time_ms: estimatedTime,
        validation_warnings: validation.warnings
      };
    } catch (error) {
      Logger.error('Preview generation failed:', error);
      throw new Error(`Preview generation failed: ${error}`);
    }
  }

  // Private helper methods

  private async performPreCreationChecks(
    request: AssetCreationRequest,
    context: AssetCreationContext
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check creator permissions
      if (!await this.validateCreatorPermissions(context.creator, request.domain)) {
        errors.push('Insufficient permissions to create assets in this domain');
      }

      // Check rate limits
      if (!await this.checkRateLimits(context.creator)) {
        errors.push('Rate limit exceeded, please wait before creating more assets');
      }

      // Check resource availability
      if (!await this.checkResourceAvailability(request)) {
        errors.push('Insufficient resources to complete asset creation');
      }

      return {
        success: errors.length === 0,
        errors
      };
    } catch (error) {
      Logger.error('Pre-creation checks failed:', error);
      return {
        success: false,
        errors: [`Pre-creation checks failed: ${error}`]
      };
    }
  }

  private async createUniversalAsset(
    request: AssetCreationRequest,
    context: AssetCreationContext
  ): Promise<UniversalAsset> {
    const creationContext = {
      creator: context.creator,
      transaction_id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      block_number: await this.blockchainService.getHeadBlockNumber(),
      network: 'steem' as const
    };

    return await this.assetFactory.createUniversalAsset(request, creationContext);
  }

  private async storeAssetOnBlockchain(
    asset: UniversalAsset,
    context: AssetCreationContext
  ): Promise<{ success: boolean; transaction_id?: string; errors?: string[] }> {
    try {
      const transactionId = await this.blockchainService.storeAsset(asset, context.creator);
      
      // Update asset with real transaction ID
      asset.blockchain_info.transaction_id = transactionId;
      
      return {
        success: true,
        transaction_id: transactionId
      };
    } catch (error) {
      Logger.error('Blockchain storage failed:', error);
      return {
        success: false,
        errors: [`Blockchain storage failed: ${error}`]
      };
    }
  }

  private async registerAssetInRegistry(
    asset: UniversalAsset,
    context: AssetCreationContext
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const result = await this.registryService.registerAsset(asset, context.creator);
      return {
        success: result.success,
        errors: result.errors
      };
    } catch (error) {
      Logger.error('Registry registration failed:', error);
      return {
        success: false,
        errors: [`Registry registration failed: ${error}`]
      };
    }
  }

  private async performPostCreationTasks(
    asset: UniversalAsset,
    context: AssetCreationContext
  ): Promise<void> {
    try {
      // Log creation event
      Logger.log('Asset creation completed:', {
        universal_id: asset.universal_id,
        creator: context.creator,
        domain: asset.domain,
        creation_method: context.creation_method
      });

      // Update domain/game statistics (async, don't wait)
      this.updateDomainStatistics(asset.domain).catch(error => 
        Logger.warn('Failed to update domain statistics:', error)
      );

      // Trigger any webhooks or notifications (async, don't wait)
      this.triggerCreationNotifications(asset, context).catch(error =>
        Logger.warn('Failed to trigger notifications:', error)
      );
    } catch (error) {
      Logger.warn('Post-creation tasks failed:', error);
      // Don't throw error as asset creation was successful
    }
  }

  private async checkForDuplicates(request: AssetCreationRequest): Promise<{
    found: boolean;
    similarAsset?: string;
  }> {
    try {
      // Search for assets with similar names in the same domain
      const existingAssets = await this.registryService.getAssetsByDomain(request.domain);
      
      const similarAsset = existingAssets.find(asset => 
        asset.base_metadata.name.toLowerCase().includes(request.base_metadata.name.toLowerCase()) ||
        request.base_metadata.name.toLowerCase().includes(asset.base_metadata.name.toLowerCase())
      );

      return {
        found: !!similarAsset,
        similarAsset: similarAsset?.universal_id
      };
    } catch (error) {
      Logger.warn('Duplicate check failed:', error);
      return { found: false };
    }
  }

  private async validateCreatorPermissions(creator: string, domain: string): Promise<boolean> {
    try {
      // In a full implementation, this would check user permissions
      // For now, allow all creators
      return true;
    } catch (error) {
      Logger.error('Permission validation failed:', error);
      return false;
    }
  }

  private async checkRateLimits(creator: string): Promise<boolean> {
    try {
      // In a full implementation, this would check rate limits
      // For now, allow all requests
      return true;
    } catch (error) {
      Logger.error('Rate limit check failed:', error);
      return false;
    }
  }

  private async checkResourceAvailability(request: AssetCreationRequest): Promise<boolean> {
    try {
      // In a full implementation, this would check resource availability
      // For now, assume resources are available
      return true;
    } catch (error) {
      Logger.error('Resource availability check failed:', error);
      return false;
    }
  }

  private estimateCreationTime(request: AssetCreationRequest): number {
    let baseTime = 2000; // 2 seconds base

    // Add time based on complexity
    const propertyCount = Object.keys(request.initial_variant.properties).length;
    const abilityCount = request.initial_variant.mechanics.abilities?.length || 0;
    
    baseTime += propertyCount * 100;
    baseTime += abilityCount * 200;
    
    // Add time for validation
    baseTime += 500;
    
    // Add time for blockchain operations
    baseTime += 3000;

    return baseTime;
  }

  private updateStatistics(creationTime: number, success: boolean): void {
    this.creationCount++;
    this.totalCreationTime += creationTime;
    
    if (!success) {
      this.creationErrors++;
    }
  }

  private async updateDomainStatistics(domain: string): Promise<void> {
    try {
      const domainInfo = this.registryService.getDomain(domain);
      if (domainInfo) {
        domainInfo.properties.total_assets++;
      }
    } catch (error) {
      Logger.warn('Failed to update domain statistics:', error);
    }
  }

  private async triggerCreationNotifications(
    asset: UniversalAsset,
    context: AssetCreationContext
  ): Promise<void> {
    try {
      // In a full implementation, this would trigger webhooks, emails, etc.
      Logger.log('Asset creation notification triggered:', asset.universal_id);
    } catch (error) {
      Logger.warn('Failed to trigger notifications:', error);
    }
  }
}