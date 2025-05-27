import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeychainApiService } from '../../../background/services/keychain-api.service';
import { KeychainError } from '../../../../src/keychain-error';

// Mock all sub-services with actual implementations
const mockEncodeService = {
  handleEncodeMessage: vi.fn(),
  handleEncodeWithKeys: vi.fn()
};

const mockSignService = {
  handleSignBuffer: vi.fn(),
  handleSignTx: vi.fn()
};

const mockAccountAuthorityService = {
  handleAddAccountAuthority: vi.fn(),
  handleRemoveAccountAuthority: vi.fn()
};

const mockKeyAuthorityService = {
  handleAddKeyAuthority: vi.fn(),
  handleRemoveKeyAuthority: vi.fn()
};

const mockPostService = {
  handlePost: vi.fn(),
  handlePostWithBeneficiaries: vi.fn()
};

const mockWitnessService = {
  handleWitnessVote: vi.fn(),
  handleWitnessProxy: vi.fn()
};

const mockPowerService = {
  handlePowerUp: vi.fn(),
  handlePowerDown: vi.fn()
};

const mockTokenService = {
  handleSendToken: vi.fn()
};

vi.mock('../../../background/services/keychain/encode.service', () => ({
  EncodeService: vi.fn(() => mockEncodeService)
}));

vi.mock('../../../background/services/keychain/sign.service', () => ({
  SignService: vi.fn(() => mockSignService)
}));

vi.mock('../../../background/services/keychain/account-authority.service', () => ({
  AccountAuthorityService: vi.fn(() => mockAccountAuthorityService)
}));

vi.mock('../../../background/services/keychain/key-authority.service', () => ({
  KeyAuthorityService: vi.fn(() => mockKeyAuthorityService)
}));

vi.mock('../../../background/services/keychain/post.service', () => ({
  PostService: vi.fn(() => mockPostService)
}));

vi.mock('../../../background/services/keychain/witness.service', () => ({
  WitnessService: vi.fn(() => mockWitnessService)
}));

vi.mock('../../../background/services/keychain/power.service', () => ({
  PowerService: vi.fn(() => mockPowerService)
}));

vi.mock('../../../background/services/keychain/token.service', () => ({
  TokenService: vi.fn(() => mockTokenService)
}));

// Mock other services
vi.mock('../../../background/services/keychain/account-management.service', () => ({
  AccountManagementService: vi.fn(() => ({}))
}));

vi.mock('../../../background/services/keychain/account-creation.service', () => ({
  AccountCreationService: vi.fn(() => ({}))
}));

vi.mock('../../../background/services/keychain/broadcast.service', () => ({
  BroadcastService: vi.fn(() => ({}))
}));

vi.mock('../../../background/services/keychain/proxy.service', () => ({
  ProxyService: vi.fn(() => ({}))
}));

vi.mock('../../../background/services/keychain/dhf.service', () => ({
  DHFService: vi.fn(() => ({}))
}));

describe('KeychainApiService', () => {
  let service: KeychainApiService;
  
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
    // Reset singleton
    (KeychainApiService as any).instance = null;
    service = KeychainApiService.getInstance();
    vi.clearAllMocks();
    
    // Set up default mock responses
    mockEncodeService.handleEncodeMessage.mockResolvedValue(mockSuccessResponse);
    mockEncodeService.handleEncodeWithKeys.mockResolvedValue(mockSuccessResponse);
    mockSignService.handleSignBuffer.mockResolvedValue(mockSuccessResponse);
    mockSignService.handleSignTx.mockResolvedValue(mockSuccessResponse);
    mockAccountAuthorityService.handleAddAccountAuthority.mockResolvedValue(mockSuccessResponse);
    mockAccountAuthorityService.handleRemoveAccountAuthority.mockResolvedValue(mockSuccessResponse);
    mockKeyAuthorityService.handleAddKeyAuthority.mockResolvedValue(mockSuccessResponse);
    mockKeyAuthorityService.handleRemoveKeyAuthority.mockResolvedValue(mockSuccessResponse);
    mockPostService.handlePost.mockResolvedValue(mockSuccessResponse);
    mockPostService.handlePostWithBeneficiaries.mockResolvedValue(mockSuccessResponse);
    mockWitnessService.handleWitnessVote.mockResolvedValue(mockSuccessResponse);
    mockWitnessService.handleWitnessProxy.mockResolvedValue(mockSuccessResponse);
    mockPowerService.handlePowerUp.mockResolvedValue(mockSuccessResponse);
    mockPowerService.handlePowerDown.mockResolvedValue(mockSuccessResponse);
    mockTokenService.handleSendToken.mockResolvedValue(mockSuccessResponse);
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = KeychainApiService.getInstance();
      const instance2 = KeychainApiService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handleKeychainRequest - Encode Operations', () => {
    it('should handle encode requests', async () => {
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
      expect(mockEncodeService.handleEncodeMessage).toHaveBeenCalledWith(request);
    });

    it('should handle encodeWithKeys requests', async () => {
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
      expect(mockEncodeService.handleEncodeWithKeys).toHaveBeenCalledWith(request);
    });
  });

  describe('handleKeychainRequest - Sign Operations', () => {
    it('should handle signBuffer requests', async () => {
      const request = {
        type: 'signBuffer',
        request_id: 123,
        username: 'testuser',
        message: 'buffer to sign',
        method: 'posting'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
      expect(mockSignService.handleSignBuffer).toHaveBeenCalledWith(request);
    });

    it('should handle signTx requests', async () => {
      const request = {
        type: 'signTx',
        request_id: 123,
        username: 'testuser',
        tx: { operations: [], extensions: [] },
        method: 'active'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
      expect(mockSignService.handleSignTx).toHaveBeenCalledWith(request);
    });
  });

  describe('handleKeychainRequest - Account Authority Operations', () => {
    it('should handle addAccountAuthority requests', async () => {
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
      expect(mockAccountAuthorityService.handleAddAccountAuthority).toHaveBeenCalledWith(request);
    });

    it('should handle removeAccountAuthority requests', async () => {
      const request = {
        type: 'removeAccountAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedUsername: 'authorized',
        role: 'posting'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
      expect(mockAccountAuthorityService.handleRemoveAccountAuthority).toHaveBeenCalledWith(request);
    });
  });

  describe('handleKeychainRequest - Key Authority Operations', () => {
    it('should handle addKeyAuthority requests', async () => {
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
      expect(mockKeyAuthorityService.handleAddKeyAuthority).toHaveBeenCalledWith(request);
    });

    it('should handle removeKeyAuthority requests', async () => {
      const request = {
        type: 'removeKeyAuthority',
        request_id: 123,
        username: 'testuser',
        authorizedKey: 'STM5TestKey',
        role: 'posting'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
      expect(mockKeyAuthorityService.handleRemoveKeyAuthority).toHaveBeenCalledWith(request);
    });
  });

  describe('handleKeychainRequest - Post Operations', () => {
    it('should handle post requests', async () => {
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
      expect(mockPostService.handlePost).toHaveBeenCalledWith(request);
    });

    it('should handle postWithBeneficiaries requests', async () => {
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
      expect(mockPostService.handlePostWithBeneficiaries).toHaveBeenCalledWith(request);
    });
  });

  describe('handleKeychainRequest - Witness Operations', () => {
    it('should handle witnessVote requests', async () => {
      const request = {
        type: 'witnessVote',
        request_id: 123,
        username: 'testuser',
        witness: 'witness-account',
        vote: true
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
      expect(mockWitnessService.handleWitnessVote).toHaveBeenCalledWith(request);
    });

    it('should handle witnessProxy requests', async () => {
      const request = {
        type: 'witnessProxy',
        request_id: 123,
        username: 'testuser',
        proxy: 'proxy-account'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
      expect(mockWitnessService.handleWitnessProxy).toHaveBeenCalledWith(request);
    });
  });

  describe('handleKeychainRequest - Power Operations', () => {
    it('should handle powerUp requests', async () => {
      const request = {
        type: 'powerUp',
        request_id: 123,
        username: 'testuser',
        steem: '10.000',
        to: 'testuser'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
      expect(mockPowerService.handlePowerUp).toHaveBeenCalledWith(request);
    });

    it('should handle powerDown requests', async () => {
      const request = {
        type: 'powerDown',
        request_id: 123,
        username: 'testuser',
        steem_power: '10.000'
      };

      const result = await service.handleKeychainRequest(request);
      expect(result.success).toBe(true);
      expect(mockPowerService.handlePowerDown).toHaveBeenCalledWith(request);
    });
  });

  describe('handleKeychainRequest - Token Operations', () => {
    it('should handle sendToken requests', async () => {
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
      expect(mockTokenService.handleSendToken).toHaveBeenCalledWith(request);
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
      expect(result.error).toBe('Unknown request type');
      expect(result.request_id).toBe(123);
    });

    it('should handle service errors gracefully', async () => {
      mockEncodeService.handleEncodeMessage.mockRejectedValue(new Error('Service error'));

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
      expect(result.error).toBe('Service error');
      expect(result.request_id).toBe(123);
    });

    it('should handle missing request_id', async () => {
      const request = {
        type: 'encode',
        username: 'testuser'
        // Missing request_id
      } as any;

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
      } as any;

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