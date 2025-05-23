import React, { useState, useCallback } from 'react';
import { browser } from 'wxt/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';

interface AccountInfo {
  name: string;
  created: string;
  posting: any;
  active: any;
  owner: any;
  memo_key: string;
  json_metadata: string;
  posting_json_metadata: string;
  reputation?: string;
  balance?: string;
  vesting_shares?: string;
}

interface AccountLookupProps {
  onAccountFound?: (account: AccountInfo) => void;
  showImportButton?: boolean;
  onImport?: (username: string) => void;
}

export function AccountLookup({ onAccountFound, showImportButton = true, onImport }: AccountLookupProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'slow'>('online');

  const validateUsername = (name: string): boolean => {
    if (!name) return false;
    if (name.length < 3 || name.length > 16) return false;
    return /^[a-z][a-z0-9.-]*$/.test(name);
  };

  const lookupAccount = useCallback(async () => {
    if (!validateUsername(username)) {
      setError('Invalid username. Must be 3-16 characters, start with a letter, and contain only lowercase letters, numbers, dots, and hyphens.');
      return;
    }

    setLoading(true);
    setError(null);
    setAccountInfo(null);
    setNetworkStatus('online');

    const startTime = Date.now();

    try {
      const response = await browser.runtime.sendMessage({
        action: 'getAccount',
        payload: { username: username.toLowerCase().trim() }
      });

      const responseTime = Date.now() - startTime;
      if (responseTime > 3000) {
        setNetworkStatus('slow');
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch account');
      }

      if (!response.data || response.data.length === 0) {
        throw new Error('Account not found');
      }

      const account = response.data[0];
      setAccountInfo(account);
      onAccountFound?.(account);
      setRetryCount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to STEEM network');
      setNetworkStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [username, onAccountFound]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    lookupAccount();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAuthorityCount = (authority: any) => {
    if (!authority || !authority.key_auths) return 0;
    return authority.key_auths.length;
  };

  const getProfileImage = (account: AccountInfo) => {
    try {
      const metadata = JSON.parse(account.json_metadata || '{}');
      return metadata.profile?.profile_image || null;
    } catch {
      return null;
    }
  };

  const NetworkStatusIndicator = () => {
    if (networkStatus === 'offline') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Offline
        </Badge>
      );
    }
    if (networkStatus === 'slow') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Slow Connection
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Connected
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Account Lookup</CardTitle>
            <CardDescription>
              Search for a STEEM account on the blockchain
            </CardDescription>
          </div>
          <NetworkStatusIndicator />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">STEEM Username</Label>
          <div className="flex gap-2">
            <Input
              id="username"
              placeholder="Enter username (e.g., alice.steem)"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              onKeyDown={(e) => e.key === 'Enter' && lookupAccount()}
              disabled={loading}
            />
            <Button
              onClick={lookupAccount}
              disabled={loading || !username.trim()}
              size="icon"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              {retryCount < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetry}
                  className="ml-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {accountInfo && (
          <div className="space-y-4">
            <Separator />
            
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={getProfileImage(accountInfo)} />
                <AvatarFallback>{accountInfo.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="text-lg font-semibold">@{accountInfo.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Created on {formatDate(accountInfo.created)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-help">
                          Owner Keys: {getAuthorityCount(accountInfo.owner)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Highest permission level - can change all keys</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-help">
                          Active Keys: {getAuthorityCount(accountInfo.active)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Can perform financial transactions</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-help">
                          Posting Keys: {getAuthorityCount(accountInfo.posting)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Can post, vote, and comment</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-help">
                          Memo Key: {accountInfo.memo_key ? '✓' : '✗'}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Used for encrypted messages</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {showImportButton && onImport && (
                  <Button
                    onClick={() => onImport(accountInfo.name)}
                    className="w-full mt-4"
                  >
                    Import This Account
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}