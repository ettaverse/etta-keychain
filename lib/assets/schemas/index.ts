/**
 * Asset System Validation Schemas
 * 
 * This module exports all Zod validation schemas for the Multi-Level Asset System.
 * These schemas provide runtime validation, type safety, and data consistency
 * across the entire asset management pipeline.
 */

// Core asset validation schemas
export * from './asset-validation.schema';

// Cross-game functionality validation schemas
export * from './cross-game-validation.schema';

/**
 * Validation utility functions
 */
import { ZodError, ZodSchema } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Generic validation function that can be used with any Zod schema
 */
export function validateWithSchema<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      };
    }
    
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: 'Unknown validation error',
        code: 'unknown'
      }]
    };
  }
}

/**
 * Safe validation function that returns a result object instead of throwing
 */
export function safeValidate<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ZodError } {
  const result = schema.safeParse(data);
  return result;
}

/**
 * Validation middleware function for use in API handlers
 */
export function createValidationMiddleware<T>(schema: ZodSchema<T>) {
  return (data: unknown): T => {
    const result = schema.parse(data);
    return result;
  };
}

/**
 * Batch validation function for validating arrays of data
 */
export function validateBatch<T>(
  schema: ZodSchema<T>,
  dataArray: unknown[]
): ValidationResult<T[]> {
  const results: T[] = [];
  const errors: ValidationError[] = [];
  
  dataArray.forEach((data, index) => {
    const validation = validateWithSchema(schema, data);
    if (validation.success && validation.data) {
      results.push(validation.data);
    } else if (validation.errors) {
      errors.push(...validation.errors.map(err => ({
        ...err,
        field: `[${index}].${err.field}`
      })));
    }
  });
  
  if (errors.length > 0) {
    return {
      success: false,
      errors
    };
  }
  
  return {
    success: true,
    data: results
  };
}

/**
 * Validation configuration
 */
export const ValidationConfig = {
  // Maximum length for text fields
  maxTextLength: {
    name: 100,
    description: 1000,
    memo: 500,
    tag: 30
  },
  
  // Maximum array sizes
  maxArraySizes: {
    tags: 20,
    abilities: 50,
    restrictions: 20,
    compatibleGames: 100,
    sourceAssets: 10
  },
  
  // Numeric ranges
  ranges: {
    powerTier: { min: 0, max: 100 },
    essenceScore: { min: 0, max: 1000 },
    royaltyPercentage: { min: 0, max: 100 },
    contributionWeight: { min: 0, max: 1 },
    compatibilityScore: { min: 0, max: 1 },
    successRate: { min: 0, max: 1 }
  },
  
  // Regex patterns
  patterns: {
    amount: /^\d+(\.\d{1,8})?$/,
    username: /^[a-z][a-z0-9\-\.]{2,15}$/,
    assetId: /^[a-z0-9_\-]+$/,
    gameId: /^[a-z0-9_\-]+$/,
    domainId: /^[a-z0-9_\-]+$/
  }
} as const;