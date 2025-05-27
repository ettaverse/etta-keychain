import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationRule[];
  warnings: ValidationRule[];
  info: ValidationRule[];
}

interface OperationValidationUIProps {
  operationType: string;
  validation: ValidationResult;
  onRetry?: () => void;
}

const OPERATION_ICONS: Record<string, string> = {
  requestTransfer: '💸',
  requestVote: '🗳️',
  requestCustomJson: '⚙️',
  requestVerifyKey: '🔐',
  requestHandshake: '🤝',
  post: '📝',
  witness: '👑',
  delegation: '🤝',
  powerUp: '⚡',
  powerDown: '📉',
  createAccount: '👤',
  addAccountAuthority: '🔑',
  removeAccountAuthority: '❌',
  default: '⚠️'
};

const OPERATION_NAMES: Record<string, string> = {
  requestTransfer: 'Transfer',
  requestVote: 'Vote',
  requestCustomJson: 'Custom JSON',
  requestVerifyKey: 'Key Verification',
  requestHandshake: 'Handshake',
  post: 'Post/Comment',
  witness: 'Witness Vote',
  delegation: 'Delegation',
  powerUp: 'Power Up',
  powerDown: 'Power Down',
  createAccount: 'Account Creation',
  addAccountAuthority: 'Add Authority',
  removeAccountAuthority: 'Remove Authority'
};

export function OperationValidationUI({
  operationType,
  validation,
  onRetry
}: OperationValidationUIProps) {
  const operationIcon = OPERATION_ICONS[operationType] || OPERATION_ICONS.default;
  const operationName = OPERATION_NAMES[operationType] || operationType;

  const getValidationIcon = (severity: ValidationRule['severity']) => {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  };

  const getValidationColor = (severity: ValidationRule['severity']) => {
    switch (severity) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-amber-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getValidationBg = (severity: ValidationRule['severity']) => {
    switch (severity) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const ValidationRuleItem = ({ rule }: { rule: ValidationRule }) => (
    <div className={`p-3 rounded-lg border ${getValidationBg(rule.severity)}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{getValidationIcon(rule.severity)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium text-sm ${getValidationColor(rule.severity)}`}>
              {rule.field}
            </span>
            <Badge variant="outline" className="text-xs">
              {rule.rule}
            </Badge>
          </div>
          <p className="text-sm text-gray-700">{rule.message}</p>
        </div>
      </div>
    </div>
  );

  const getSummaryIcon = () => {
    if (validation.errors.length > 0) return '❌';
    if (validation.warnings.length > 0) return '⚠️';
    return '✅';
  };

  const getSummaryText = () => {
    if (validation.errors.length > 0) {
      return `${validation.errors.length} error${validation.errors.length !== 1 ? 's' : ''} found`;
    }
    if (validation.warnings.length > 0) {
      return `${validation.warnings.length} warning${validation.warnings.length !== 1 ? 's' : ''} found`;
    }
    return 'All validations passed';
  };

  const getSummaryColor = () => {
    if (validation.errors.length > 0) return 'text-red-600';
    if (validation.warnings.length > 0) return 'text-amber-600';
    return 'text-green-600';
  };

  const getSummaryBg = () => {
    if (validation.errors.length > 0) return 'bg-red-50 border-red-200';
    if (validation.warnings.length > 0) return 'bg-amber-50 border-amber-200';
    return 'bg-green-50 border-green-200';
  };

  // Get helpful tips based on common validation issues
  const getValidationTips = () => {
    const tips: string[] = [];
    
    validation.errors.forEach(error => {
      switch (error.rule) {
        case 'required':
          tips.push(`Make sure to fill in the ${error.field} field`);
          break;
        case 'format':
          tips.push(`Check the format of the ${error.field} field`);
          break;
        case 'balance':
          tips.push('Ensure you have sufficient balance for this transaction');
          break;
        case 'authority':
          tips.push('Verify you have the required permissions for this operation');
          break;
        case 'account':
          tips.push('Double-check that the account name is spelled correctly');
          break;
      }
    });

    return tips;
  };

  const tips = getValidationTips();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          {operationIcon} {operationName} Validation
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Validation Summary */}
        <div className={`p-4 rounded-lg border ${getSummaryBg()}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getSummaryIcon()}</span>
            <div>
              <div className={`font-semibold ${getSummaryColor()}`}>
                {getSummaryText()}
              </div>
              <div className="text-sm text-gray-600">
                {validation.isValid ? 
                  'This operation can be processed' : 
                  'Please fix the issues below before proceeding'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {validation.errors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-red-600">Errors</h4>
              <Badge variant="destructive">{validation.errors.length}</Badge>
            </div>
            <div className="space-y-2">
              {validation.errors.map((error, index) => (
                <ValidationRuleItem key={`error-${index}`} rule={error} />
              ))}
            </div>
          </div>
        )}

        {/* Validation Warnings */}
        {validation.warnings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-amber-600">Warnings</h4>
              <Badge variant="outline" className="bg-amber-100 text-amber-800">
                {validation.warnings.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {validation.warnings.map((warning, index) => (
                <ValidationRuleItem key={`warning-${index}`} rule={warning} />
              ))}
            </div>
          </div>
        )}

        {/* Info Messages */}
        {validation.info.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-blue-600">Information</h4>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                {validation.info.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {validation.info.map((info, index) => (
                <ValidationRuleItem key={`info-${index}`} rule={info} />
              ))}
            </div>
          </div>
        )}

        {/* Helpful Tips */}
        {tips.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">💡 Helpful Tips</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Common Operation-Specific Guidelines */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">📋 Operation Guidelines</h4>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
            {operationType === 'requestTransfer' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Verify the recipient account name is correct</li>
                <li>Double-check the transfer amount</li>
                <li>Consider the memo content (it will be public)</li>
                <li>Ensure you have sufficient balance plus fees</li>
              </ul>
            )}
            
            {operationType === 'requestVote' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Verify the post author and permlink are correct</li>
                <li>Check your current voting power</li>
                <li>Consider the vote weight (positive for upvote, negative for downvote)</li>
                <li>Remember that voting uses voting power</li>
              </ul>
            )}
            
            {operationType === 'requestCustomJson' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Verify the application requesting the operation</li>
                <li>Review the JSON data being submitted</li>
                <li>Check the required authorities</li>
                <li>Ensure you trust the requesting application</li>
              </ul>
            )}
            
            {operationType === 'requestVerifyKey' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Confirm the message you're signing/verifying</li>
                <li>Check the key type being used</li>
                <li>Verify the requesting application is legitimate</li>
                <li>Remember signatures don't grant access to your account</li>
              </ul>
            )}

            {!['requestTransfer', 'requestVote', 'requestCustomJson', 'requestVerifyKey'].includes(operationType) && (
              <ul className="list-disc list-inside space-y-1">
                <li>Carefully review all operation parameters</li>
                <li>Ensure you understand the consequences of this operation</li>
                <li>Verify you have the necessary permissions</li>
                <li>Double-check all account names and amounts</li>
              </ul>
            )}
          </div>
        </div>

        {/* Action Guidance */}
        {!validation.isValid && (
          <Alert>
            <AlertDescription>
              ⚠️ This operation cannot be processed until all errors are resolved. 
              Please correct the issues above and try again.
            </AlertDescription>
          </Alert>
        )}

        {validation.isValid && validation.warnings.length > 0 && (
          <Alert>
            <AlertDescription>
              ⚠️ This operation can be processed, but please review the warnings above. 
              You may proceed if you understand the implications.
            </AlertDescription>
          </Alert>
        )}

        {validation.isValid && validation.warnings.length === 0 && (
          <Alert>
            <AlertDescription className="text-green-700">
              ✅ All validations passed. This operation is ready to be processed.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}