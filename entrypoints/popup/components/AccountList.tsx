import React, { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Account {
  name: string;
  keys: {
    posting?: boolean;
    active?: boolean;
    owner?: boolean;
    memo?: boolean;
  };
}

interface AccountListProps {
  onAddAccount: () => void;
}

export function AccountList({ onAddAccount }: AccountListProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteAccount, setDeleteAccount] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getAccounts'
      });

      if (response.success) {
        setAccounts(response.accounts || []);
        setActiveAccount(response.activeAccount || '');
      } else {
        setError(response.error || 'Failed to load accounts');
      }
    } catch (err) {
      setError('Failed to communicate with extension');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSwitch = async (accountName: string) => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'switchAccount',
        accountName
      });

      if (response.success) {
        setActiveAccount(accountName);
      } else {
        setError(response.error || 'Failed to switch account');
      }
    } catch (err) {
      setError('Failed to communicate with extension');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccount) return;

    setDeleting(true);
    try {
      const response = await browser.runtime.sendMessage({
        action: 'deleteAccount',
        accountName: deleteAccount
      });

      if (response.success) {
        await loadAccounts();
        setDeleteAccount(null);
      } else {
        setError(response.error || 'Failed to delete account');
      }
    } catch (err) {
      setError('Failed to communicate with extension');
    } finally {
      setDeleting(false);
    }
  };

  const getKeyBadges = (keys: Account['keys']) => {
    const keyTypes = [];
    if (keys.posting) keyTypes.push('P');
    if (keys.active) keyTypes.push('A');
    if (keys.owner) keyTypes.push('O');
    if (keys.memo) keyTypes.push('M');
    
    return keyTypes.map(type => (
      <span 
        key={type} 
        className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full bg-primary/10 text-primary"
        title={
          type === 'P' ? 'Posting' : 
          type === 'A' ? 'Active' : 
          type === 'O' ? 'Owner' : 'Memo'
        }
      >
        {type}
      </span>
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading accounts...</div>
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-muted-foreground">No accounts imported yet</p>
          <Button onClick={onAddAccount}>Import Account</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Accounts</CardTitle>
            <CardDescription>
              Manage your STEEM accounts
            </CardDescription>
          </div>
          <Button onClick={onAddAccount} size="sm">
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Active Account</label>
          <Select value={activeAccount} onValueChange={handleAccountSwitch}>
            <SelectTrigger>
              <SelectValue placeholder="Select active account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(account => (
                <SelectItem key={account.name} value={account.name}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">All Accounts</h4>
          <div className="space-y-2">
            {accounts.map(account => (
              <div 
                key={account.name} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  account.name === activeAccount ? 'bg-primary/5 border-primary/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">@{account.name}</div>
                    <div className="flex gap-1 mt-1">
                      {getKeyBadges(account.keys)}
                    </div>
                  </div>
                  {account.name === activeAccount && (
                    <span className="text-xs text-primary font-medium">ACTIVE</span>
                  )}
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDeleteAccount(account.name)}
                    >
                      Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Account</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to remove @{account.name} from Etta Keychain? 
                        This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteAccount(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting...' : 'Delete Account'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}