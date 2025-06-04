import React, { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronRight, Plus, Trash2, User, Key, Shield, Mail, Edit3 } from 'lucide-react';

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
  const navigate = useNavigate();
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
    if (keys.posting) keyTypes.push({ type: 'posting', icon: Edit3, label: 'Posting' });
    if (keys.active) keyTypes.push({ type: 'active', icon: Key, label: 'Active' });
    if (keys.owner) keyTypes.push({ type: 'owner', icon: Shield, label: 'Owner' });
    if (keys.memo) keyTypes.push({ type: 'memo', icon: Mail, label: 'Memo' });
    
    return keyTypes.map(({ type, icon: Icon, label }) => (
      <span 
        key={type} 
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        title={label}
      >
        <Icon className="h-4 w-4" />
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
          <Button onClick={onAddAccount} className="gap-2">
            <Plus className="h-4 w-4" />
            Import Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Accounts</CardTitle>
          </div>
          <Button 
            onClick={onAddAccount} 
            size="sm" 
            className="gap-2 px-4 py-2 h-auto font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Active</label>
          <Select value={activeAccount} onValueChange={handleAccountSwitch}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(account => (
                <SelectItem key={account.name} value={account.name}>
                  @{account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="space-y-3">
            {accounts.map(account => (
              <div 
                key={account.name} 
                className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md ${
                  account.name === activeAccount 
                    ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-sm' 
                    : 'hover:border-primary/20 hover:bg-primary/5'
                }`}
              >
                <div 
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => navigate(`/account/${account.name}`)}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shrink-0">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-base">@{account.name}</span>
                      {account.name === activeAccount && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full border border-green-200 shrink-0">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {getKeyBadges(account.keys)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/account/${account.name}`)}
                    className="h-10 w-10 p-0 rounded-full hover:bg-primary/10"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  
                  <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDeleteAccount(account.name)}
                      className="h-10 w-10 p-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-5 w-5" />
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