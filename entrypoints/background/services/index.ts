export * from './steem-api.service';
export * from './key-management.service';
export * from './account.service';
export * from './transaction.service';
export * from './auth.service';

// Service factory for dependency injection
import { SecureStorage } from '../lib/storage';
import { SteemApiService } from './steem-api.service';
import { KeyManagementService } from './key-management.service';
import { AccountService } from './account.service';
import { TransactionService } from './transaction.service';
import { AuthService } from './auth.service';
import { CryptoManager } from '../../../lib/crypto';
import { Rpc } from '../../../src/interfaces/rpc.interface';

export interface Services {
  storage: SecureStorage;
  steemApi: SteemApiService;
  keyManager: KeyManagementService;
  accountService: AccountService;
  transactionService: TransactionService;
  authService: AuthService;
}

export function createServices(rpc?: Rpc): Services {
  const storage = new SecureStorage();
  const cryptoManager = new CryptoManager();
  const steemApi = new SteemApiService(rpc);
  const keyManager = new KeyManagementService();
  const authService = new AuthService(cryptoManager);
  const accountService = new AccountService(storage, steemApi, keyManager);
  const transactionService = new TransactionService(steemApi, keyManager);

  return {
    storage,
    steemApi,
    keyManager,
    accountService,
    transactionService,
    authService,
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