import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UniversalAsset {
  universal_id: string;
  domain: string;
  current_owner: string;
  base_metadata: {
    name: string;
    description: string;
    image_url?: string;
    core_attributes: Record<string, any>;
    tags: string[];
  };
  properties: {
    tradeable: boolean;
    transferable: boolean;
    burnable: boolean;
    mintable: boolean;
  };
  minting_status: 'unminted' | 'pending' | 'minted';
  blockchain_data?: {
    transaction_id: string;
    block_number: number;
    timestamp: string;
  };
  economic_data?: {
    current_value?: { amount: string; currency: string };
    last_sale?: { amount: string; currency: string; timestamp: string };
  };
}

interface PortfolioSummary {
  total_assets: number;
  minted_assets: number;
  unminted_assets: number;
  pending_assets: number;
  domains: Record<string, number>;
  total_value?: { amount: string; currency: string };
  recent_activity: {
    action: 'minted' | 'transferred' | 'received';
    asset_name: string;
    timestamp: string;
  }[];
}

interface AssetPortfolioViewProps {
  username: string;
  onViewFullPortfolio: () => void;
  onMintAssets: (assets: UniversalAsset[]) => void;
  onTransferAsset: (asset: UniversalAsset) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function AssetPortfolioView({
  username,
  onViewFullPortfolio,
  onMintAssets,
  onTransferAsset,
  onRefresh,
  isLoading = false
}: AssetPortfolioViewProps) {
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [recentAssets, setRecentAssets] = useState<UniversalAsset[]>([]);
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadPortfolioSummary();
  }, [username]);

  const loadPortfolioSummary = async () => {
    if (!username) return;
    
    setLoadingState('loading');
    setErrorMessage('');

    try {
      // Mock portfolio data - in real implementation, this would call the extension API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockSummary: PortfolioSummary = {
        total_assets: 12,
        minted_assets: 8,
        unminted_assets: 3,
        pending_assets: 1,
        domains: {
          'gaming': 7,
          'domains': 3,
          'collectibles': 2
        },
        total_value: { amount: '15.250', currency: 'STEEM' },
        recent_activity: [
          { action: 'minted', asset_name: 'Fire Dragon #001', timestamp: '2024-01-15T10:30:00Z' },
          { action: 'transferred', asset_name: 'example.steem', timestamp: '2024-01-14T15:45:00Z' },
          { action: 'received', asset_name: 'Mystic Sword', timestamp: '2024-01-13T09:15:00Z' }
        ]
      };

      const mockRecentAssets: UniversalAsset[] = [
        {
          universal_id: 'asset_001',
          domain: 'gaming',
          current_owner: username,
          base_metadata: {
            name: 'Fire Dragon #001',
            description: 'A legendary fire-breathing dragon',
            image_url: 'https://example.com/dragon.jpg',
            core_attributes: { rarity: 'legendary', element: 'fire' },
            tags: ['dragon', 'fire', 'legendary']
          },
          properties: {
            tradeable: true,
            transferable: true,
            burnable: false,
            mintable: false
          },
          minting_status: 'minted',
          blockchain_data: {
            transaction_id: 'abc123',
            block_number: 50123456,
            timestamp: '2024-01-15T10:30:00Z'
          },
          economic_data: {
            current_value: { amount: '5.000', currency: 'STEEM' }
          }
        },
        {
          universal_id: 'asset_002',
          domain: 'domains',
          current_owner: username,
          base_metadata: {
            name: 'example.steem',
            description: 'A premium STEEM domain',
            core_attributes: { length: 7, tld: 'steem' },
            tags: ['domain', 'premium']
          },
          properties: {
            tradeable: true,
            transferable: true,
            burnable: false,
            mintable: false
          },
          minting_status: 'unminted'
        }
      ];

      setPortfolioSummary(mockSummary);
      setRecentAssets(mockRecentAssets);
      setLoadingState('idle');
    } catch (error) {
      setLoadingState('error');
      setErrorMessage('Failed to load portfolio data');
    }
  };

  const handleMintUnminted = () => {
    const unmintedAssets = recentAssets.filter(asset => asset.minting_status === 'unminted');
    if (unmintedAssets.length > 0) {
      onMintAssets(unmintedAssets);
    }
  };

  const getDomainIcon = (domain: string) => {
    const icons: Record<string, string> = {
      'gaming': '🎮',
      'domains': '🌐',
      'collectibles': '💎',
      'music': '🎵',
      'art': '🎨'
    };
    return icons[domain] || '📄';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loadingState === 'loading') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Portfolio Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading portfolio...</span>
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
              📊 Portfolio Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
            <Button onClick={loadPortfolioSummary} variant="outline" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!portfolioSummary) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Portfolio Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No portfolio data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            📊 Portfolio Overview
          </CardTitle>
          <CardDescription>
            {username}'s asset portfolio summary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Asset Count Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {portfolioSummary.total_assets}
              </div>
              <div className="text-sm text-blue-600">Total Assets</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {portfolioSummary.minted_assets}
              </div>
              <div className="text-sm text-green-600">Minted</div>
            </div>
          </div>

          {/* Domain Distribution */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Assets by Domain</h4>
            <div className="space-y-1">
              {Object.entries(portfolioSummary.domains).map(([domain, count]) => (
                <div key={domain} className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1">
                    {getDomainIcon(domain)} {domain}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Value */}
          {portfolioSummary.total_value && (
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimated Value:</span>
                <span className="font-medium text-green-600">
                  {portfolioSummary.total_value.amount} {portfolioSummary.total_value.currency}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            <Button 
              onClick={onViewFullPortfolio}
              variant="outline"
              className="justify-start"
            >
              🔍 View Full Portfolio
            </Button>
            
            {portfolioSummary.unminted_assets > 0 && (
              <Button 
                onClick={handleMintUnminted}
                variant="outline"
                className="justify-start"
              >
                🪙 Mint {portfolioSummary.unminted_assets} Unminted Assets
              </Button>
            )}
            
            <Button 
              onClick={onRefresh}
              variant="outline"
              className="justify-start"
              disabled={isLoading}
            >
              🔄 Refresh Portfolio
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Assets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-32 overflow-y-auto">
            <div className="space-y-2">
              {recentAssets.map((asset) => (
                <div key={asset.universal_id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                  <div className="w-8 h-8 bg-gray-200 rounded-md flex items-center justify-center text-xs">
                    {getDomainIcon(asset.domain)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{asset.base_metadata.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={asset.minting_status === 'minted' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {asset.minting_status}
                      </Badge>
                      <span className="text-xs text-gray-500">{asset.domain}</span>
                    </div>
                  </div>
                  {asset.minting_status === 'minted' && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onTransferAsset(asset)}
                      className="h-6 w-6 p-0"
                    >
                      📤
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-24 overflow-y-auto">
            <div className="space-y-2">
              {portfolioSummary.recent_activity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <span className="text-xs">
                    {activity.action === 'minted' && '🪙'}
                    {activity.action === 'transferred' && '📤'}
                    {activity.action === 'received' && '📥'}
                  </span>
                  <span className="flex-1 truncate">
                    {activity.action} {activity.asset_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}