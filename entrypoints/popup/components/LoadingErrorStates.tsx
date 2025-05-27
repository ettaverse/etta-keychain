import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  stage?: string;
}

interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  errorCode?: string;
  retryable?: boolean;
}

interface LoadingErrorStatesProps {
  operationType: string;
  loading?: LoadingState;
  error?: ErrorState;
  onRetry?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

const OPERATION_STAGES: Record<string, string[]> = {
  requestTransfer: [
    'Validating transaction',
    'Checking balance',
    'Building transaction',
    'Signing transaction',
    'Broadcasting to network',
    'Confirming transaction'
  ],
  requestVote: [
    'Validating vote parameters',
    'Checking voting power',
    'Building vote operation',
    'Signing vote',
    'Broadcasting vote',
    'Confirming vote'
  ],
  requestCustomJson: [
    'Validating JSON data',
    'Checking permissions',
    'Building operation',
    'Signing operation',
    'Broadcasting operation',
    'Confirming operation'
  ],
  requestVerifyKey: [
    'Validating message',
    'Preparing signature',
    'Signing message',
    'Verifying signature'
  ],
  default: [
    'Preparing operation',
    'Validating parameters',
    'Signing operation',
    'Broadcasting operation',
    'Confirming operation'
  ]
};

const OPERATION_ICONS: Record<string, string> = {
  requestTransfer: '💸',
  requestVote: '🗳️',
  requestCustomJson: '⚙️',
  requestVerifyKey: '🔐',
  requestHandshake: '🤝',
  default: '⏳'
};

const ERROR_MESSAGES: Record<string, { title: string; description: string; suggestion: string }> = {
  NETWORK_ERROR: {
    title: 'Network Connection Failed',
    description: 'Unable to connect to the STEEM network',
    suggestion: 'Check your internet connection and try again'
  },
  INSUFFICIENT_BALANCE: {
    title: 'Insufficient Balance',
    description: 'Not enough funds to complete this transaction',
    suggestion: 'Check your account balance or reduce the amount'
  },
  INVALID_ACCOUNT: {
    title: 'Invalid Account',
    description: 'The specified account does not exist',
    suggestion: 'Verify the account name is spelled correctly'
  },
  INVALID_SIGNATURE: {
    title: 'Signature Verification Failed',
    description: 'Unable to sign the transaction with the provided key',
    suggestion: 'Make sure you have the correct key for this account'
  },
  BROADCAST_FAILED: {
    title: 'Broadcast Failed',
    description: 'Transaction was signed but failed to broadcast',
    suggestion: 'The network may be busy, please try again'
  },
  TIMEOUT: {
    title: 'Operation Timed Out',
    description: 'The operation took too long to complete',
    suggestion: 'The network may be slow, please try again'
  },
  PERMISSION_DENIED: {
    title: 'Permission Denied',
    description: 'You do not have permission to perform this operation',
    suggestion: 'Check that you are using the correct account and key type'
  },
  RATE_LIMITED: {
    title: 'Rate Limited',
    description: 'Too many requests have been made recently',
    suggestion: 'Please wait a moment before trying again'
  },
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    description: 'An unexpected error occurred',
    suggestion: 'Please try again or contact support if the problem persists'
  }
};

export function LoadingErrorStates({
  operationType,
  loading = { isLoading: false },
  error = { hasError: false },
  onRetry,
  onCancel,
  compact = false
}: LoadingErrorStatesProps) {
  const operationIcon = OPERATION_ICONS[operationType] || OPERATION_ICONS.default;
  const stages = OPERATION_STAGES[operationType] || OPERATION_STAGES.default;

  const getCurrentStage = () => {
    if (!loading.stage && typeof loading.progress === 'number') {
      const stageIndex = Math.min(Math.floor((loading.progress / 100) * stages.length), stages.length - 1);
      return stages[stageIndex];
    }
    return loading.stage || stages[0];
  };

  const getProgressPercentage = () => {
    if (typeof loading.progress === 'number') {
      return Math.max(0, Math.min(100, loading.progress));
    }
    
    if (loading.stage) {
      const stageIndex = stages.indexOf(loading.stage);
      if (stageIndex >= 0) {
        return ((stageIndex + 1) / stages.length) * 100;
      }
    }
    
    return 0;
  };

  const getErrorInfo = () => {
    if (!error.hasError) return null;
    
    const errorCode = error.errorCode || 'UNKNOWN_ERROR';
    const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
    
    return {
      ...errorInfo,
      originalMessage: typeof error.error === 'string' ? error.error : error.error?.message
    };
  };

  const errorInfo = getErrorInfo();

  // Compact loading state
  if (compact && loading.isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border">
        <div className="animate-spin">⏳</div>
        <div className="flex-1">
          <div className="text-sm font-medium">{loading.message || 'Processing...'}</div>
          {loading.stage && (
            <div className="text-xs text-gray-600">{getCurrentStage()}</div>
          )}
        </div>
        {typeof loading.progress === 'number' && (
          <div className="text-sm text-blue-600">{Math.round(getProgressPercentage())}%</div>
        )}
      </div>
    );
  }

  // Compact error state
  if (compact && error.hasError) {
    return (
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <span className="text-sm">
              {errorInfo?.title || 'Operation failed'}
            </span>
          </div>
          {error.retryable && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Full loading state
  if (loading.isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <div className="animate-spin">{operationIcon}</div>
            Processing Operation
          </CardTitle>
          <CardDescription>
            {loading.message || 'Please wait while your request is being processed'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{Math.round(getProgressPercentage())}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Current Stage */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Current Step:</div>
            <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3">
              <div className="animate-pulse text-blue-600">⏳</div>
              <span className="text-sm">{getCurrentStage()}</span>
            </div>
          </div>

          {/* All Stages */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Steps:</div>
            <div className="space-y-1">
              {stages.map((stage, index) => {
                const currentStageIndex = stages.indexOf(getCurrentStage());
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isPending = index > currentStageIndex;

                return (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {isCompleted && <span className="text-green-600">✅</span>}
                      {isCurrent && <span className="animate-pulse text-blue-600">⏳</span>}
                      {isPending && <span className="text-gray-400">⭕</span>}
                    </div>
                    <span className={`${
                      isCompleted ? 'text-gray-600 line-through' :
                      isCurrent ? 'text-blue-600 font-medium' :
                      'text-gray-400'
                    }`}>
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cancel Button */}
          {onCancel && (
            <div className="pt-4">
              <Button variant="outline" onClick={onCancel} className="w-full">
                Cancel Operation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full error state
  if (error.hasError && errorInfo) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            ❌ Operation Failed
          </CardTitle>
          <CardDescription>
            The operation could not be completed
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error Details */}
          <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
            <div className="space-y-2">
              <div className="font-medium text-red-800">{errorInfo.title}</div>
              <div className="text-sm text-red-700">{errorInfo.description}</div>
              {errorInfo.originalMessage && errorInfo.originalMessage !== errorInfo.description && (
                <details className="text-xs text-red-600">
                  <summary className="cursor-pointer">Technical Details</summary>
                  <div className="mt-1 font-mono bg-red-100 p-2 rounded">
                    {errorInfo.originalMessage}
                  </div>
                </details>
              )}
            </div>
          </div>

          {/* Error Code */}
          {error.errorCode && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Error Code:</span>
              <Badge variant="destructive" className="text-xs">
                {error.errorCode}
              </Badge>
            </div>
          )}

          {/* Suggestion */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-blue-600">💡</span>
              <div>
                <div className="font-medium text-blue-800 text-sm">Suggestion</div>
                <div className="text-sm text-blue-700">{errorInfo.suggestion}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Close
              </Button>
            )}
            {error.retryable && onRetry && (
              <Button onClick={onRetry} className="flex-1">
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No loading or error state
  return null;
}