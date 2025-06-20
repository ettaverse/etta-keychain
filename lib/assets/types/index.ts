/**
 * Multi-Level Asset System Types
 * 
 * This module exports all types and interfaces for the Multi-Level Asset System,
 * which enables Web2-to-Web3 asset bridging across multiple domains, games, and
 * applications on the STEEM blockchain.
 */

// Core Universal Asset Types
export * from './universal-asset.interface';

// Game Variant and Cross-Game Types  
export * from './game-variant.interface';

// Asset Filtering and Search Types
export * from './asset-filters.interface';

// Cross-Game Functionality Types
export * from './cross-game.interface';

// Type Utilities and Helpers
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Common Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    request_id: string;
    timestamp: string;
    processing_time_ms: number;
    rate_limit?: {
      remaining: number;
      reset_time: string;
    };
  };
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
  trace_id?: string;
}

export enum ErrorCode {
  // General Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Asset Errors
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  ASSET_NOT_OWNED = 'ASSET_NOT_OWNED',
  ASSET_NOT_TRADEABLE = 'ASSET_NOT_TRADEABLE',
  ASSET_ALREADY_EXISTS = 'ASSET_ALREADY_EXISTS',
  ASSET_CREATION_FAILED = 'ASSET_CREATION_FAILED',
  ASSET_UPDATE_FAILED = 'ASSET_UPDATE_FAILED',
  
  // Game Errors
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  GAME_NOT_SUPPORTED = 'GAME_NOT_SUPPORTED',
  GAME_NOT_ACTIVE = 'GAME_NOT_ACTIVE',
  VARIANT_NOT_FOUND = 'VARIANT_NOT_FOUND',
  VARIANT_NOT_COMPATIBLE = 'VARIANT_NOT_COMPATIBLE',
  VARIANT_CREATION_FAILED = 'VARIANT_CREATION_FAILED',
  
  // Cross-Game Errors
  CONVERSION_NOT_SUPPORTED = 'CONVERSION_NOT_SUPPORTED',
  CONVERSION_REQUIREMENTS_NOT_MET = 'CONVERSION_REQUIREMENTS_NOT_MET',
  CONVERSION_FAILED = 'CONVERSION_FAILED',
  COMPATIBILITY_CHECK_FAILED = 'COMPATIBILITY_CHECK_FAILED',
  FUSION_NOT_POSSIBLE = 'FUSION_NOT_POSSIBLE',
  FUSION_FAILED = 'FUSION_FAILED',
  
  // Financial Errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_PRICE = 'INVALID_PRICE',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  ROYALTY_CALCULATION_ERROR = 'ROYALTY_CALCULATION_ERROR',
  
  // Blockchain Errors
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CUSTOM_JSON_ERROR = 'CUSTOM_JSON_ERROR',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  
  // User Errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_UNAUTHORIZED = 'USER_UNAUTHORIZED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  REPUTATION_TOO_LOW = 'REPUTATION_TOO_LOW',
  
  // System Errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // Validation Errors
  INVALID_ASSET_DATA = 'INVALID_ASSET_DATA',
  INVALID_GAME_VARIANT = 'INVALID_GAME_VARIANT',
  INVALID_ESSENCE_DATA = 'INVALID_ESSENCE_DATA',
  INVALID_CONVERSION_REQUEST = 'INVALID_CONVERSION_REQUEST',
  INVALID_FUSION_REQUEST = 'INVALID_FUSION_REQUEST'
}

// Pagination Helper Types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  page_size: number;
  total_items: number;
  has_next: boolean;
  has_previous: boolean;
}

// Price/Currency Types
export interface Price {
  amount: string;              // String to handle large numbers and decimals
  currency: string;            // Currency code (STEEM, SBD, USD, etc.)
}

export interface PriceRange {
  min: Price;
  max: Price;
}

// Timestamp Types
export type ISOTimestamp = string;
export type UnixTimestamp = number;

// ID Types
export type UniversalAssetId = string;
export type GameId = string;
export type DomainId = string;
export type UserId = string;
export type TransactionId = string;

// Configuration Types
export interface AssetSystemConfig {
  // Feature Flags
  features: {
    cross_game_conversion: boolean;
    asset_fusion: boolean;
    tournaments: boolean;
    marketplace: boolean;
    web2_integration: boolean;
  };
  
  // Limits and Constraints
  limits: {
    max_assets_per_user: number;
    max_variants_per_asset: number;
    max_conversions_per_day: number;
    max_fusion_participants: number;
  };
  
  // Economic Settings
  economics: {
    default_royalty_percentage: number;
    max_royalty_percentage: number;
    transaction_fees: Record<string, Price>;
    conversion_base_cost: Price;
  };
  
  // System Settings
  system: {
    supported_currencies: string[];
    default_currency: string;
    blockchain_network: 'steem' | 'steem_testnet';
    confirmation_blocks: number;
  };
}

// Event Types for real-time updates
export interface AssetEvent {
  event_id: string;
  event_type: 'asset_created' | 'asset_transferred' | 'asset_converted' | 'asset_updated' | 'variant_added';
  timestamp: ISOTimestamp;
  universal_id: UniversalAssetId;
  data: Record<string, any>;
  affected_users: UserId[];
}

// Validation Result Types
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  recommendation?: string;
}