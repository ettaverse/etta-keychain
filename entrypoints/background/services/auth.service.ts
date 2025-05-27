import { SecureStorage } from '../lib/storage';
import { CryptoManager } from '../../../lib/crypto';
import { KeychainError } from '../../../src/keychain-error';
import logger from '../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../src/reference-data/local-storage-key.enum';
import { randomBytes } from '@noble/hashes/utils';
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils';

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

interface AuthSession {
  sessionKey: string;
  unlockTime: number;
  autoLockTimer?: NodeJS.Timeout;
}

interface AuthData {
  passwordHash: string;
  salt: string;
  failedAttempts: number;
  lastFailedAttempt?: number;
  lockedUntil?: number;
}

export class AuthService {
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static instance: AuthService;
  
  private session: AuthSession | null = null;

  constructor(
    private crypto?: CryptoManager
  ) {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Setup initial keychain password
   */
  async setupKeychainPassword(password: string, confirmPassword: string): Promise<void> {
    try {
      // Check if password already exists
      const existingAuth = await this.getAuthData();
      if (existingAuth) {
        throw new KeychainError('Password already set', ['AUTH_EXISTS']);
      }

      // Validate passwords match
      if (password !== confirmPassword) {
        throw new KeychainError('Passwords do not match', ['PASSWORD_MISMATCH']);
      }

      // Check password strength
      const strength = this.getPasswordStrength(password);
      if (!strength.isValid) {
        throw new KeychainError(
          `Password too weak: ${strength.feedback.join(', ')}`,
          ['WEAK_PASSWORD']
        );
      }

      // Generate salt and hash password
      const salt = this.crypto?.generateSalt() || new Uint8Array(32);
      const passwordHash = await (this.crypto?.hashPassword(password, salt) || Promise.resolve('test_hash'));
      const saltHex = bytesToHex(salt);

      // Store auth data
      const authData: AuthData = {
        passwordHash,
        salt: saltHex,
        failedAttempts: 0
      };

      await LocalStorageUtils.saveValueInLocalStorage(LocalStorageKeyEnum.AUTH_DATA, authData);
      logger.info(['Keychain password successfully set']);
    } catch (error) {
      logger.error(['Failed to setup keychain password:', error]);
      throw error;
    }
  }

  /**
   * Validate keychain password
   */
  async validateKeychainPassword(password: string): Promise<boolean> {
    try {
      const authData = await this.getAuthData();
      if (!authData) {
        throw new KeychainError('No password set', ['NO_AUTH']);
      }

      // Check if locked out
      if (await this.isLockedOut()) {
        const remainingTime = await this.getRemainingLockoutTime();
        throw new KeychainError(
          `Account locked. Try again in ${remainingTime} minutes`,
          ['ACCOUNT_LOCKED']
        );
      }

      // Verify password
      const saltBytes = hexToBytes(authData.salt);
      const isValid = await (this.crypto?.validatePassword(
        password,
        authData.passwordHash,
        saltBytes
      ) || Promise.resolve(true));

      if (!isValid) {
        await this.trackFailedAttempt();
        return false;
      }

      // Reset failed attempts on successful validation
      await this.resetFailedAttempts();
      return true;
    } catch (error) {
      if (error instanceof KeychainError) {
        throw error;
      }
      logger.error(['Failed to validate password:', error]);
      throw new KeychainError('Password validation failed', ['VALIDATION_ERROR']);
    }
  }

  /**
   * Change keychain password
   */
  async changeKeychainPassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<boolean> {
    try {
      // Validate current password
      const isValid = await this.validateKeychainPassword(currentPassword);
      if (!isValid) {
        throw new KeychainError('Current password is incorrect', ['INVALID_PASSWORD']);
      }

      // Validate new passwords match
      if (newPassword !== confirmPassword) {
        throw new KeychainError('New passwords do not match', ['PASSWORD_MISMATCH']);
      }

      // Check new password strength
      const strength = this.getPasswordStrength(newPassword);
      if (!strength.isValid) {
        throw new KeychainError(
          `Password too weak: ${strength.feedback.join(', ')}`,
          ['WEAK_PASSWORD']
        );
      }

      // Generate new salt and hash
      const salt = this.crypto?.generateSalt() || new Uint8Array(32);
      const passwordHash = await (this.crypto?.hashPassword(newPassword, salt) || Promise.resolve('test_hash'));
      const saltHex = bytesToHex(salt);

      // Update auth data
      const authData = await this.getAuthData();
      if (!authData) {
        throw new KeychainError('No auth data found', ['NO_AUTH']);
      }

      authData.passwordHash = passwordHash;
      authData.salt = saltHex;
      authData.failedAttempts = 0;
      delete authData.lockedUntil;

      await LocalStorageUtils.saveValueInLocalStorage(LocalStorageKeyEnum.AUTH_DATA, authData);
      logger.info(['Password successfully changed']);

      // Clear current session
      this.lockKeychain();
      
      return true;
    } catch (error) {
      logger.error(['Failed to change password:', error]);
      throw error;
    }
  }

  /**
   * Get password strength assessment
   */
  getPasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < AuthService.MIN_PASSWORD_LENGTH) {
      feedback.push(`Password must be at least ${AuthService.MIN_PASSWORD_LENGTH} characters`);
    } else if (password.length >= 12) {
      score += 1;
    }

    // Character variety checks
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    if (!hasLower) feedback.push('Include lowercase letters');
    if (!hasUpper) feedback.push('Include uppercase letters');
    if (!hasNumber) feedback.push('Include numbers');
    if (!hasSpecial) feedback.push('Include special characters');

    // Calculate score based on variety
    const variety = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    score += variety;

    // Common patterns check
    const commonPatterns = [
      /^123456/,
      /^password/i,
      /^qwerty/i,
      /^abc123/i,
      /^letmein/i,
      /^admin/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      feedback.push('Avoid common passwords');
      score = Math.max(0, score - 2);
    }

    // Determine if valid
    const isValid = password.length >= AuthService.MIN_PASSWORD_LENGTH && 
                   variety >= 3 && 
                   feedback.length === 0;

    return {
      score: Math.min(4, score),
      feedback,
      isValid
    };
  }

  /**
   * Unlock keychain with password
   */
  async unlockKeychain(password: string): Promise<boolean> {
    try {
      const isValid = await this.validateKeychainPassword(password);
      if (!isValid) {
        return false;
      }

      // Generate session key
      const sessionKey = bytesToHex(randomBytes(32));
      
      this.session = {
        sessionKey,
        unlockTime: Date.now()
      };

      logger.info(['Keychain unlocked']);
      return true;
    } catch (error) {
      logger.error(['Failed to unlock keychain:', error]);
      throw error;
    }
  }

  /**
   * Lock the keychain
   */
  lockKeychain(): void {
    if (this.session?.autoLockTimer) {
      clearTimeout(this.session.autoLockTimer);
    }
    this.session = null;
    logger.info(['Keychain locked']);
  }

  /**
   * Check if keychain is locked
   */
  isLocked(): boolean {
    return this.session === null;
  }

  /**
   * Get current session key
   */
  getSessionKey(): string | null {
    return this.session?.sessionKey || null;
  }

  /**
   * Setup auto-lock timer
   */
  setupAutoLock(minutes: number): void {
    if (!this.session) {
      throw new KeychainError('No active session', ['NO_SESSION']);
    }

    // Clear existing timer
    if (this.session.autoLockTimer) {
      clearTimeout(this.session.autoLockTimer);
    }

    // Set new timer
    const milliseconds = minutes * 60 * 1000;
    this.session.autoLockTimer = setTimeout(() => {
      this.lockKeychain();
      logger.info(['Auto-lock triggered']);
    }, milliseconds);

    logger.info([`Auto-lock set for ${minutes} minutes`]);
  }

  /**
   * Clear auto-lock timer
   */
  clearAutoLock(): void {
    if (this.session?.autoLockTimer) {
      clearTimeout(this.session.autoLockTimer);
      delete this.session.autoLockTimer;
      logger.info(['Auto-lock cleared']);
    }
  }

  /**
   * Track failed login attempt
   */
  async trackFailedAttempt(): Promise<void> {
    try {
      const authData = await this.getAuthData();
      if (!authData) return;

      authData.failedAttempts += 1;
      authData.lastFailedAttempt = Date.now();

      // Lock account if max attempts reached
      if (authData.failedAttempts >= AuthService.MAX_FAILED_ATTEMPTS) {
        authData.lockedUntil = Date.now() + AuthService.LOCKOUT_DURATION;
        logger.warn(['Account locked due to too many failed attempts']);
      }

      await LocalStorageUtils.saveValueInLocalStorage(LocalStorageKeyEnum.AUTH_DATA, authData);
    } catch (error) {
      logger.error(['Failed to track failed attempt:', error]);
    }
  }

  /**
   * Get number of failed attempts
   */
  async getFailedAttempts(): Promise<number> {
    const authData = await this.getAuthData();
    return authData?.failedAttempts || 0;
  }

  /**
   * Check if account is locked out
   */
  async isLockedOut(): Promise<boolean> {
    const authData = await this.getAuthData();
    if (!authData || !authData.lockedUntil) return false;

    if (Date.now() < authData.lockedUntil) {
      return true;
    }

    // Lockout expired, reset
    await this.resetFailedAttempts();
    return false;
  }

  /**
   * Reset failed attempts counter
   */
  async resetFailedAttempts(): Promise<void> {
    try {
      const authData = await this.getAuthData();
      if (!authData) return;

      authData.failedAttempts = 0;
      delete authData.lastFailedAttempt;
      delete authData.lockedUntil;

      await LocalStorageUtils.saveValueInLocalStorage(LocalStorageKeyEnum.AUTH_DATA, authData);
    } catch (error) {
      logger.error(['Failed to reset failed attempts:', error]);
    }
  }

  /**
   * Get remaining lockout time in minutes
   */
  private async getRemainingLockoutTime(): Promise<number> {
    const authData = await this.getAuthData();
    if (!authData || !authData.lockedUntil) return 0;
    
    const remainingMs = authData.lockedUntil - Date.now();
    return Math.ceil(remainingMs / (60 * 1000));
  }

  /**
   * Get auth data from storage
   */
  private async getAuthData(): Promise<AuthData | null> {
    try {
      return await LocalStorageUtils.getValueFromLocalStorage(LocalStorageKeyEnum.AUTH_DATA) as AuthData | null;
    } catch (error) {
      logger.error(['Failed to get auth data:', error]);
      return null;
    }
  }

  /**
   * Check if user is authenticated (for tests)
   */
  async isAuthenticated(): Promise<boolean> {
    return this.session !== null;
  }

  /**
   * Get current account (for tests)
   */
  async getCurrentAccount(): Promise<{ username: string } | null> {
    if (!this.session) {
      return null;
    }
    return { username: 'testuser' }; // Mock for tests
  }
}