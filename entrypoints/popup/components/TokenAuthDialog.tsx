import React, { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Globe, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TokenAuthRequest {
  id: string;
  origin: string;
  domain: string;
  requestedPermissions: string[];
  timestamp: number;
  account?: string;
}

interface TokenAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: TokenAuthRequest | null;
  onApprove: (token: string) => void;
  onDeny: () => void;
}

export function TokenAuthDialog({ 
  open, 
  onOpenChange, 
  request, 
  onApprove, 
  onDeny 
}: TokenAuthDialogProps) {
  const [accounts, setAccounts] = useState<Array<{name: string, keys: any}>>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open && request) {
      loadAccounts();
      generateAuthToken();
    }
  }, [open, request]);

  const loadAccounts = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getAccounts'
      });

      if (response.success) {
        setAccounts(response.accounts);
        if (response.accounts.length > 0) {
          setSelectedAccount(response.accounts[0].name);
        }
      }
    } catch (err) {
      setError('Failed to load accounts');
    }
  };

  const generateAuthToken = () => {
    // Generate a secure random token for this session
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setAuthToken(token);
  };

  const handleApprove = async () => {
    if (!selectedAccount || !authToken) {
      setError('Please select an account');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create authorization record
      const authRecord = {
        token: authToken,
        domain: request?.domain,
        account: selectedAccount,
        permissions: request?.requestedPermissions || [],
        granted: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      // Store authorization
      await browser.runtime.sendMessage({
        action: 'storeAuthorization',
        authorization: authRecord
      });

      onApprove(authToken);
    } catch (err) {
      setError('Failed to create authorization');
    } finally {
      setLoading(false);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'posting': return <Key className="h-4 w-4 text-blue-500" />;
      case 'active': return <Shield className="h-4 w-4 text-orange-500" />;
      case 'memo': return <Globe className="h-4 w-4 text-green-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPermissionDescription = (permission: string) => {
    switch (permission) {
      case 'posting': return 'Create posts, comments, and votes';
      case 'active': return 'Transfer funds and perform financial operations';
      case 'memo': return 'Encrypt and decrypt memo messages';
      default: return permission;
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Authorization Request
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{request.domain}</span> is requesting access to your STEEM account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Site Information */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4" />
              <span className="font-medium">Requesting Site</span>
            </div>
            <p className="text-sm text-muted-foreground">{request.origin}</p>
          </div>

          {/* Requested Permissions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Requested Permissions</Label>
            <div className="space-y-2">
              {request.requestedPermissions.map((permission) => (
                <div key={permission} className="flex items-center gap-3 p-2 border rounded">
                  {getPermissionIcon(permission)}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{permission.toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground">
                      {getPermissionDescription(permission)}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Required
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="account-select">Select Account</Label>
            <select
              id="account-select"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {accounts.map((account) => (
                <option key={account.name} value={account.name}>
                  @{account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Authorization Token Display */}
          <div className="space-y-2">
            <Label htmlFor="auth-token">Authorization Token</Label>
            <div className="p-2 bg-muted rounded font-mono text-xs break-all">
              {authToken}
            </div>
            <p className="text-xs text-muted-foreground">
              This token will be shared with the requesting site and expires in 24 hours
            </p>
          </div>

          {/* Security Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only approve if you trust this site. Authorized sites can perform actions on your behalf using the selected account.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onDeny}
            disabled={loading}
          >
            Deny Access
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={loading || !selectedAccount}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Authorizing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Authorize Access
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}