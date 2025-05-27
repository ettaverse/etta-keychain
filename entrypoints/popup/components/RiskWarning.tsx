import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeychainRequest } from '../../background/services/types/keychain-api.types';

interface RiskWarningProps {
  request: KeychainRequest;
  className?: string;
}

interface RiskInfo {
  level: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  warnings: string[];
  recommendations: string[];
}

export function RiskWarning({ request, className }: RiskWarningProps) {
  const getRiskInfo = (request: KeychainRequest): RiskInfo => {
    switch (request.type) {
      case 'requestPowerDown':
        return {
          level: 'high',
          title: 'Power Down Warning',
          description: 'You are about to start the power down process.',
          warnings: [
            'This will reduce your voting power and influence on STEEM',
            'Power down takes 13 weeks to complete with weekly payments',
            'You cannot cancel this process once started',
            'Your STEEM Power will be converted back to liquid STEEM over time'
          ],
          recommendations: [
            'Consider if you really need to reduce your STEEM Power',
            'Remember that STEEM Power gives you more influence in governance',
            'You can always power up again later if needed'
          ]
        };

      case 'requestRemoveAccountAuthority':
        return {
          level: 'critical',
          title: 'Account Authority Removal',
          description: 'You are removing account authority permissions.',
          warnings: [
            'This will revoke posting/active permissions for another account',
            'The authorized account will no longer be able to act on your behalf',
            'This action cannot be easily undone',
            'Make sure you trust the consequences of this change'
          ],
          recommendations: [
            'Verify that you want to remove access for this specific account',
            'Consider the impact on any services using this authorization',
            'Make sure you still have control of your account after this change'
          ]
        };

      case 'requestRemoveKeyAuthority':
        return {
          level: 'critical',
          title: 'Key Authority Removal',
          description: 'You are removing key authority permissions.',
          warnings: [
            'This will revoke permissions for a specific public key',
            'Applications using this key will lose access',
            'This action cannot be easily undone',
            'Ensure you understand which services will be affected'
          ],
          recommendations: [
            'Verify the public key you are removing',
            'Check which applications might be using this key',
            'Make sure you have alternative access methods'
          ]
        };

      case 'requestAddAccountAuthority':
        return {
          level: 'high',
          title: 'Account Authority Grant',
          description: 'You are granting account authority to another user.',
          warnings: [
            'This gives another account permission to act on your behalf',
            'They will be able to perform actions using your account',
            'Only grant authority to accounts you completely trust',
            'This could affect your account security'
          ],
          recommendations: [
            'Verify the account name is correct',
            'Only authorize accounts you know and trust',
            'Consider using limited authority levels when possible',
            'You can revoke this authority later if needed'
          ]
        };

      case 'requestAddKeyAuthority':
        return {
          level: 'high',
          title: 'Key Authority Grant',
          description: 'You are granting authority to a public key.',
          warnings: [
            'This gives a specific key permission to act on your account',
            'Applications with this private key can perform actions',
            'Only authorize keys from trusted sources',
            'This could affect your account security'
          ],
          recommendations: [
            'Verify the public key is from a trusted source',
            'Understand what application will use this key',
            'Consider the scope of permissions being granted',
            'You can revoke this authority later if needed'
          ]
        };

      case 'requestTransfer':
        const amount = parseFloat(request.amount?.toString() || '0');
        const isLargeTransfer = amount >= 100; // Consider transfers >= 100 STEEM as high risk
        
        if (isLargeTransfer) {
          return {
            level: 'high',
            title: 'Large Transfer Warning',
            description: 'You are sending a significant amount of STEEM.',
            warnings: [
              'This transfer cannot be reversed once broadcast',
              'Verify the recipient account name is correct',
              'Make sure you trust the recipient',
              'Double-check the amount and currency'
            ],
            recommendations: [
              'Consider sending a small test amount first',
              'Verify the recipient account exists and is correct',
              'Review the memo for any sensitive information',
              'Keep a record of this transaction for your reference'
            ]
          };
        }
        return {
          level: 'medium',
          title: 'Transfer Confirmation',
          description: 'You are sending STEEM to another account.',
          warnings: [
            'This transfer cannot be reversed once broadcast',
            'Verify the recipient account name is correct'
          ],
          recommendations: [
            'Double-check the recipient account name',
            'Review the amount and memo before confirming'
          ]
        };

      case 'requestDelegateVestingShares':
        return {
          level: 'medium',
          title: 'STEEM Power Delegation',
          description: 'You are delegating STEEM Power to another account.',
          warnings: [
            'This reduces your effective voting power',
            'The delegated STEEM Power cannot be used by you',
            'Delegation can be changed or removed at any time',
            'There is a 5-day cooldown when removing delegations'
          ],
          recommendations: [
            'Only delegate to accounts you trust',
            'Consider the impact on your voting influence',
            'You can adjust or remove the delegation later'
          ]
        };

      case 'requestCustomJson':
        return {
          level: 'medium',
          title: 'Custom JSON Operation',
          description: 'You are executing a custom JSON operation.',
          warnings: [
            'Custom operations can have various effects on your account',
            'The operation depends on the specific application logic',
            'Make sure you trust the requesting application'
          ],
          recommendations: [
            'Verify the operation is from a trusted application',
            'Understand what the operation does before confirming',
            'Check the JSON data if you are technically inclined'
          ]
        };

      default:
        return {
          level: 'low',
          title: 'Operation Confirmation',
          description: 'Please confirm this blockchain operation.',
          warnings: [
            'This operation will be broadcast to the STEEM blockchain',
            'Blockchain operations cannot be undone'
          ],
          recommendations: [
            'Review the operation details carefully',
            'Make sure this is what you intended to do'
          ]
        };
    }
  };

  const riskInfo = getRiskInfo(request);

  // Only show warnings for medium risk and above
  if (riskInfo.level === 'low') {
    return null;
  }

  const getRiskVariant = (level: string): "default" | "destructive" => {
    return level === 'critical' || level === 'high' ? 'destructive' : 'default';
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-950';
      case 'high': return 'border-red-400 bg-red-50 dark:bg-red-950';
      case 'medium': return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950';
      default: return 'border-blue-400 bg-blue-50 dark:bg-blue-950';
    }
  };

  return (
    <Card className={`${getRiskColor(riskInfo.level)} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {riskInfo.level === 'critical' && '🚨'}
            {riskInfo.level === 'high' && '⚠️'}
            {riskInfo.level === 'medium' && '⚡'}
            {riskInfo.title}
          </CardTitle>
          <Badge variant={getRiskVariant(riskInfo.level)} className="text-xs">
            {riskInfo.level.toUpperCase()} RISK
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0">
        <p className="text-sm text-muted-foreground">
          {riskInfo.description}
        </p>

        {riskInfo.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">⚠️ Important Warnings:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {riskInfo.warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {riskInfo.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">💡 Recommendations:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {riskInfo.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}