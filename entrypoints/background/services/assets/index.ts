/**
 * Asset Services Index
 * 
 * Central export point for all asset-related services in the Multi-Level Asset System.
 * This module provides a unified interface for asset creation, management, discovery,
 * ownership, and cross-game functionality.
 */

// Core asset services
export { AssetCreationService } from './asset-creation.service';
export { AssetOwnershipService } from './asset-ownership.service';
export { AssetDiscoveryService } from './asset-discovery.service';

// Service manager for coordinating all asset services
export class AssetServiceManager {
  private static instance: AssetServiceManager;
  
  private creationService: AssetCreationService;
  private ownershipService: AssetOwnershipService;
  private discoveryService: AssetDiscoveryService;

  constructor() {
    this.creationService = AssetCreationService.getInstance();
    this.ownershipService = AssetOwnershipService.getInstance();
    this.discoveryService = AssetDiscoveryService.getInstance();
  }

  static getInstance(): AssetServiceManager {
    if (!AssetServiceManager.instance) {
      AssetServiceManager.instance = new AssetServiceManager();
    }
    return AssetServiceManager.instance;
  }

  /**
   * Gets the asset creation service
   */
  getCreationService(): AssetCreationService {
    return this.creationService;
  }

  /**
   * Gets the asset ownership service
   */
  getOwnershipService(): AssetOwnershipService {
    return this.ownershipService;
  }

  /**
   * Gets the asset discovery service
   */
  getDiscoveryService(): AssetDiscoveryService {
    return this.discoveryService;
  }

  /**
   * Gets comprehensive statistics across all asset services
   */
  getAllServiceStatistics(): {
    creation: ReturnType<AssetCreationService['getCreationStatistics']>;
    ownership: ReturnType<AssetOwnershipService['getOwnershipStatistics']>;
    discovery: ReturnType<AssetDiscoveryService['getDiscoveryStatistics']>;
  } {
    return {
      creation: this.creationService.getCreationStatistics(),
      ownership: this.ownershipService.getOwnershipStatistics(),
      discovery: this.discoveryService.getDiscoveryStatistics()
    };
  }

  /**
   * Clears all service caches
   */
  clearAllCaches(): void {
    this.ownershipService.clearOwnershipCache();
    this.discoveryService.clearDiscoveryCache();
  }

  /**
   * Performs a comprehensive asset operation that involves multiple services
   */
  async performComprehensiveAssetSearch(params: {
    searchFilters: any;
    verifyOwnership?: { assetId: string; username: string };
    includeRecommendations?: { username: string; context: any };
  }): Promise<{
    searchResults: any;
    ownershipVerification?: any;
    recommendations?: any[];
  }> {
    const results: any = {};

    // Perform asset search
    results.searchResults = await this.discoveryService.searchAssets(params.searchFilters);

    // Verify ownership if requested
    if (params.verifyOwnership) {
      results.ownershipVerification = await this.ownershipService.verifyOwnership(
        params.verifyOwnership.assetId,
        params.verifyOwnership.username
      );
    }

    // Get recommendations if requested
    if (params.includeRecommendations) {
      results.recommendations = await this.discoveryService.getRecommendations(
        params.includeRecommendations.username,
        params.includeRecommendations.context
      );
    }

    return results;
  }
}

/**
 * Convenience function to get the asset service manager
 */
export function getAssetServiceManager(): AssetServiceManager {
  return AssetServiceManager.getInstance();
}

/**
 * Service initialization utility
 */
export async function initializeAssetServices(): Promise<void> {
  // Initialize all services
  AssetCreationService.getInstance();
  AssetOwnershipService.getInstance();
  AssetDiscoveryService.getInstance();
  
  // Get the manager to ensure all services are connected
  AssetServiceManager.getInstance();
}

/**
 * Service health check utility
 */
export async function checkAssetServicesHealth(): Promise<{
  healthy: boolean;
  services: {
    creation: boolean;
    ownership: boolean;
    discovery: boolean;
  };
  issues?: string[];
}> {
  const issues: string[] = [];
  const services = {
    creation: true,
    ownership: true,
    discovery: true
  };

  try {
    // Check creation service
    const creationStats = AssetCreationService.getInstance().getCreationStatistics();
    if (!creationStats) {
      services.creation = false;
      issues.push('Creation service statistics unavailable');
    }
  } catch (error) {
    services.creation = false;
    issues.push(`Creation service error: ${error}`);
  }

  try {
    // Check ownership service
    const ownershipStats = AssetOwnershipService.getInstance().getOwnershipStatistics();
    if (!ownershipStats) {
      services.ownership = false;
      issues.push('Ownership service statistics unavailable');
    }
  } catch (error) {
    services.ownership = false;
    issues.push(`Ownership service error: ${error}`);
  }

  try {
    // Check discovery service
    const discoveryStats = AssetDiscoveryService.getInstance().getDiscoveryStatistics();
    if (!discoveryStats) {
      services.discovery = false;
      issues.push('Discovery service statistics unavailable');
    }
  } catch (error) {
    services.discovery = false;
    issues.push(`Discovery service error: ${error}`);
  }

  const healthy = services.creation && services.ownership && services.discovery;

  return {
    healthy,
    services,
    issues: issues.length > 0 ? issues : undefined
  };
}