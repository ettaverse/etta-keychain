export interface SteemTxBroadcastResult {
  tx_id: string;
  block_num?: number;
  trx_num?: number;
  expired?: boolean;
  isUsingMultisig?: boolean;
  status?: string;
}

export interface SteemTxBroadcastSuccessResponse {
  result: SteemTxBroadcastResult;
}

export interface SteemTxBroadcastErrorResponse {
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface TransactionResult {
  success: boolean;
  result?: any;
  error?: string;
  transaction: any;
}