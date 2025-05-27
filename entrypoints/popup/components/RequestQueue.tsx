import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { KeychainRequest } from '../../background/services/types/keychain-api.types';

interface PendingRequest {
  request: KeychainRequest;
  origin: string;
  timestamp: number;
}

interface RequestQueueProps {
  requests: PendingRequest[];
  currentRequestId?: number;
  onSelectRequest: (request: PendingRequest) => void;
  onRejectAll: () => void;
  className?: string;
}

export function RequestQueue({
  requests,
  currentRequestId,
  onSelectRequest,
  onRejectAll,
  className
}: RequestQueueProps) {
  
  const getOperationIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      'requestTransfer': '💸',
      'requestVote': '👍',
      'requestCustomJson': '🔧',
      'requestBroadcast': '📡',
      'requestDelegateVestingShares': '🤝',
      'requestPowerUp': '⚡',
      'requestPowerDown': '⬇️',
      'requestSignTx': '📋',
      'requestSignBuffer': '🔐',
      'requestPost': '📝',
      'requestWitnessVote': '✅',
      'requestProxy': '🔄',
      'requestCreateAccount': '👤',
      'requestAddAccountAuthority': '🔑',
      'requestRemoveAccountAuthority': '🚫',
      'requestEncode': '🔒',
      'requestVerifyKey': '🔍'
    };
    return iconMap[type] || '❓';
  };

  const getOperationTitle = (type: string): string => {
    return type.replace('request', '').replace(/([A-Z])/g, ' $1').trim();
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getOperationRisk = (type: string): 'low' | 'medium' | 'high' => {
    const highRisk = ['requestPowerDown', 'requestRemoveAccountAuthority', 'requestRemoveKeyAuthority'];
    const mediumRisk = ['requestTransfer', 'requestDelegateVestingShares', 'requestAddAccountAuthority', 'requestCustomJson'];
    
    if (highRisk.includes(type)) return 'high';
    if (mediumRisk.includes(type)) return 'medium';
    return 'low';
  };

  const getRiskBadgeVariant = (risk: string): "default" | "secondary" | "destructive" => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getShortDescription = (request: KeychainRequest): string => {
    switch (request.type) {
      case 'requestTransfer':
        return `${request.amount} ${request.currency || 'STEEM'} → @${request.to}`;
      case 'requestVote':
        return `${request.weight > 0 ? 'Upvote' : 'Downvote'} @${request.author}`;
      case 'requestCustomJson':
        return request.displayName || request.id || 'Custom operation';
      case 'requestDelegateVestingShares':
        return `Delegate to @${request.delegatee}`;
      case 'requestPowerUp':
        return `Power up ${request.steem} STEEM`;
      case 'requestPowerDown':
        return `Power down ${request.steem} SP`;
      case 'requestWitnessVote':
        return `${request.vote ? 'Vote' : 'Unvote'} @${request.witness}`;
      case 'requestPost':
        return request.title || 'New post/comment';
      default:
        return `@${request.username || 'Unknown'}`;
    }
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Request Queue ({requests.length})
          </CardTitle>
          {requests.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRejectAll}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Reject All
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 pt-0">
        {requests.map((pendingRequest, index) => {
          const { request, origin, timestamp } = pendingRequest;
          const isActive = request.request_id === currentRequestId;
          const risk = getOperationRisk(request.type);
          
          return (
            <div key={request.request_id}>
              <div
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 border border-primary/20 shadow-sm'
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
                onClick={() => onSelectRequest(pendingRequest)}
              >
                <div className="flex items-start gap-3">
                  {/* Operation Icon */}
                  <span className="text-lg mt-0.5">
                    {getOperationIcon(request.type)}
                  </span>
                  
                  {/* Request Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {getOperationTitle(request.type)}
                      </span>
                      <Badge 
                        variant={getRiskBadgeVariant(risk)} 
                        className="text-xs h-4"
                      >
                        {risk}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate">
                      {getShortDescription(request)}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {origin}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  )}
                </div>
              </div>
              
              {index < requests.length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}