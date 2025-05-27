import React, { useState } from 'react';
import { browser } from 'wxt/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PasswordSetupProps {
  onPasswordSet: () => void;
}

export function PasswordSetup({ onPasswordSet }: PasswordSetupProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState<{
    score: number;
    feedback: string[];
  }>({ score: 0, feedback: [] });

  const checkPasswordStrength = (pwd: string) => {
    const feedback: string[] = [];
    let score = 0;

    if (pwd.length < 8) {
      feedback.push('Password must be at least 8 characters');
    } else if (pwd.length >= 12) {
      score += 1;
    }

    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    if (!hasLower) feedback.push('Include lowercase letters');
    if (!hasUpper) feedback.push('Include uppercase letters');
    if (!hasNumber) feedback.push('Include numbers');
    if (!hasSpecial) feedback.push('Include special characters');

    const variety = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    score += variety;

    setStrength({ score: Math.min(4, score), feedback });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    checkPasswordStrength(pwd);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (strength.feedback.length > 0) {
      setError('Please create a stronger password');
      return;
    }

    setLoading(true);
    try {
      // Call background script to setup password
      const response = await browser.runtime.sendMessage({
        action: 'setupKeychainPassword',
        password,
        confirmPassword
      });

      if (response.success) {
        onPasswordSet();
      } else {
        setError(response.error || 'Failed to set password');
      }
    } catch (err) {
      setError('Failed to communicate with extension');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (strength.score === 0) return 'bg-gray-300';
    if (strength.score === 1) return 'bg-red-500';
    if (strength.score === 2) return 'bg-orange-500';
    if (strength.score === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Keychain Password</CardTitle>
        <CardDescription>
          Create a strong password to protect your Etta Keychain
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
              onChange={handlePasswordChange}
              placeholder="Enter a strong password"
              disabled={loading}
            />
            {password && (
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded">
                  <div 
                    className={`h-full rounded transition-all ${getStrengthColor()}`}
                    style={{ width: `${(strength.score / 4) * 100}%` }}
                  />
                </div>
                {strength.feedback.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {strength.feedback.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={loading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !password || !confirmPassword}
          >
            {loading ? 'Setting up...' : 'Setup Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}