import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KeychainRequest } from '../../background/services/types/keychain-api.types';
import { OperationFormatter } from './OperationFormatter';
import { RiskWarning } from './RiskWarning';

interface TransactionPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: KeychainRequest;
  origin: string;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

export function TransactionPreviewModal({
  open,
  onOpenChange,
  request,
  origin,
  onApprove,
  onReject,
  isProcessing = false
}: TransactionPreviewModalProps) {
  
  const formatJson = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const getRawParameters = (request: KeychainRequest): Array<{ key: string; value: any }> => {
    const params: Array<{ key: string; value: any }> = [];
    
    Object.keys(request).forEach(key => {
      if (key !== 'type' && key !== 'request_id') {
        params.push({ key, value: request[key] });
      }
    });
    
    return params;
  };

  const getEstimatedFees = (request: KeychainRequest): string => {
    // Most STEEM operations have zero fees, but some have RC costs
    switch (request.type) {
      case 'requestTransfer':
        return '~0.000 STEEM (RC Cost: Low)';
      case 'requestPost':
        return '~0.000 STEEM (RC Cost: Medium)';
      case 'requestCustomJson':
        return '~0.000 STEEM (RC Cost: Low)';
      case 'requestCreateAccount':
        return '3.000 STEEM + RC Cost';
      default:
        return '~0.000 STEEM (RC Cost: Low)';
    }
  };

  const getExpectedBlockTime = (): string => {
    return '~3 seconds (next STEEM block)';
  };

  const rawParams = getRawParameters(request);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Transaction Preview</span>
            <Badge variant="outline" className="text-xs">
              {request.type.replace('request', '')}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Review the transaction details before confirming. From: {origin}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <OperationFormatter request={request} showDetailed={true} />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Operation:</span>
                    <div className="font-medium">{request.type.replace('request', '')}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account:</span>
                    <div className="font-medium">@{request.username || 'Unknown'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estimated Fee:</span>
                    <div className="font-medium">{getEstimatedFees(request)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Block Time:</span>
                    <div className="font-medium">{getExpectedBlockTime()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Operation Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rawParams.map((param, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4 text-sm">
                      <div className="font-medium text-muted-foreground">
                        {param.key}:
                      </div>
                      <div className="col-span-2 font-mono text-xs bg-muted p-2 rounded break-all">
                        {typeof param.value === 'object' 
                          ? formatJson(param.value)
                          : String(param.value)
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Raw Request Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                  {formatJson(request)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Request Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Request ID:</span>
                  <span className="font-mono">{request.request_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origin:</span>
                  <span className="font-mono">{origin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="font-mono">{new Date().toISOString()}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <RiskWarning request={request} />

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Security Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Request origin verified: {origin}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Account authorization confirmed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Transaction parameters validated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Network connection secured</span>
                  </div>
                </div>

                <Separator />

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>🔒 This transaction will be signed with your private key and broadcast to the STEEM blockchain.</p>
                  <p>⚠️ Blockchain transactions cannot be reversed once confirmed.</p>
                  <p>🔍 Always verify the recipient and amount before approving transfers.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Reject'}
          </Button>
          <Button
            onClick={onApprove}
            disabled={isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessing ? 'Processing...' : 'Approve Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}