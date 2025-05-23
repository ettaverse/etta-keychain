export * from './steem-api.service';
export * from './key-management.service';
export * from './account.service';
export * from './transaction.service';

// Service factory for dependency injection
import { SecureStorage } from '../lib/storage';
import { SteemApiService } from './steem-api.service';
import { KeyManagementService } from './key-management.service';
import { AccountService } from './account.service';
import { TransactionService } from './transaction.service';
import { Rpc } from '../../../src/interfaces/rpc.interface';

export interface Services {
  storage: SecureStorage;
  steemApi: SteemApiService;
  keyManager: KeyManagementService;
  accountService: AccountService;
  transactionService: TransactionService;
}

export function createServices(rpc?: Rpc): Services {
  const storage = new SecureStorage();
  const steemApi = new SteemApiService(rpc);
  const keyManager = new KeyManagementService();
  const accountService = new AccountService(storage, steemApi, keyManager);
  const transactionService = new TransactionService(steemApi, keyManager);

  return {
    storage,
    steemApi,
    keyManager,
    accountService,
    transactionService,
  };
}

// Singleton instance
let servicesInstance: Services | null = null;

export function getServices(rpc?: Rpc): Services {
  if (!servicesInstance) {
    servicesInstance = createServices(rpc);
  }
  return servicesInstance;
}

export function resetServices(): void {
  servicesInstance = null;
}