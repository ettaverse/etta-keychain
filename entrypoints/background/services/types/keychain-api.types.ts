export interface KeychainRequest {
  type: string;
  request_id: number;
  username?: string;
  [key: string]: any;
}

export interface KeychainResponse {
  success: boolean;
  error?: string;
  message?: string;
  request_id: number;
  result?: any;
}

export interface AuthorityObject {
  weight_threshold: number;
  account_auths: Array<[string, number]>;
  key_auths: Array<[string, number]>;
}

export interface AccountKeys {
  active?: string;
  posting?: string;
  memo?: string;
  owner?: string;
}