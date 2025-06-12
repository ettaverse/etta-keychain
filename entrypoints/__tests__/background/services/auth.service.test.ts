import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthService } from '../../../background/services/auth.service';
import { CryptoManager } from '../../../../lib/crypto';
import { KeychainError } from '../../../../src/keychain-error';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils';

// Mock dependencies
vi.mock('../../../../lib/crypto');
vi.mock('../../../../src/utils/logger.utils', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('../../../../src/utils/localStorage.utils', () => ({
  default: {
    getValueFromLocalStorage: vi.fn(),
    saveValueInLocalStorage: vi.fn(),
    removeValueFromLocalStorage: vi.fn(),
    getValueFromSessionStorage: vi.fn(),
    saveValueInSessionStorage: vi.fn(),
    removeValueFromSessionStorage: vi.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockCrypto: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock instances    
    mockCrypto = {
      generateSalt: vi.fn(),
      hashPassword: vi.fn(),
      validatePassword: vi.fn(),
      encryptData: vi.fn(),
      decryptData: vi.fn(),
    };
    
    authService = new AuthService(mockCrypto);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setupKeychainPassword', () => {
    it('should set up a new password successfully', async () => {
      const password = 'TestPassword123!';
      const salt = new Uint8Array(32).fill(1);
      const hash = 'hashedpassword';

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(null);
      mockCrypto.generateSalt.mockReturnValue(salt);
      mockCrypto.hashPassword.mockResolvedValue(hash);
      (LocalStorageUtils.saveValueInLocalStorage as any).mockResolvedValue(undefined);

      await authService.setupKeychainPassword(password, password);

      expect((LocalStorageUtils.saveValueInLocalStorage as any)).toHaveBeenCalledWith(expect.anything(), {
        passwordHash: hash,
        salt: bytesToHex(salt),
        failedAttempts: 0,
      });
    });

    it('should throw error if password already exists', async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue({
        passwordHash: 'existing',
        salt: 'existing',
        failedAttempts: 0,
      });

      await expect(
        authService.setupKeychainPassword('password', 'password')
      ).rejects.toThrow('Password already set');
    });

    it('should throw error if passwords do not match', async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(null);

      await expect(
        authService.setupKeychainPassword('password1', 'password2')
      ).rejects.toThrow('Passwords do not match');
    });

    it('should throw error if password is too weak', async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(null);

      await expect(
        authService.setupKeychainPassword('weak', 'weak')
      ).rejects.toThrow('Password too weak');
    });
  });

  describe('validateKeychainPassword', () => {
    const authData = {
      passwordHash: 'hash',
      salt: bytesToHex(new Uint8Array(32).fill(1)),
      failedAttempts: 0,
    };

    it('should validate correct password', async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);
      mockCrypto.validatePassword.mockResolvedValue(true);
      (LocalStorageUtils.saveValueInLocalStorage as any).mockResolvedValue(undefined);

      const result = await authService.validateKeychainPassword('password');

      expect(result).toBe(true);
      expect(mockCrypto.validatePassword).toHaveBeenCalledWith(
        'password', 
        'hash', 
        hexToBytes(authData.salt)
      );
    });

    it('should return false for incorrect password', async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);
      mockCrypto.validatePassword.mockResolvedValue(false);

      const result = await authService.validateKeychainPassword('wrong');

      expect(result).toBe(false);
    });

    it('should throw error if no password is set', async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(null);

      await expect(
        authService.validateKeychainPassword('password')
      ).rejects.toThrow('No password set');
    });

    it('should throw error if account is locked', async () => {
      const lockedData = {
        ...authData,
        failedAttempts: 5,
        lockedUntil: Date.now() + 30 * 60 * 1000,
      };
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(lockedData);

      await expect(
        authService.validateKeychainPassword('password')
      ).rejects.toThrow('Account locked');
    });
  });

  describe('changeKeychainPassword', () => {
    const authData = {
      passwordHash: 'oldhash',
      salt: bytesToHex(new Uint8Array(32).fill(1)),
      failedAttempts: 0,
    };

    it('should change password successfully', async () => {
      const newSalt = new Uint8Array(32).fill(2);
      const newHash = 'newhash';

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);
      mockCrypto.validatePassword.mockResolvedValue(true);
      mockCrypto.generateSalt.mockReturnValue(newSalt);
      mockCrypto.hashPassword.mockResolvedValue(newHash);
      (LocalStorageUtils.saveValueInLocalStorage as any).mockResolvedValue(undefined);

      const result = await authService.changeKeychainPassword(
        'oldPassword',
        'NewPassword123!',
        'NewPassword123!'
      );

      expect(result).toBe(true);
      expect((LocalStorageUtils.saveValueInLocalStorage as any)).toHaveBeenCalledWith(expect.anything(), {
        passwordHash: newHash,
        salt: bytesToHex(newSalt),
        failedAttempts: 0,
      });
    });

    it('should throw error if current password is incorrect', async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);
      mockCrypto.validatePassword.mockResolvedValue(false);

      await expect(
        authService.changeKeychainPassword('wrong', 'new', 'new')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error if new passwords do not match', async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);
      mockCrypto.validatePassword.mockResolvedValue(true);

      await expect(
        authService.changeKeychainPassword('old', 'new1', 'new2')
      ).rejects.toThrow('New passwords do not match');
    });
  });

  describe('getPasswordStrength', () => {
    it('should return weak score for short password', () => {
      const result = authService.getPasswordStrength('short');

      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must be at least 8 characters');
    });

    it('should return strong score for complex password', () => {
      const result = authService.getPasswordStrength('ComplexPass123!@#');

      expect(result.isValid).toBe(true);
      expect(result.feedback).toHaveLength(0);
      expect(result.score).toBeGreaterThan(2);
    });

    it('should detect missing character types', () => {
      const result = authService.getPasswordStrength('onlylowercase');

      expect(result.feedback).toContain('Include uppercase letters');
      expect(result.feedback).toContain('Include numbers');
      expect(result.feedback).toContain('Include special characters');
    });

    it('should detect common passwords', () => {
      const result = authService.getPasswordStrength('password123');

      expect(result.feedback).toContain('Avoid common passwords');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Session Management', () => {
    describe('unlockKeychain', () => {
      it('should unlock keychain with valid password', async () => {
        const authData = {
          passwordHash: 'hash',
          salt: bytesToHex(new Uint8Array(32).fill(1)),
          failedAttempts: 0,
        };

        (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);
        mockCrypto.validatePassword.mockResolvedValue(true);
        (LocalStorageUtils.saveValueInLocalStorage as any).mockResolvedValue(undefined);

        const result = await authService.unlockKeychain('password');

        expect(result).toBe(true);
        expect(authService.isLocked()).toBe(false);
        expect(authService.getSessionKey()).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should not unlock with invalid password', async () => {
        const authData = {
          passwordHash: 'hash',
          salt: bytesToHex(new Uint8Array(32).fill(1)),
          failedAttempts: 0,
        };

        (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);
        mockCrypto.validatePassword.mockResolvedValue(false);

        const result = await authService.unlockKeychain('wrong');

        expect(result).toBe(false);
        expect(authService.isLocked()).toBe(true);
      });
    });

    describe('lockKeychain', () => {
      it('should lock keychain and clear session', async () => {
        // First unlock
        const authData = {
          passwordHash: 'hash',
          salt: bytesToHex(new Uint8Array(32).fill(1)),
          failedAttempts: 0,
        };

        (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);
        mockCrypto.validatePassword.mockResolvedValue(true);
        (LocalStorageUtils.saveValueInLocalStorage as any).mockResolvedValue(undefined);

        await authService.unlockKeychain('password');
        expect(authService.isLocked()).toBe(false);

        // Then lock
        authService.lockKeychain();

        expect(authService.isLocked()).toBe(true);
        expect(authService.getSessionKey()).toBe(null);
      });
    });

    describe('Auto-lock', () => {
      it('should setup auto-lock timer', async () => {
        vi.useFakeTimers();

        // Unlock first
        const authData = {
          passwordHash: 'hash',
          salt: bytesToHex(new Uint8Array(32).fill(1)),
          failedAttempts: 0,
        };

        (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);
        mockCrypto.validatePassword.mockResolvedValue(true);
        (LocalStorageUtils.saveValueInLocalStorage as any).mockResolvedValue(undefined);

        await authService.unlockKeychain('password');

        // Setup auto-lock for 5 minutes
        authService.setupAutoLock(5);

        // Fast forward 4 minutes - should still be unlocked
        vi.advanceTimersByTime(4 * 60 * 1000);
        expect(authService.isLocked()).toBe(false);

        // Fast forward another 2 minutes - should be locked
        vi.advanceTimersByTime(2 * 60 * 1000);
        expect(authService.isLocked()).toBe(true);
      });

      it('should clear auto-lock timer', async () => {
        vi.useFakeTimers();

        // Unlock and setup auto-lock
        const authData = {
          passwordHash: 'hash',
          salt: bytesToHex(new Uint8Array(32).fill(1)),
          failedAttempts: 0,
        };

        (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);
        mockCrypto.validatePassword.mockResolvedValue(true);
        (LocalStorageUtils.saveValueInLocalStorage as any).mockResolvedValue(undefined);

        await authService.unlockKeychain('password');
        authService.setupAutoLock(5);

        // Clear auto-lock
        authService.clearAutoLock();

        // Fast forward 10 minutes - should still be unlocked
        vi.advanceTimersByTime(10 * 60 * 1000);
        expect(authService.isLocked()).toBe(false);
      });

      it('should throw error if no session when setting auto-lock', () => {
        expect(() => authService.setupAutoLock(5)).toThrow('No active session');
      });
    });
  });

  describe('Failed Attempts Tracking', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
    
    it('should track failed attempts', async () => {
      const authData = {
        passwordHash: 'hash',
        salt: 'salt',
        failedAttempts: 0,
      };

      (LocalStorageUtils.getValueFromLocalStorage as any).mockImplementation(() => Promise.resolve({...authData}));

      await authService.trackFailedAttempt();

      expect((LocalStorageUtils.saveValueInLocalStorage as any)).toHaveBeenCalledWith(expect.anything(), {
        ...authData,
        failedAttempts: 1,
        lastFailedAttempt: expect.any(Number),
      });
    });

    it('should lock account after max attempts', async () => {
      const authData = {
        passwordHash: 'hash2',
        salt: 'salt2',
        failedAttempts: 4, // One more will trigger lockout
      };

      (LocalStorageUtils.getValueFromLocalStorage as any).mockImplementation(() => Promise.resolve({...authData}));

      await authService.trackFailedAttempt();

      expect((LocalStorageUtils.saveValueInLocalStorage as any)).toHaveBeenCalledTimes(1);
      expect((LocalStorageUtils.saveValueInLocalStorage as any)).toHaveBeenCalledWith(expect.anything(), {
        passwordHash: 'hash2',
        salt: 'salt2',
        failedAttempts: 5,
        lastFailedAttempt: expect.any(Number),
        lockedUntil: expect.any(Number),
      });
    });

    it('should check if account is locked out', async () => {
      const lockedData = {
        passwordHash: 'hash',
        salt: 'salt',
        failedAttempts: 5,
        lockedUntil: Date.now() + 10 * 60 * 1000, // 10 minutes from now
      };

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(lockedData);

      const isLocked = await authService.isLockedOut();
      expect(isLocked).toBe(true);
    });

    it('should unlock account after lockout expires', async () => {
      const expiredLockData = {
        passwordHash: 'hash',
        salt: 'salt',
        failedAttempts: 5,
        lockedUntil: Date.now() - 1000, // 1 second ago
      };

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(expiredLockData);

      const isLocked = await authService.isLockedOut();
      expect(isLocked).toBe(false);

      // Should reset failed attempts
      expect((LocalStorageUtils.saveValueInLocalStorage as any)).toHaveBeenCalledWith(expect.anything(), {
        passwordHash: 'hash',
        salt: 'salt',
        failedAttempts: 0,
      });
    });

    it('should reset failed attempts', async () => {
      const authData = {
        passwordHash: 'hash',
        salt: 'salt',
        failedAttempts: 3,
        lastFailedAttempt: Date.now(),
      };

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);

      await authService.resetFailedAttempts();

      expect((LocalStorageUtils.saveValueInLocalStorage as any)).toHaveBeenCalledWith(expect.anything(), {
        passwordHash: 'hash',
        salt: 'salt',
        failedAttempts: 0,
      });
    });

    it('should get failed attempts count', async () => {
      const authData = {
        passwordHash: 'hash',
        salt: 'salt',
        failedAttempts: 3,
      };

      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(authData);

      const count = await authService.getFailedAttempts();
      expect(count).toBe(3);
    });

    it('should return 0 if no auth data', async () => {
      (LocalStorageUtils.getValueFromLocalStorage as any).mockResolvedValue(null);

      const count = await authService.getFailedAttempts();
      expect(count).toBe(0);
    });
  });
});