import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { KeychainRequest } from '../../background/services/types/keychain-api.types';

interface TransactionRequestDisplayProps {
  request: KeychainRequest;
  origin: string;
}

export function TransactionRequestDisplay({ request, origin }: TransactionRequestDisplayProps) {
  const getOperationTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      'requestTransfer': 'Transfer',
      'requestVote': 'Vote',
      'requestCustomJson': 'Custom JSON',
      'requestBroadcast': 'Broadcast',
      'requestDelegateVestingShares': 'Delegate STEEM Power',
      'requestPowerUp': 'Power Up',
      'requestPowerDown': 'Power Down',
      'requestSignTx': 'Sign Transaction',
      'requestSignBuffer': 'Sign Message',
      'requestPost': 'Create Post',
      'requestWitnessVote': 'Witness Vote',
      'requestProxy': 'Set Proxy',
      'requestCreateAccount': 'Create Account',
      'requestAddAccountAuthority': 'Add Account Authority',
      'requestRemoveAccountAuthority': 'Remove Account Authority',
      'requestAddKeyAuthority': 'Add Key Authority',
      'requestRemoveKeyAuthority': 'Remove Key Authority',
      'requestEncode': 'Encode Message',
      'requestVerifyKey': 'Verify Key',
      'requestSendToken': 'Send Token',
      'requestStakeToken': 'Stake Token',
      'requestUnstakeToken': 'Unstake Token'
    };
    return typeMap[type] || type;
  };

  const getOperationVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    const dangerousOps = ['requestRemoveAccountAuthority', 'requestRemoveKeyAuthority', 'requestPowerDown'];
    const importantOps = ['requestTransfer', 'requestDelegateVestingShares', 'requestPowerUp'];
    
    if (dangerousOps.includes(type)) return 'destructive';
    if (importantOps.includes(type)) return 'default';
    return 'secondary';
  };

  const formatParameterValue = (key: string, value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (key.toLowerCase().includes('amount') && typeof value === 'string') {
      return value + (value.includes(' ') ? '' : ' STEEM');
    }
    return String(value);
  };

  const getImportantParameters = (request: KeychainRequest): Array<{ key: string; value: any; label: string }> => {
    const params: Array<{ key: string; value: any; label: string }> = [];
    
    // Common parameters for all operations
    if (request.username) {
      params.push({ key: 'username', value: request.username, label: 'Account' });
    }

    // Operation-specific important parameters
    switch (request.type) {
      case 'requestTransfer':
        if (request.to) params.push({ key: 'to', value: request.to, label: 'Recipient' });
        if (request.amount) params.push({ key: 'amount', value: request.amount, label: 'Amount' });
        if (request.currency) params.push({ key: 'currency', value: request.currency, label: 'Currency' });
        if (request.memo) params.push({ key: 'memo', value: request.memo, label: 'Memo' });
        break;
      
      case 'requestVote':
        if (request.author) params.push({ key: 'author', value: request.author, label: 'Author' });
        if (request.permlink) params.push({ key: 'permlink', value: request.permlink, label: 'Post' });
        if (request.weight !== undefined) params.push({ key: 'weight', value: `${request.weight}%`, label: 'Vote Weight' });
        break;
      
      case 'requestCustomJson':
        if (request.id) params.push({ key: 'id', value: request.id, label: 'Custom JSON ID' });
        if (request.keyType) params.push({ key: 'keyType', value: request.keyType, label: 'Key Type' });
        if (request.displayName) params.push({ key: 'displayName', value: request.displayName, label: 'Display Name' });
        break;
      
      case 'requestDelegateVestingShares':
        if (request.delegatee) params.push({ key: 'delegatee', value: request.delegatee, label: 'Delegate To' });
        if (request.vesting_shares) params.push({ key: 'vesting_shares', value: request.vesting_shares, label: 'STEEM Power' });
        break;
      
      case 'requestPowerUp':
      case 'requestPowerDown':
        if (request.steem) params.push({ key: 'steem', value: request.steem, label: 'STEEM Amount' });
        break;
      
      case 'requestWitnessVote':
        if (request.witness) params.push({ key: 'witness', value: request.witness, label: 'Witness' });
        if (request.vote !== undefined) params.push({ key: 'vote', value: request.vote ? 'Support' : 'Remove', label: 'Action' });
        break;
      
      case 'requestPost':
        if (request.title) params.push({ key: 'title', value: request.title, label: 'Title' });
        if (request.body) params.push({ key: 'body', value: request.body.substring(0, 100) + (request.body.length > 100 ? '...' : ''), label: 'Content' });
        if (request.parent_author) params.push({ key: 'parent_author', value: request.parent_author, label: 'Reply To' });
        break;
    }

    return params;
  };

  const importantParams = getImportantParameters(request);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Transaction Request</CardTitle>
            <CardDescription>From: {origin}</CardDescription>
          </div>
          <Badge variant={getOperationVariant(request.type)}>
            {getOperationTypeLabel(request.type)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {importantParams.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Transaction Details</h4>
            <div className="space-y-2">
              {importantParams.map((param, index) => (
                <div key={index} className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground min-w-0 flex-1">
                    {param.label}:
                  </span>
                  <span className="text-sm font-medium text-right ml-2 break-all">
                    {formatParameterValue(param.key, param.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="text-xs text-muted-foreground space-y-1">
          <div>Request ID: {request.request_id}</div>
          <div>Operation Type: {request.type}</div>
        </div>
      </CardContent>
    </Card>
  );
}