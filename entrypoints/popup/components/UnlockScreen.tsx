import React, { useState } from 'react';
import { browser } from 'wxt/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UnlockScreenProps {
  onUnlock: () => void;
}

export function UnlockScreen({ onUnlock }: UnlockScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await browser.runtime.sendMessage({
        action: 'unlockKeychain',
        password
      });

      if (response.success) {
        onUnlock();
      } else {
        setError(response.error || 'Invalid password');
        setFailedAttempts(response.failedAttempts || failedAttempts + 1);
        setPassword('');
      }
    } catch (err) {
      setError('Failed to communicate with extension');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[400px] w-[350px] flex items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>Unlock Etta Keychain</CardTitle>
          <CardDescription>
            Enter your password to access your accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {failedAttempts >= 3 && (
              <Alert>
                <AlertDescription>
                  {failedAttempts} failed attempts. Account will be locked after 5 attempts.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !password}
            >
              {loading ? 'Unlocking...' : 'Unlock'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}