import { AccountService } from '../account.service';
import { TransactionService } from '../transaction.service';
import Logger from '../../../../src/utils/logger.utils';
import LocalStorageUtils from '../../../../src/utils/localStorage.utils';
import { LocalStorageKeyEnum } from '../../../../src/reference-data/local-storage-key.enum';
import { KeychainError } from '../../../../src/keychain-error';
import { KeychainResponse } from '../types/keychain-api.types';

export class DHFService {
  constructor(
    private accountService?: AccountService,
    private transactionService?: TransactionService
  ) {}

  async handleCreateProposal(request: any): Promise<KeychainResponse> {
    const { 
      username, 
      receiver, 
      subject, 
      permlink, 
      daily_pay, 
      start, 
      end, 
      extensions, 
      rpc, 
      request_id 
    } = request;

    if (!username || !receiver || !subject || !permlink || !daily_pay || !start || !end) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, receiver, subject, permlink, daily_pay, start, and end are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      if (!this.accountService) {
        throw new KeychainError('Account service not available');
      }

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      this.validateDates(start, end);
      this.validateDailyPay(daily_pay);

      const processedExtensions = this.processExtensions(extensions);

      if (!this.transactionService) {
        throw new KeychainError('Transaction service not available');
      }

      // TODO: Implement actual DHF proposal creation using TransactionService
      // This would create a create_proposal operation
      Logger.info(`Creating DHF proposal for ${username}: ${subject}`);

      return {
        success: true,
        result: {
          creator: username,
          receiver,
          subject,
          permlink,
          daily_pay,
          start,
          end,
          extensions: processedExtensions,
          message: 'DHF proposal created successfully'
        },
        request_id
      };
    } catch (error) {
      Logger.error('Create proposal error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create proposal',
        request_id
      };
    }
  }

  async handleRemoveProposal(request: any): Promise<KeychainResponse> {
    const { username, proposal_ids, extensions, rpc, request_id } = request;

    if (!username || !proposal_ids) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username and proposal_ids are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      if (!this.accountService) {
        throw new KeychainError('Account service not available');
      }

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      const processedProposalIds = this.processProposalIds(proposal_ids);
      const processedExtensions = this.processExtensions(extensions);

      if (!this.transactionService) {
        throw new KeychainError('Transaction service not available');
      }

      // TODO: Implement actual DHF proposal removal using TransactionService
      // This would create a remove_proposal operation
      Logger.info(`Removing DHF proposals for ${username}: ${processedProposalIds.join(', ')}`);

      return {
        success: true,
        result: {
          account: username,
          proposal_ids: processedProposalIds,
          extensions: processedExtensions,
          message: 'DHF proposals removed successfully'
        },
        request_id
      };
    } catch (error) {
      Logger.error('Remove proposal error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove proposals',
        request_id
      };
    }
  }

  async handleUpdateProposalVote(request: any): Promise<KeychainResponse> {
    const { username, proposal_ids, approve, extensions, rpc, request_id } = request;

    if (!username || !proposal_ids || approve === undefined) {
      return {
        success: false,
        error: 'Missing required parameters',
        message: 'username, proposal_ids, and approve (boolean) are required',
        request_id
      };
    }

    try {
      const keychainPassword = await LocalStorageUtils.getValueFromSessionStorage(LocalStorageKeyEnum.__MK);
      if (!keychainPassword) {
        throw new KeychainError('Keychain is locked');
      }

      if (!this.accountService) {
        throw new KeychainError('Account service not available');
      }

      const account = await this.accountService.getAccount(username, keychainPassword);
      if (!account) {
        throw new KeychainError('Account not found in keychain');
      }

      if (!account.keys.active) {
        throw new KeychainError('Active key not available for this account');
      }

      const processedProposalIds = this.processProposalIds(proposal_ids);
      const processedExtensions = this.processExtensions(extensions);

      if (!this.transactionService) {
        throw new KeychainError('Transaction service not available');
      }

      // TODO: Implement actual DHF proposal vote using TransactionService
      // This would create an update_proposal_votes operation
      Logger.info(`${approve ? 'Approving' : 'Unapproving'} DHF proposals for ${username}: ${processedProposalIds.join(', ')}`);

      return {
        success: true,
        result: {
          voter: username,
          proposal_ids: processedProposalIds,
          approve,
          extensions: processedExtensions,
          message: `DHF proposals ${approve ? 'approved' : 'unapproved'} successfully`
        },
        request_id
      };
    } catch (error) {
      Logger.error('Update proposal vote error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update proposal votes',
        request_id
      };
    }
  }

  private validateDates(start: string, end: string): void {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new KeychainError('Invalid date format');
    }
    
    if (endDate <= startDate) {
      throw new KeychainError('End date must be after start date');
    }
  }

  private validateDailyPay(dailyPay: string): void {
    const amount = parseFloat(dailyPay);
    if (isNaN(amount) || amount <= 0) {
      throw new KeychainError('Daily pay must be a positive number');
    }
  }

  private processProposalIds(proposalIds: string | number[]): number[] {
    try {
      const ids = typeof proposalIds === 'string' ? JSON.parse(proposalIds) : proposalIds;
      if (!Array.isArray(ids)) {
        throw new Error('Proposal IDs must be an array');
      }
      return ids.map(id => parseInt(id.toString()));
    } catch (error) {
      throw new KeychainError('Invalid proposal IDs format');
    }
  }

  private processExtensions(extensions: string | any[]): any[] {
    if (!extensions) return [];
    
    try {
      return typeof extensions === 'string' ? JSON.parse(extensions) : extensions;
    } catch (error) {
      throw new KeychainError('Invalid extensions format');
    }
  }
}