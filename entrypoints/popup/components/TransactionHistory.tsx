import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TransactionHistoryItem {
  id: string;
  type: string;
  status: 'approved' | 'rejected' | 'failed' | 'confirmed';
  timestamp: number;
  origin: string;
  details: any;
  txId?: string;
  error?: string;
}

interface TransactionHistoryProps {
  className?: string;
}

export function TransactionHistory({ className }: TransactionHistoryProps) {
  const [history, setHistory] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'failed'>('all');

  useEffect(() => {
    loadTransactionHistory();
  }, []);

  const loadTransactionHistory = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getTransactionHistory',
        limit: 50
      });

      if (response.success && response.history) {
        setHistory(response.history);
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await browser.runtime.sendMessage({
        action: 'clearTransactionHistory'
      });
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

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
      'requestProxy': '🔄'
    };
    return iconMap[type] || '❓';
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'failed': return '⚠️';
      case 'confirmed': return '🎉';
      default: return '❓';
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'approved': return 'secondary';
      case 'rejected': 
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString();
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getOperationTitle = (type: string): string => {
    return type.replace('request', '').replace(/([A-Z])/g, ' $1').trim();
  };

  const getShortDescription = (item: TransactionHistoryItem): string => {
    const details = item.details;
    switch (item.type) {
      case 'requestTransfer':
        return `${details.amount} ${details.currency || 'STEEM'} → @${details.to}`;
      case 'requestVote':
        return `${details.weight > 0 ? 'Upvoted' : 'Downvoted'} @${details.author}`;
      case 'requestCustomJson':
        return details.displayName || details.id || 'Custom operation';
      case 'requestDelegateVestingShares':
        return `Delegated to @${details.delegatee}`;
      case 'requestPowerUp':
        return `Powered up ${details.steem} STEEM`;
      case 'requestPowerDown':
        return `Powered down ${details.steem} SP`;
      case 'requestWitnessVote':
        return `${details.vote ? 'Voted' : 'Unvoted'} @${details.witness}`;
      case 'requestPost':
        return details.title || 'Created post/comment';
      default:
        return `@${details.username || 'Unknown'}`;
    }
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const getFilterCount = (status: string): number => {
    if (status === 'all') return history.length;
    return history.filter(item => item.status === status).length;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">Loading transaction history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transaction History</CardTitle>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Clear History
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All ({getFilterCount('all')})
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">
              Approved ({getFilterCount('approved')})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">
              Rejected ({getFilterCount('rejected')})
            </TabsTrigger>
            <TabsTrigger value="failed" className="text-xs">
              Failed ({getFilterCount('failed')})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-3 mt-4">
            {filteredHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <div className="text-2xl mb-2">📭</div>
                <div>No {filter === 'all' ? '' : filter} transactions found</div>
              </div>
            ) : (
              filteredHistory.map((item, index) => (
                <div key={item.id}>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    {/* Operation and Status Icons */}
                    <div className="flex items-center gap-1">
                      <span className="text-lg">{getOperationIcon(item.type)}</span>
                      <span className="text-sm">{getStatusIcon(item.status)}</span>
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {getOperationTitle(item.type)}
                        </span>
                        <Badge 
                          variant={getStatusBadgeVariant(item.status)} 
                          className="text-xs h-4"
                        >
                          {item.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">
                        {getShortDescription(item)}
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.origin}</span>
                        <span>{formatTimestamp(item.timestamp)}</span>
                      </div>

                      {/* Transaction ID or Error */}
                      {item.txId && (
                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">TX: </span>
                          <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                            {item.txId.substring(0, 16)}...
                          </span>
                        </div>
                      )}

                      {item.error && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                          Error: {item.error}
                        </div>
                      )}
                    </div>
                  </div>

                  {index < filteredHistory.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}