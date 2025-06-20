/**
 * Asset ID Generator - Generates unique universal asset IDs
 * 
 * Creates deterministic yet unique identifiers for universal assets
 * based on domain, game, and asset properties.
 */

import { createHash, randomBytes } from 'crypto';

export class AssetIdGenerator {
  private readonly PREFIX_MAP: Record<string, string> = {
    'gaming': 'gam',
    'music': 'mus',
    'collectibles': 'col',
    'art': 'art',
    'media': 'med',
    'utility': 'utl',
    'social': 'soc'
  };

  private readonly ARCHETYPE_CODES: Record<string, string> = {
    'dragon': 'drg',
    'phoenix': 'phx',
    'unicorn': 'unc',
    'sword': 'swd',
    'staff': 'stf',
    'bow': 'bow',
    'shield': 'shd',
    'armor': 'arm',
    'potion': 'pot',
    'scroll': 'scr',
    'gem': 'gem',
    'crystal': 'cry',
    'song': 'sng',
    'story': 'str',
    'painting': 'pnt',
    'sculpture': 'scp'
  };

  /**
   * Generates a universal asset ID
   * Format: {domain_prefix}_{archetype_code}_{hash}_{sequence}
   * Example: gam_drg_a4b7c9_001
   */
  async generateUniversalId(
    domain: string,
    gameId: string,
    assetName: string,
    archetype?: string,
    sequence?: number
  ): Promise<string> {
    // Get domain prefix
    const domainPrefix = this.PREFIX_MAP[domain.toLowerCase()] || domain.slice(0, 3).toLowerCase();
    
    // Get archetype code
    const archetypeCode = archetype 
      ? (this.ARCHETYPE_CODES[archetype.toLowerCase()] || archetype.slice(0, 3).toLowerCase())
      : 'gen'; // generic
    
    // Create hash from name and game
    const hashInput = `${assetName.toLowerCase().replace(/\s+/g, '_')}_${gameId}_${Date.now()}`;
    const hash = createHash('sha256').update(hashInput).digest('hex').slice(0, 6);
    
    // Generate sequence number
    const sequenceNum = sequence !== undefined 
      ? sequence.toString().padStart(3, '0')
      : await this.generateSequenceNumber(domainPrefix, archetypeCode);
    
    return `${domainPrefix}_${archetypeCode}_${hash}_${sequenceNum}`;
  }

  /**
   * Generates a shorter asset ID for internal use
   * Format: {prefix}{hash}{sequence}
   * Example: gdr4b7c9001
   */
  generateShortId(
    domain: string,
    archetype: string,
    assetName: string,
    sequence?: number
  ): string {
    const domainChar = domain.charAt(0).toLowerCase();
    const archetypeChars = archetype.slice(0, 2).toLowerCase();
    
    const hashInput = `${assetName.toLowerCase()}_${Date.now()}`;
    const hash = createHash('md5').update(hashInput).digest('hex').slice(0, 6);
    
    const seq = sequence?.toString().padStart(3, '0') || this.generateRandomSequence();
    
    return `${domainChar}${archetypeChars}${hash}${seq}`;
  }

  /**
   * Generates a human-readable asset ID
   * Format: {domain}_{clean_name}_{year}_{sequence}
   * Example: gaming_fire_dragon_2024_001
   */
  generateReadableId(
    domain: string,
    assetName: string,
    sequence?: number
  ): string {
    const cleanDomain = domain.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = this.cleanAssetName(assetName);
    const year = new Date().getFullYear();
    const seq = sequence?.toString().padStart(3, '0') || '001';
    
    return `${cleanDomain}_${cleanName}_${year}_${seq}`;
  }

  /**
   * Generates a universally unique ID (UUID-like) for assets
   */
  generateUUID(): string {
    // Generate a UUID v4-like string
    const bytes = randomBytes(16);
    
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    const hex = bytes.toString('hex');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
  }

  /**
   * Validates an asset ID format
   */
  validateAssetId(assetId: string, type: 'universal' | 'short' | 'readable' | 'uuid' = 'universal'): {
    valid: boolean;
    format: string;
    errors: string[];
  } {
    const errors: string[] = [];
    
    switch (type) {
      case 'universal':
        return this.validateUniversalId(assetId);
      case 'short':
        return this.validateShortId(assetId);
      case 'readable':
        return this.validateReadableId(assetId);
      case 'uuid':
        return this.validateUUID(assetId);
      default:
        errors.push(`Unknown ID type: ${type}`);
        return { valid: false, format: type, errors };
    }
  }

  /**
   * Extracts information from a universal asset ID
   */
  parseUniversalId(assetId: string): {
    domain: string;
    archetype: string;
    hash: string;
    sequence: string;
    valid: boolean;
  } {
    const parts = assetId.split('_');
    
    if (parts.length !== 4) {
      return {
        domain: '',
        archetype: '',
        hash: '',
        sequence: '',
        valid: false
      };
    }
    
    const [domainPrefix, archetypeCode, hash, sequence] = parts;
    
    // Reverse lookup domain
    const domain = Object.entries(this.PREFIX_MAP).find(([_, prefix]) => prefix === domainPrefix)?.[0] || domainPrefix;
    
    // Reverse lookup archetype
    const archetype = Object.entries(this.ARCHETYPE_CODES).find(([_, code]) => code === archetypeCode)?.[0] || archetypeCode;
    
    return {
      domain,
      archetype,
      hash,
      sequence,
      valid: this.validateUniversalId(assetId).valid
    };
  }

  /**
   * Generates a deterministic ID based on content hash
   */
  generateDeterministicId(
    domain: string,
    content: Record<string, any>,
    salt?: string
  ): string {
    const contentString = JSON.stringify(content, Object.keys(content).sort());
    const input = `${domain}_${contentString}_${salt || ''}`;
    const hash = createHash('sha256').update(input).digest('hex');
    
    const domainPrefix = this.PREFIX_MAP[domain.toLowerCase()] || domain.slice(0, 3);
    return `${domainPrefix}_det_${hash.slice(0, 8)}_${hash.slice(-4)}`;
  }

  /**
   * Checks if an asset ID is unique (placeholder - would need database integration)
   */
  async checkUniqueness(assetId: string): Promise<boolean> {
    // In production, this would check against the asset registry
    // For now, return true (assume unique)
    return true;
  }

  /**
   * Suggests alternative IDs if the preferred one is taken
   */
  async suggestAlternatives(
    baseId: string,
    count: number = 5
  ): Promise<string[]> {
    const alternatives: string[] = [];
    
    for (let i = 1; i <= count; i++) {
      // Add suffix to base ID
      alternatives.push(`${baseId}_${i.toString().padStart(2, '0')}`);
    }
    
    // Generate some variations with different sequences
    const parsed = this.parseUniversalId(baseId);
    if (parsed.valid) {
      for (let i = 1; i <= count; i++) {
        const newSequence = (parseInt(parsed.sequence) + i).toString().padStart(3, '0');
        alternatives.push(`${parsed.domain}_${parsed.archetype}_${parsed.hash}_${newSequence}`);
      }
    }
    
    return alternatives;
  }

  /**
   * Generates a sequence number (placeholder - would need database integration)
   */
  private async generateSequenceNumber(domainPrefix: string, archetypeCode: string): Promise<string> {
    // In production, this would query the database for the next sequence number
    // For now, generate a random 3-digit number
    return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  /**
   * Generates a random 3-digit sequence
   */
  private generateRandomSequence(): string {
    return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  /**
   * Cleans asset name for use in IDs
   */
  private cleanAssetName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .slice(0, 20); // Limit length
  }

  /**
   * Validates universal ID format
   */
  private validateUniversalId(assetId: string): {
    valid: boolean;
    format: string;
    errors: string[];
  } {
    const errors: string[] = [];
    const format = 'universal';
    
    // Check basic format: prefix_code_hash_sequence
    const pattern = /^[a-z]{2,3}_[a-z]{2,3}_[a-f0-9]{6}_\d{3}$/;
    
    if (!pattern.test(assetId)) {
      errors.push('Invalid universal ID format. Expected: {domain}_{archetype}_{hash}_{sequence}');
    }
    
    const parts = assetId.split('_');
    if (parts.length !== 4) {
      errors.push('Universal ID must have exactly 4 parts separated by underscores');
    }
    
    if (parts[0] && parts[0].length < 2 || parts[0].length > 3) {
      errors.push('Domain prefix must be 2-3 characters');
    }
    
    if (parts[1] && parts[1].length < 2 || parts[1].length > 3) {
      errors.push('Archetype code must be 2-3 characters');
    }
    
    if (parts[2] && parts[2].length !== 6) {
      errors.push('Hash must be exactly 6 characters');
    }
    
    if (parts[3] && parts[3].length !== 3) {
      errors.push('Sequence must be exactly 3 digits');
    }
    
    return { valid: errors.length === 0, format, errors };
  }

  /**
   * Validates short ID format
   */
  private validateShortId(assetId: string): {
    valid: boolean;
    format: string;
    errors: string[];
  } {
    const errors: string[] = [];
    const format = 'short';
    
    // Check format: {1char}{2chars}{6hex}{3digits}
    const pattern = /^[a-z][a-z]{2}[a-f0-9]{6}\d{3}$/;
    
    if (!pattern.test(assetId)) {
      errors.push('Invalid short ID format. Expected: {domain_char}{archetype_chars}{hash}{sequence}');
    }
    
    if (assetId.length !== 12) {
      errors.push('Short ID must be exactly 12 characters');
    }
    
    return { valid: errors.length === 0, format, errors };
  }

  /**
   * Validates readable ID format
   */
  private validateReadableId(assetId: string): {
    valid: boolean;
    format: string;
    errors: string[];
  } {
    const errors: string[] = [];
    const format = 'readable';
    
    // Check format: domain_name_year_sequence
    const pattern = /^[a-z0-9]+_[a-z0-9_]+_\d{4}_\d{3}$/;
    
    if (!pattern.test(assetId)) {
      errors.push('Invalid readable ID format. Expected: {domain}_{name}_{year}_{sequence}');
    }
    
    const parts = assetId.split('_');
    if (parts.length < 4) {
      errors.push('Readable ID must have at least 4 parts');
    }
    
    // Check year format
    const yearPart = parts[parts.length - 2];
    if (yearPart && !/^\d{4}$/.test(yearPart)) {
      errors.push('Year must be 4 digits');
    }
    
    // Check sequence format
    const sequencePart = parts[parts.length - 1];
    if (sequencePart && !/^\d{3}$/.test(sequencePart)) {
      errors.push('Sequence must be 3 digits');
    }
    
    return { valid: errors.length === 0, format, errors };
  }

  /**
   * Validates UUID format
   */
  private validateUUID(assetId: string): {
    valid: boolean;
    format: string;
    errors: string[];
  } {
    const errors: string[] = [];
    const format = 'uuid';
    
    // Check UUID v4 format
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!pattern.test(assetId)) {
      errors.push('Invalid UUID format. Expected: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
    }
    
    return { valid: errors.length === 0, format, errors };
  }
}