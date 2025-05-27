import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { KeychainRequest } from '../../background/services/types/keychain-api.types';

interface OperationFormatterProps {
  request: KeychainRequest;
  showDetailed?: boolean;
}

interface FormattedOperation {
  icon: string;
  title: string;
  description: string;
  details: Array<{ label: string; value: string; highlight?: boolean }>;
  risk: 'low' | 'medium' | 'high';
}

export function OperationFormatter({ request, showDetailed = false }: OperationFormatterProps) {
  const formatOperation = (request: KeychainRequest): FormattedOperation => {
    switch (request.type) {
      case 'requestTransfer':
        return {
          icon: '💸',
          title: 'Transfer Funds',
          description: `Send ${request.amount} ${request.currency || 'STEEM'} to ${request.to}`,
          details: [
            { label: 'Recipient', value: request.to, highlight: true },
            { label: 'Amount', value: `${request.amount} ${request.currency || 'STEEM'}`, highlight: true },
            { label: 'Memo', value: request.memo || '(none)' },
            { label: 'From Account', value: request.username }
          ],
          risk: 'medium'
        };

      case 'requestVote':
        return {
          icon: request.weight > 0 ? '👍' : '👎',
          title: 'Vote on Post',
          description: `${request.weight > 0 ? 'Upvote' : 'Downvote'} @${request.author}/${request.permlink} with ${Math.abs(request.weight)}% weight`,
          details: [
            { label: 'Author', value: `@${request.author}` },
            { label: 'Post', value: request.permlink },
            { label: 'Vote Weight', value: `${request.weight}%`, highlight: true },
            { label: 'Voter', value: `@${request.username}` }
          ],
          risk: 'low'
        };

      case 'requestCustomJson':
        return {
          icon: '🔧',
          title: 'Custom JSON Operation',
          description: `Execute ${request.displayName || request.id} operation`,
          details: [
            { label: 'Operation ID', value: request.id },
            { label: 'Display Name', value: request.displayName || 'Custom Operation' },
            { label: 'Key Type', value: request.keyType },
            { label: 'JSON Data', value: JSON.stringify(request.json).substring(0, 100) + '...' }
          ],
          risk: 'medium'
        };

      case 'requestDelegateVestingShares':
        return {
          icon: '🤝',
          title: 'Delegate STEEM Power',
          description: `Delegate ${request.vesting_shares} to @${request.delegatee}`,
          details: [
            { label: 'Delegate To', value: `@${request.delegatee}`, highlight: true },
            { label: 'Amount', value: request.vesting_shares, highlight: true },
            { label: 'Delegator', value: `@${request.username}` }
          ],
          risk: 'medium'
        };

      case 'requestPowerUp':
        return {
          icon: '⚡',
          title: 'Power Up STEEM',
          description: `Convert ${request.steem} STEEM to STEEM Power`,
          details: [
            { label: 'Amount', value: `${request.steem} STEEM`, highlight: true },
            { label: 'Account', value: `@${request.username}` },
            { label: 'Result', value: 'Increased voting power and influence' }
          ],
          risk: 'low'
        };

      case 'requestPowerDown':
        return {
          icon: '⬇️',
          title: 'Power Down STEEM',
          description: `Begin power down process for ${request.steem} STEEM Power`,
          details: [
            { label: 'Amount', value: `${request.steem} STEEM Power`, highlight: true },
            { label: 'Account', value: `@${request.username}` },
            { label: 'Duration', value: '13 weeks (weekly payments)' },
            { label: 'Warning', value: 'This will reduce your voting power', highlight: true }
          ],
          risk: 'high'
        };

      case 'requestWitnessVote':
        return {
          icon: request.vote ? '✅' : '❌',
          title: `${request.vote ? 'Vote for' : 'Unvote'} Witness`,
          description: `${request.vote ? 'Support' : 'Remove support for'} witness @${request.witness}`,
          details: [
            { label: 'Witness', value: `@${request.witness}`, highlight: true },
            { label: 'Action', value: request.vote ? 'Vote' : 'Unvote', highlight: true },
            { label: 'Voter', value: `@${request.username}` }
          ],
          risk: 'low'
        };

      case 'requestPost':
        return {
          icon: '📝',
          title: request.parent_author ? 'Reply to Post' : 'Create Post',
          description: request.parent_author 
            ? `Reply to @${request.parent_author}/${request.parent_permlink}`
            : `Create new post: ${request.title}`,
          details: [
            { label: 'Title', value: request.title || '(Reply)' },
            { label: 'Author', value: `@${request.username}` },
            ...(request.parent_author ? [
              { label: 'Reply To', value: `@${request.parent_author}` }
            ] : []),
            { label: 'Content Length', value: `${request.body?.length || 0} characters` }
          ],
          risk: 'low'
        };

      case 'requestSignBuffer':
        return {
          icon: '🔐',
          title: 'Sign Message',
          description: 'Create cryptographic signature for a message',
          details: [
            { label: 'Message', value: request.message?.substring(0, 50) + '...' || 'Custom message' },
            { label: 'Key Type', value: request.keyType },
            { label: 'Account', value: `@${request.username}` }
          ],
          risk: 'low'
        };

      case 'requestSignTx':
        return {
          icon: '📋',
          title: 'Sign Transaction',
          description: 'Sign a custom transaction for broadcasting',
          details: [
            { label: 'Transaction Type', value: 'Custom Transaction' },
            { label: 'Account', value: `@${request.username}` },
            { label: 'Operations', value: `${request.tx?.operations?.length || 0} operation(s)` }
          ],
          risk: 'medium'
        };

      case 'requestAddAccountAuthority':
        return {
          icon: '🔑',
          title: 'Add Account Authority',
          description: `Grant authority to @${request.authorizedUsername}`,
          details: [
            { label: 'Authorized Account', value: `@${request.authorizedUsername}`, highlight: true },
            { label: 'Authority Type', value: request.role || 'posting' },
            { label: 'Weight', value: request.weight?.toString() || '1' },
            { label: 'Account', value: `@${request.username}` }
          ],
          risk: 'high'
        };

      case 'requestRemoveAccountAuthority':
        return {
          icon: '🚫',
          title: 'Remove Account Authority',
          description: `Revoke authority from @${request.authorizedUsername}`,
          details: [
            { label: 'Removing Authority', value: `@${request.authorizedUsername}`, highlight: true },
            { label: 'Authority Type', value: request.role || 'posting' },
            { label: 'Account', value: `@${request.username}` }
          ],
          risk: 'high'
        };

      default:
        return {
          icon: '❓',
          title: 'Unknown Operation',
          description: `${request.type} operation`,
          details: [
            { label: 'Operation Type', value: request.type },
            { label: 'Account', value: request.username || 'Unknown' }
          ],
          risk: 'medium'
        };
    }
  };

  const operation = formatOperation(request);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskBadgeVariant = (risk: string): "default" | "secondary" | "destructive" => {
    switch (risk) {
      case 'low': return 'secondary';
      case 'medium': return 'default';
      case 'high': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{operation.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-base">{operation.title}</h3>
          <p className="text-sm text-muted-foreground">{operation.description}</p>
        </div>
        <Badge variant={getRiskBadgeVariant(operation.risk)} className="text-xs">
          {operation.risk.toUpperCase()} RISK
        </Badge>
      </div>

      {showDetailed && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {operation.details.map((detail, index) => (
                <div key={index} className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground min-w-0 flex-1">
                    {detail.label}:
                  </span>
                  <span className={`text-sm ml-2 text-right break-all ${
                    detail.highlight ? 'font-semibold' : 'font-medium'
                  }`}>
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}