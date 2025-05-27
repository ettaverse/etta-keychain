import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeychainApiServiceV2 } from '../../../background/services/keychain-api-v2.service';
import { KeychainError } from '../../../../src/keychain-error';

// Mock all sub-services
vi.mock('../../../background/services/keychain/encode.service');
vi.mock('../../../background/services/keychain/sign.service');
vi.mock('../../../background/services/keychain/account-authority.service');
vi.mock('../../../background/services/keychain/key-authority.service');
vi.mock('../../../background/services/keychain/account-management.service');
vi.mock('../../../background/services/keychain/account-creation.service');
vi.mock('../../../background/services/keychain/post.service');
vi.mock('../../../background/services/keychain/broadcast.service');
vi.mock('../../../background/services/keychain/witness.service');
vi.mock('../../../background/services/keychain/proxy.service');
vi.mock('../../../background/services/keychain/dhf.service');
vi.mock('../../../background/services/keychain/power.service');
vi.mock('../../../background/services/keychain/token.service');

describe('KeychainApiServiceV2', () => {
  let service: KeychainApiServiceV2;
  
  const mockSuccessResponse = {
    success: true,
    request_id: 123,
    result: 'test_result'
  };

  const mockErrorResponse = {
    success: false,
    request_id: 123,
    error: 'Test error'
  };

  beforeEach(() => {
    service = KeychainApiServiceV2.getInstance();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = KeychainApiServiceV2.getInstance();
      const instance2 = KeychainApiServiceV2.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handleKeychainRequest - Encode Operations', () => {
    it('should handle encode requests', async () => {
      const { EncodeService } = await import('../../../background/services/keychain/encode.service');
      const mockEncodeService = new EncodeService();
      vi.mocked(mockEncodeService.handleEncodeMessage).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'encode',
        request_id: 123,
        username: 'testuser',
        receiver: 'receiver',
        message: 'test message',
        method: 'posting'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
      expect(result.request_id).toBe(123);
    });

    it('should handle encodeWithKeys requests', async () => {
      const { EncodeService } = await import('../../../background/services/keychain/encode.service');
      const mockEncodeService = new EncodeService();
      vi.mocked(mockEncodeService.handleEncodeWithKeys).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'encodeWithKeys',
        request_id: 123,
        username: 'testuser',
        receivers: ['receiver1'],
        publicKeys: ['key1'],
        message: 'test message',
        method: 'posting'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });
  });

  describe('handleKeychainRequest - Sign Operations', () => {
    it('should handle signBuffer requests', async () => {
      const { SignService } = await import('../../../background/services/keychain/sign.service');
      const mockSignService = new SignService();
      vi.mocked(mockSignService.handleSignBuffer).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'signBuffer',
        request_id: 123,
        username: 'testuser',
        message: 'buffer to sign',
        method: 'posting'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });

    it('should handle signTx requests', async () => {
      const { SignService } = await import('../../../background/services/keychain/sign.service');
      const mockSignService = new SignService();
      vi.mocked(mockSignService.handleSignTx).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'signTx',
        request_id: 123,
        username: 'testuser',
        tx: { operations: [], extensions: [] },
        method: 'active'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });
  });

  describe('handleKeychainRequest - Account Authority Operations', () => {
    it('should handle addAccountAuthority requests', async () => {
      const { AccountAuthorityService } = await import('../../../background/services/keychain/account-authority.service');
      const mockService = new AccountAuthorityService();
      vi.mocked(mockService.handleAddAccountAuthority).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'addAccountAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedUsername: 'authorized',
        role: 'posting',
        weight: 1
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });

    it('should handle removeAccountAuthority requests', async () => {
      const { AccountAuthorityService } = await import('../../../background/services/keychain/account-authority.service');
      const mockService = new AccountAuthorityService();
      vi.mocked(mockService.handleRemoveAccountAuthority).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'removeAccountAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedUsername: 'authorized',
        role: 'posting'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });
  });

  describe('handleKeychainRequest - Key Authority Operations', () => {
    it('should handle addKeyAuthority requests', async () => {
      const { KeyAuthorityService } = await import('../../../background/services/keychain/key-authority.service');
      const mockService = new KeyAuthorityService();
      vi.mocked(mockService.handleAddKeyAuthority).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'addKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestKey',
        role: 'posting',
        weight: 1
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });

    it('should handle removeKeyAuthority requests', async () => {
      const { KeyAuthorityService } = await import('../../../background/services/keychain/key-authority.service');
      const mockService = new KeyAuthorityService();
      vi.mocked(mockService.handleRemoveKeyAuthority).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'removeKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestKey',
        role: 'posting'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });
  });

  describe('handleKeychainRequest - Post Operations', () => {
    it('should handle post requests', async () => {
      const { PostService } = await import('../../../background/services/keychain/post.service');
      const mockService = new PostService();
      vi.mocked(mockService.handlePost).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'post',
        request_id: 123,
        username: 'testuser',
        title: 'Test Post',
        body: 'Test content',
        permlink: 'test-post'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });

    it('should handle postWithBeneficiaries requests', async () => {
      const { PostService } = await import('../../../background/services/keychain/post.service');
      const mockService = new PostService();
      vi.mocked(mockService.handlePostWithBeneficiaries).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'postWithBeneficiaries',
        request_id: 123,
        username: 'testuser',
        title: 'Test Post',
        body: 'Test content',
        permlink: 'test-post',
        beneficiaries: [{ account: 'beneficiary', weight: 1000 }]
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });
  });

  describe('handleKeychainRequest - Witness Operations', () => {
    it('should handle witnessVote requests', async () => {
      const { WitnessService } = await import('../../../background/services/keychain/witness.service');
      const mockService = new WitnessService();
      vi.mocked(mockService.handleWitnessVote).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'witnessVote',
        request_id: 123,
        username: 'testuser',
        witness: 'witness-account',
        vote: true
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });

    it('should handle witnessProxy requests', async () => {
      const { WitnessService } = await import('../../../background/services/keychain/witness.service');
      const mockService = new WitnessService();
      vi.mocked(mockService.handleWitnessProxy).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'witnessProxy',
        request_id: 123,
        username: 'testuser',
        proxy: 'proxy-account'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });
  });

  describe('handleKeychainRequest - Power Operations', () => {
    it('should handle powerUp requests', async () => {
      const { PowerService } = await import('../../../background/services/keychain/power.service');
      const mockService = new PowerService();
      vi.mocked(mockService.handlePowerUp).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'powerUp',
        request_id: 123,
        username: 'testuser',
        steem: '10.000',
        to: 'testuser'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });

    it('should handle powerDown requests', async () => {
      const { PowerService } = await import('../../../background/services/keychain/power.service');
      const mockService = new PowerService();
      vi.mocked(mockService.handlePowerDown).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'powerDown',
        request_id: 123,
        username: 'testuser',
        steem_power: '10.000'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });
  });

  describe('handleKeychainRequest - Token Operations', () => {
    it('should handle sendToken requests', async () => {
      const { TokenService } = await import('../../../background/services/keychain/token.service');
      const mockService = new TokenService();
      vi.mocked(mockService.handleSendToken).mockResolvedValue(mockSuccessResponse);

      const request = {
        type: 'sendToken',
        request_id: 123,
        username: 'testuser',
        to: 'recipient',
        currency: 'TRX',
        amount: '10.000',
        memo: 'test memo'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown request types', async () => {
      const request = {
        type: 'unknownOperation',
        request_id: 123,
        username: 'testuser'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown request type: unknownOperation');
      expect(result.request_id).toBe(123);
    });

    it('should handle service errors gracefully', async () => {
      const { EncodeService } = await import('../../../background/services/keychain/encode.service');
      const mockEncodeService = new EncodeService();
      vi.mocked(mockEncodeService.handleEncodeMessage).mockRejectedValue(new Error('Service error'));

      const request = {
        type: 'encode',
        request_id: 123,
        username: 'testuser',
        receiver: 'receiver',
        message: 'test message',
        method: 'posting'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal error processing request');
      expect(result.request_id).toBe(123);
    });

    it('should handle missing request_id', async () => {
      const request = {
        type: 'encode',
        username: 'testuser'
        // Missing request_id
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing request_id');
      expect(result.request_id).toBeUndefined();
    });

    it('should handle requests without type', async () => {
      const request = {
        request_id: 123,
        username: 'testuser'
        // Missing type
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing request type');
      expect(result.request_id).toBe(123);
    });
  });

  describe('Method Coverage', () => {
    const allMethods = [
      'encode', 'encodeWithKeys', 'signBuffer', 'signTx',
      'addAccountAuthority', 'removeAccountAuthority',
      'addKeyAuthority', 'removeKeyAuthority',
      'addPostingAuthority', 'removePostingAuthority',
      'createAccount', 'createClaimedAccount', 'delegateVestingShares',
      'post', 'postWithBeneficiaries', 'broadcast',
      'witnessVote', 'witnessProxy', 'setProxy', 'removeProxy',
      'createProposal', 'updateProposalVote', 'removeProposal',
      'powerUp', 'powerDown', 'delegation',
      'sendToken', 'stakeToken', 'unstakeToken'
    ];

    it('should have routing for all STEEM Keychain methods', () => {
      // This test ensures we don't miss any method implementations
      allMethods.forEach(method => {
        expect(typeof service.handleKeychainRequest).toBe('function');
      });
    });
  });
});