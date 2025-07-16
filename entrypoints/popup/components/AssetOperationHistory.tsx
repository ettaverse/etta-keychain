import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface AssetOperation {
  id: string;
  type: 'mint' | 'transfer' | 'convert' | 'burn' | 'receive';
  asset_name: string;
  asset_id: string;
  transaction_id: string;
  block_number: number;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  details: {
    from_user?: string;
    to_user?: string;
    amount?: { value: string; currency: string };
    game_context?: string;
    error_message?: string;
  };
  gas_fee?: { amount: string; currency: string };
}

interface OperationStats {
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  pending_operations: number;
  total_gas_paid: { amount: string; currency: string };
  most_active_day: string;
}

interface AssetOperationHistoryProps {
  username: string;
  onViewTransaction: (transactionId: string) => void;
  onRetryOperation: (operation: AssetOperation) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function AssetOperationHistory({
  username,
  onViewTransaction,
  onRetryOperation,
  onRefresh,
  isLoading = false
}: AssetOperationHistoryProps) {
  const [operations, setOperations] = useState<AssetOperation[]>([]);
  const [stats, setStats] = useState<OperationStats | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'confirmed' | 'failed'>('all');
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadOperationHistory();
  }, [username]);

  const loadOperationHistory = async () => {
    if (!username) return;

    setLoadingState('loading');
    setErrorMessage('');

    try {
      // Mock operation history data - in real implementation, this would call the extension API
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockOperations: AssetOperation[] = [
        {
          id: 'op_001',
          type: 'mint',
          asset_name: 'Fire Dragon #001',
          asset_id: 'asset_001',
          transaction_id: 'abc123def456',
          block_number: 50123456,
          timestamp: '2024-01-15T10:30:00Z',
          status: 'confirmed',
          details: {
            to_user: username
          },
          gas_fee: { amount: '0.001', currency: 'STEEM' }
        },
        {
          id: 'op_002',
          type: 'transfer',
          asset_name: 'example.steem',
          asset_id: 'asset_002',
          transaction_id: 'def456ghi789',
          block_number: 50123420,
          timestamp: '2024-01-14T15:45:00Z',
          status: 'confirmed',
          details: {
            from_user: username,
            to_user: 'alice',
            amount: { value: '5.000', currency: 'STEEM' }
          },
          gas_fee: { amount: '0.002', currency: 'STEEM' }
        },
        {
          id: 'op_003',
          type: 'receive',
          asset_name: 'Mystic Sword',
          asset_id: 'asset_003',
          transaction_id: 'ghi789jkl012',
          block_number: 50123380,
          timestamp: '2024-01-13T09:15:00Z',
          status: 'confirmed',
          details: {
            from_user: 'bob',
            to_user: username
          },
          gas_fee: { amount: '0.001', currency: 'STEEM' }
        },
        {
          id: 'op_004',
          type: 'convert',
          asset_name: 'Magic Crystal',
          asset_id: 'asset_004',
          transaction_id: 'pending_tx',
          block_number: 0,
          timestamp: '2024-01-16T08:00:00Z',
          status: 'pending',
          details: {
            game_context: 'splinterlands_to_cbm'
          },
          gas_fee: { amount: '0.003', currency: 'STEEM' }
        },
        {
          id: 'op_005',
          type: 'mint',
          asset_name: 'Invalid Asset',
          asset_id: 'asset_005',
          transaction_id: 'failed_tx',
          block_number: 0,
          timestamp: '2024-01-12T14:30:00Z',
          status: 'failed',
          details: {
            error_message: 'Insufficient funds for minting operation'
          }
        }
      ];

      const mockStats: OperationStats = {
        total_operations: mockOperations.length,
        successful_operations: mockOperations.filter(op => op.status === 'confirmed').length,
        failed_operations: mockOperations.filter(op => op.status === 'failed').length,
        pending_operations: mockOperations.filter(op => op.status === 'pending').length,
        total_gas_paid: { amount: '0.007', currency: 'STEEM' },
        most_active_day: '2024-01-15'
      };

      setOperations(mockOperations);
      setStats(mockStats);
      setLoadingState('idle');
    } catch (error) {
      setLoadingState('error');
      setErrorMessage('Failed to load operation history');
    }
  };

  const filteredOperations = operations.filter(op => {
    if (selectedFilter === 'all') return true;
    return op.status === selectedFilter;
  });

  const getOperationIcon = (type: AssetOperation['type']) => {
    const icons = {
      'mint': '🪙',
      'transfer': '📤',
      'convert': '⚡',
      'burn': '🔥',
      'receive': '📥'
    };
    return icons[type];
  };

  const getStatusColor = (status: AssetOperation['status']) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTransactionId = (txId: string) => {
    if (txId.length <= 12) return txId;
    return `${txId.slice(0, 6)}...${txId.slice(-6)}`;
  };

  if (loadingState === 'loading') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📋 Operation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading history...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingState === 'error') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📋 Operation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
            <Button onClick={loadOperationHistory} variant="outline" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            📋 Operation History
          </CardTitle>
          <CardDescription>
            {username}'s asset operation history
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Operations:</span>
                  <span className="font-medium">{stats.total_operations}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Successful:</span>
                  <span className="font-medium text-green-600">{stats.successful_operations}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Failed:</span>
                  <span className="font-medium text-red-600">{stats.failed_operations}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Pending:</span>
                  <span className="font-medium text-yellow-600">{stats.pending_operations}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Gas Paid:</span>
                  <span className="font-medium">
                    {stats.total_gas_paid.amount} {stats.total_gas_paid.currency}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedFilter} onValueChange={(value) => setSelectedFilter(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedFilter} className="mt-4">
              {/* <ScrollArea className="h-64"> */}
                <div className="space-y-3 h-64 overflow-y-auto">
                  {filteredOperations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No {selectedFilter === 'all' ? '' : selectedFilter} operations found
                    </div>
                  ) : (
                    filteredOperations.map((operation) => (
                      <div key={operation.id} className="border rounded-lg p-3 space-y-2">
                        {/* Operation Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getOperationIcon(operation.type)}</span>
                            <div>
                              <p className="font-medium text-sm">{operation.asset_name}</p>
                              <p className="text-xs text-gray-500 capitalize">{operation.type}</p>
                            </div>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(operation.status)}`}>
                            {operation.status}
                          </Badge>
                        </div>

                        {/* Operation Details */}
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Transaction:</span>
                            <button
                              onClick={() => onViewTransaction(operation.transaction_id)}
                              className="text-blue-600 hover:underline font-mono"
                            >
                              {formatTransactionId(operation.transaction_id)}
                            </button>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-500">Time:</span>
                            <span>{formatTimestamp(operation.timestamp)}</span>
                          </div>

                          {operation.block_number > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Block:</span>
                              <span className="font-mono">{operation.block_number}</span>
                            </div>
                          )}

                          {operation.details.from_user && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">From:</span>
                              <span className="font-mono">{operation.details.from_user}</span>
                            </div>
                          )}

                          {operation.details.to_user && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">To:</span>
                              <span className="font-mono">{operation.details.to_user}</span>
                            </div>
                          )}

                          {operation.details.amount && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Amount:</span>
                              <span className="font-medium">
                                {operation.details.amount.value} {operation.details.amount.currency}
                              </span>
                            </div>
                          )}

                          {operation.details.game_context && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Game:</span>
                              <span>{operation.details.game_context}</span>
                            </div>
                          )}

                          {operation.gas_fee && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Gas Fee:</span>
                              <span className="text-red-600">
                                {operation.gas_fee.amount} {operation.gas_fee.currency}
                              </span>
                            </div>
                          )}

                          {operation.status === 'failed' && operation.details.error_message && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-red-700">
                              <p className="text-xs">{operation.details.error_message}</p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewTransaction(operation.transaction_id)}
                            className="h-7 text-xs"
                          >
                            View Details
                          </Button>
                          
                          {operation.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRetryOperation(operation)}
                              className="h-7 text-xs"
                            >
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              {/* </ScrollArea> */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button
          onClick={onRefresh}
          variant="outline"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Refreshing...' : '🔄 Refresh History'}
        </Button>
      </div>
    </div>
  );
}