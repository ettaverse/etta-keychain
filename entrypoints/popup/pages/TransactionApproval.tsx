import React, { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TransactionRequestDisplay } from '../components/TransactionRequestDisplay';
import { OperationFormatter } from '../components/OperationFormatter';
import { ApprovalButtons } from '../components/ApprovalButtons';
import { RiskWarning } from '../components/RiskWarning';
import { KeychainRequest, KeychainResponse } from '../../background/services/types/keychain-api.types';

interface TransactionApprovalProps {
  onComplete?: (response: KeychainResponse) => void;
}

interface PendingRequest {
  request: KeychainRequest;
  origin: string;
  timestamp: number;
}

export function TransactionApproval({ onComplete }: TransactionApprovalProps) {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<PendingRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  // Listen for new transaction requests
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'transaction_request') {
        const newRequest: PendingRequest = {
          request: message.request,
          origin: message.origin,
          timestamp: Date.now()
        };
        
        setPendingRequests(prev => [...prev, newRequest]);
        
        // If no current request, set this as current
        if (!currentRequest) {
          setCurrentRequest(newRequest);
        }
      }
    };

    // Listen for messages from background script
    const port = browser.runtime.connect({ name: 'transaction-approval' });
    port.onMessage.addListener(handleMessage);

    // Cleanup on unmount
    return () => {
      port.disconnect();
    };
  }, [currentRequest]);

  // Load any pending requests on mount
  useEffect(() => {
    const loadPendingRequests = async () => {
      try {
        const response = await browser.runtime.sendMessage({
          action: 'getPendingRequests'
        });
        
        if (response.success && response.requests) {
          const requests = response.requests.map((req: any) => ({
            request: req.request,
            origin: req.origin,
            timestamp: req.timestamp
          }));
          
          setPendingRequests(requests);
          if (requests.length > 0 && !currentRequest) {
            setCurrentRequest(requests[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load pending requests:', err);
      }
    };

    loadPendingRequests();
  }, []);

  const handleApprove = async (request: KeychainRequest) => {
    setIsProcessing(true);
    setError('');

    try {
      const response = await browser.runtime.sendMessage({
        action: 'approveTransaction',
        request_id: request.request_id,
        request
      });

      if (response.success) {
        // Remove from pending requests
        setPendingRequests(prev => 
          prev.filter(req => req.request.request_id !== request.request_id)
        );
        
        // Move to next request or clear current
        const remaining = pendingRequests.filter(req => req.request.request_id !== request.request_id);
        setCurrentRequest(remaining.length > 0 ? remaining[0] : null);
        
        // Notify parent component
        if (onComplete) {
          onComplete(response);
        }
      } else {
        setError(response.error || 'Transaction failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process transaction';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (request: KeychainRequest, reason?: string) => {
    setIsProcessing(true);
    setError('');

    try {
      const response = await browser.runtime.sendMessage({
        action: 'rejectTransaction',
        request_id: request.request_id,
        reason
      });

      // Remove from pending requests regardless of response
      setPendingRequests(prev => 
        prev.filter(req => req.request.request_id !== request.request_id)
      );
      
      // Move to next request or clear current
      const remaining = pendingRequests.filter(req => req.request.request_id !== request.request_id);
      setCurrentRequest(remaining.length > 0 ? remaining[0] : null);
      
      // Notify parent component
      if (onComplete) {
        onComplete({
          success: false,
          error: reason || 'User rejected',
          request_id: request.request_id
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject transaction';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectRequest = (request: PendingRequest) => {
    if (!isProcessing) {
      setCurrentRequest(request);
      setError('');
    }
  };

  if (!currentRequest) {
    return (
      <div className="min-h-[400px] w-[450px] flex items-center justify-center p-6">
        <Card className="w-full text-center">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="text-4xl">✅</div>
              <h3 className="text-lg font-semibold">No Pending Requests</h3>
              <p className="text-sm text-muted-foreground">
                All transaction requests have been processed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] w-[450px] p-6 space-y-4">
      {/* Header with queue info */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transaction Approval</h2>
        {pendingRequests.length > 1 && (
          <Badge variant="secondary">
            {pendingRequests.length} pending
          </Badge>
        )}
      </div>

      {/* Request queue (if multiple requests) */}
      {pendingRequests.length > 1 && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Request Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {pendingRequests.map((req, index) => (
              <div
                key={req.request.request_id}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  req.request.request_id === currentRequest.request.request_id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleSelectRequest(req)}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {req.request.type.replace('request', '')}
                  </span>
                  <span className="text-muted-foreground">
                    {req.origin}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main transaction display */}
      <div className="space-y-4">
        {/* Operation formatter with visual display */}
        <OperationFormatter 
          request={currentRequest.request} 
          showDetailed={false}
        />

        <Separator />

        {/* Detailed transaction info */}
        <TransactionRequestDisplay 
          request={currentRequest.request}
          origin={currentRequest.origin}
        />

        {/* Risk warning */}
        <RiskWarning request={currentRequest.request} />

        {/* Detailed operation view */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Operation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <OperationFormatter 
              request={currentRequest.request} 
              showDetailed={true}
            />
          </CardContent>
        </Card>

        {/* Approval buttons */}
        <ApprovalButtons
          request={currentRequest.request}
          onApprove={handleApprove}
          onReject={handleReject}
          disabled={isProcessing}
        />

        {/* Error display */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <span>❌</span>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}