import React, { useState } from 'react';
import { browser } from 'wxt/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AccountImportFormProps {
  onImportSuccess: () => void;
}

export function AccountImportForm({ onImportSuccess }: AccountImportFormProps) {
  const [username, setUsername] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [keyType, setKeyType] = useState<'posting' | 'active' | 'owner' | 'memo'>('posting');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [accountValid, setAccountValid] = useState<boolean | null>(null);

  const validateUsername = async (user: string) => {
    if (!user || user.length < 3) {
      setAccountValid(null);
      return;
    }

    setValidating(true);
    try {
      const response = await browser.runtime.sendMessage({
        action: 'validateAccount',
        username: user
      });

      setAccountValid(response.exists);
      if (!response.exists) {
        setError('Account not found on STEEM blockchain');
      } else {
        setError('');
      }
    } catch (err) {
      setError('Failed to validate account');
      setAccountValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const user = e.target.value.toLowerCase();
    setUsername(user);
    setError('');
    // Debounce validation
    const timer = setTimeout(() => validateUsername(user), 500);
    return () => clearTimeout(timer);
  };

  const handleMasterPasswordImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await browser.runtime.sendMessage({
        action: 'importAccountWithMasterPassword',
        username,
        password: masterPassword
      });

      if (response.success) {
        onImportSuccess();
      } else {
        setError(response.error || 'Failed to import account');
      }
    } catch (err) {
      setError('Failed to communicate with extension');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivateKeyImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await browser.runtime.sendMessage({
        action: 'importAccountWithWIF',
        username,
        wif: privateKey,
        keyType
      });

      if (response.success) {
        onImportSuccess();
      } else {
        setError(response.error || 'Failed to import account');
      }
    } catch (err) {
      setError('Failed to communicate with extension');
    } finally {
      setLoading(false);
    }
  };

  const getUsernameValidationIcon = () => {
    if (validating) return '⏳';
    if (accountValid === true) return '✅';
    if (accountValid === false) return '❌';
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import STEEM Account</CardTitle>
        <CardDescription>
          Add your STEEM account using master password or private keys
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">STEEM Username</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter your STEEM username"
                disabled={loading}
                className="pr-8"
              />
              <span className="absolute right-2 top-2.5 text-sm">
                {getUsernameValidationIcon()}
              </span>
            </div>
          </div>

          <Tabs defaultValue="master" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="master">Master Password</TabsTrigger>
              <TabsTrigger value="keys">Private Keys</TabsTrigger>
            </TabsList>

            <TabsContent value="master" className="space-y-4">
              <form onSubmit={handleMasterPasswordImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="masterPassword">Master Password</Label>
                  <Input
                    id="masterPassword"
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Enter your master password"
                    disabled={loading || !accountValid}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will derive all your keys from your master password
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !username || !masterPassword || !accountValid}
                >
                  {loading ? 'Importing...' : 'Import with Master Password'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="keys" className="space-y-4">
              <form onSubmit={handlePrivateKeyImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyType">Key Type</Label>
                  <Select value={keyType} onValueChange={(value: any) => setKeyType(value)}>
                    <SelectTrigger id="keyType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="posting">Posting Key</SelectItem>
                      <SelectItem value="active">Active Key</SelectItem>
                      <SelectItem value="owner">Owner Key</SelectItem>
                      <SelectItem value="memo">Memo Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="privateKey">Private Key (WIF)</Label>
                  <Input
                    id="privateKey"
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="5K... or P5K..."
                    disabled={loading || !accountValid}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your private key will be encrypted and stored securely
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !username || !privateKey || !accountValid}
                >
                  {loading ? 'Importing...' : 'Import with Private Key'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}