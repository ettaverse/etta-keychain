import { KeychainError } from '../../../src/keychain-error';

export class ErrorUtils {
  static parse(error: any): Error {
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    if (error.message) {
      return new KeychainError(error.message, error.data);
    }
    
    return new Error('Unknown error occurred');
  }
}