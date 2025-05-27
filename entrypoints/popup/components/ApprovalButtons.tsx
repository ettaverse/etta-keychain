import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeychainRequest } from '../../background/services/types/keychain-api.types';

interface ApprovalButtonsProps {
  request: KeychainRequest;
  onApprove: (request: KeychainRequest) => Promise<void>;
  onReject: (request: KeychainRequest, reason?: string) => Promise<void>;
  disabled?: boolean;
}

type LoadingState = 'idle' | 'approving' | 'rejecting';

export function ApprovalButtons({ 
  request, 
  onApprove, 
  onReject, 
  disabled = false 
}: ApprovalButtonsProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string>('');

  const handleApprove = async () => {
    if (loadingState !== 'idle') return;
    
    setLoadingState('approving');
    setError('');
    
    try {
      await onApprove(request);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve transaction';
      setError(errorMessage);
      setLoadingState('idle');
    }
  };

  const handleReject = async (reason?: string) => {
    if (loadingState !== 'idle') return;
    
    setLoadingState('rejecting');
    setError('');
    
    try {
      await onReject(request, reason);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject transaction';
      setError(errorMessage);
      setLoadingState('idle');
    }
  };

  const isDisabled = disabled || loadingState !== 'idle';

  const getDangerousOperations = (): string[] => {
    return [
      'requestPowerDown',
      'requestRemoveAccountAuthority',
      'requestRemoveKeyAuthority',
      'requestAddAccountAuthority',
      'requestAddKeyAuthority',
      'requestTransfer' // High-value transfers
    ];
  };

  const isDangerous = getDangerousOperations().includes(request.type);

  const getApproveButtonText = (): string => {
    if (loadingState === 'approving') return 'Processing...';
    if (isDangerous) return 'Approve (High Risk)';
    return 'Approve';
  };

  const getRejectButtonText = (): string => {
    if (loadingState === 'rejecting') return 'Canceling...';
    return 'Reject';
  };

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => handleReject('User rejected')}
          disabled={isDisabled}
          className="flex-1"
        >
          {getRejectButtonText()}
        </Button>

        <Button
          variant={isDangerous ? "destructive" : "default"}
          onClick={handleApprove}
          disabled={isDisabled}
          className="flex-1"
        >
          {getApproveButtonText()}
        </Button>
      </div>

      {isDangerous && loadingState === 'idle' && (
        <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-2 rounded border">
          ⚠️ This operation has security implications. Please review carefully before approving.
        </div>
      )}

      {loadingState === 'approving' && (
        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded border">
          🔄 Processing transaction... This may take a few moments.
        </div>
      )}
    </div>
  );
}