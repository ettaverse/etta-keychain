import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetPortfolioView } from '../components/AssetPortfolioView';
import { AssetMintForm } from '../components/AssetMintForm';
import { AssetTransferForm } from '../components/AssetTransferForm';
import type { Keys } from '@/src/interfaces';

interface AccountDetailsData {
  username: string;
  isActive: boolean;
  isMasterPassword: boolean;
}

export const AccountDetails = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountDetailsData | null>(null);
  const [keys, setKeys] = useState<Keys | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  
  // Portfolio and operations state
  const [activeTab, setActiveTab] = useState<'keys' | 'portfolio' | 'operations'>('keys');
  const [operationMode, setOperationMode] = useState<'overview' | 'mint' | 'transfer' | null>('overview');
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  // Handle URL parameters for tab switching
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['keys', 'portfolio', 'operations'].includes(tabParam)) {
      setActiveTab(tabParam as 'keys' | 'portfolio' | 'operations');
    }
  }, []);

  useEffect(() => {
    const loadAccountDetails = async () => {
      if (!username) {
        setError('No username provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await chrome.runtime.sendMessage({
          type: 'keychain-get-account-details',
          payload: { username }
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to load account details');
        }

        setAccount(response.account);
        setKeys(response.keys);
        // Extract master password if it exists
        if (response.account.isMasterPassword && response.masterPassword) {
          setMasterPassword(response.masterPassword);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load account details');
      } finally {
        setLoading(false);
      }
    };

    loadAccountDetails();
  }, [username]);

  const toggleKeyVisibility = (keyType: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyType)) {
        newSet.delete(keyType);
      } else {
        newSet.add(keyType);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (key: string, keyType: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKeys(prev => new Set(prev).add(keyType));
      setTimeout(() => {
        setCopiedKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(keyType);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const maskKey = (key: string) => {
    return '•'.repeat(Math.min(key.length, 50));
  };

  const getKeyTypeLabel = (keyType: string) => {
    const labels: Record<string, string> = {
      posting: 'Posting',
      active: 'Active',
      memo: 'Memo',
      owner: 'Owner',
      master: 'Master Password'
    };
    return labels[keyType] || keyType;
  };

  const getKeyTypeDescription = (keyType: string) => {
    const descriptions: Record<string, string> = {
      posting: 'Social actions',
      active: 'Transactions',
      memo: 'Private messages',
      owner: 'Account recovery',
      master: 'Master password'
    };
    return descriptions[keyType] || '';
  };

  // Portfolio operation handlers
  const handleViewFullPortfolio = () => {
    setActiveTab('portfolio');
  };

  const handleMintAssets = (assets: any[]) => {
    setSelectedAssets(assets);
    setOperationMode('mint');
    setActiveTab('operations');
  };

  const handleTransferAsset = (asset: any) => {
    setSelectedAsset(asset);
    setOperationMode('transfer');
    setActiveTab('operations');
  };

  const handleRefreshPortfolio = () => {
    // Trigger portfolio refresh logic here
    console.log('Refreshing portfolio...');
  };

  const handleMintSubmit = (mintingRequest: any) => {
    console.log('Submitting mint request:', mintingRequest);
    // Handle minting logic here
    setOperationMode('overview');
  };

  const handleTransferSubmit = (transferRequest: any) => {
    console.log('Submitting transfer request:', transferRequest);
    // Handle transfer logic here
    setOperationMode('overview');
  };

  const handleOperationCancel = () => {
    setOperationMode('overview');
    setSelectedAssets([]);
    setSelectedAsset(null);
  };

  const renderKeyCard = (keyType: string, publicKey: string | undefined, privateKey: string | undefined, isPassword = false) => {
    const isVisible = visibleKeys.has(keyType);
    const isCopied = copiedKeys.has(keyType);
    const hasPrivateKey = Boolean(privateKey);

    return (
      <Card key={keyType} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{getKeyTypeLabel(keyType)}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {getKeyTypeDescription(keyType)}
              </CardDescription>
            </div>
            {keyType === 'owner' && (
              <Badge variant="destructive">Sensitive</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPassword && publicKey && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Public Key</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(publicKey, `${keyType}-public`)}
                >
                  {copiedKeys.has(`${keyType}-public`) ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <code className="block p-3 bg-muted rounded-md text-xs break-all font-mono">
                {publicKey}
              </code>
            </div>
          )}

          {hasPrivateKey && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {isPassword ? 'Password' : 'Private Key'}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleKeyVisibility(keyType)}
                  >
                    {isVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  {isVisible && privateKey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(privateKey, keyType)}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <code className="block p-3 bg-muted rounded-md text-xs break-all font-mono">
                {isVisible ? privateKey : maskKey(privateKey || '')}
              </code>
            </div>
          )}

          {!hasPrivateKey && !publicKey && (
            <Alert>
              <AlertDescription>
                Not stored
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !account || !keys) {
    return (
      <div className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/accounts')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>
            {error || 'Account not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderKeysContent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Keys</h2>
        
        {account?.isMasterPassword && masterPassword && (
          <>
            {renderKeyCard('master', undefined, masterPassword, true)}
            <Separator className="my-6" />
          </>
        )}

        {keys && (
          <>
            {renderKeyCard('posting', keys.postingPubkey, keys.posting)}
            {renderKeyCard('active', keys.activePubkey, keys.active)}
            {renderKeyCard('memo', keys.memoPubkey, keys.memo)}
            {renderKeyCard('owner', keys.ownerPubkey, keys.owner)}
          </>
        )}
      </div>
    </div>
  );

  const renderPortfolioContent = () => {
    if (!username) return null;
    
    return (
      <AssetPortfolioView
        username={username}
        onViewFullPortfolio={handleViewFullPortfolio}
        onMintAssets={handleMintAssets}
        onTransferAsset={handleTransferAsset}
        onRefresh={handleRefreshPortfolio}
      />
    );
  };

  const renderOperationsContent = () => {
    if (!username) return null;

    if (operationMode === 'mint' && selectedAssets.length > 0) {
      return (
        <AssetMintForm
          selectedAssets={selectedAssets}
          currentAccount={username}
          onSubmit={handleMintSubmit}
          onCancel={handleOperationCancel}
        />
      );
    }

    if (operationMode === 'transfer' && selectedAsset) {
      return (
        <AssetTransferForm
          asset={selectedAsset}
          currentAccount={username}
          onSubmit={handleTransferSubmit}
          onCancel={handleOperationCancel}
        />
      );
    }

    // Default overview state
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Asset Operations</CardTitle>
            <CardDescription>
              Manage your blockchain assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Select assets from the Portfolio tab to mint or transfer them.
            </p>
            <Button 
              onClick={() => setActiveTab('portfolio')} 
              className="mt-4"
              variant="outline"
            >
              Go to Portfolio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/accounts')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">@{account.username}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={account.isActive ? 'default' : 'secondary'}>
            {account.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {account.isMasterPassword && (
            <Badge variant="outline">Master Password</Badge>
          )}
        </div>
      </div>

      <Separator className="mb-6" />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'keys' | 'portfolio' | 'operations')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keys">🔑 Keys</TabsTrigger>
          <TabsTrigger value="portfolio">📊 Portfolio</TabsTrigger>
          <TabsTrigger value="operations">⚙️ Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="mt-6">
          {renderKeysContent()}
        </TabsContent>

        <TabsContent value="portfolio" className="mt-6">
          {renderPortfolioContent()}
        </TabsContent>

        <TabsContent value="operations" className="mt-6">
          {renderOperationsContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
};