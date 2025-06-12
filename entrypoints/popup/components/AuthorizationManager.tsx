import React, { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { TokenAuthDialog } from './TokenAuthDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Clock, Trash2, Globe, AlertTriangle } from 'lucide-react';

interface AuthorizationRecord {
  token: string;
  domain: string;
  account: string;
  permissions: string[];
  granted: number;
  expires: number;
}

interface AuthRequest {
  id: string;
  origin: string;
  domain: string;
  requestedPermissions: string[];
  timestamp: number;
  account?: string;
}

export function AuthorizationManager() {
  const [authorizations, setAuthorizations] = useState<AuthorizationRecord[]>([]);
  const [pendingRequest, setPendingRequest] = useState<AuthRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadAuthorizations();
    setupMessageListener();
  }, []);

  const loadAuthorizations = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getAuthorizations'
      });

      if (response.success) {
        setAuthorizations(response.authorizations || []);
      }
    } catch (err) {
      console.error('Failed to load authorizations:', err);
    }
  };

  const setupMessageListener = () => {
    const handleMessage = (message: any) => {
      if (message.action === 'authorizationRequest') {
        setPendingRequest(message.request);
        setDialogOpen(true);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  };

  const handleApprove = async (token: string) => {
    if (!pendingRequest) return;

    try {
      // Send approval back to background script
      await browser.runtime.sendMessage({
        action: 'approveAuthorization',
        requestId: pendingRequest.id,
        token: token
      });

      setDialogOpen(false);
      setPendingRequest(null);
      loadAuthorizations(); // Refresh the list
    } catch (err) {
      console.error('Failed to approve authorization:', err);
    }
  };

  const handleDeny = async () => {
    if (!pendingRequest) return;

    try {
      await browser.runtime.sendMessage({
        action: 'denyAuthorization',
        requestId: pendingRequest.id
      });

      setDialogOpen(false);
      setPendingRequest(null);
    } catch (err) {
      console.error('Failed to deny authorization:', err);
    }
  };

  const revokeAuthorization = async (token: string) => {
    try {
      await browser.runtime.sendMessage({
        action: 'revokeAuthorization',
        token: token
      });

      loadAuthorizations(); // Refresh the list
    } catch (err) {
      console.error('Failed to revoke authorization:', err);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isExpired = (expires: number) => {
    return Date.now() > expires;
  };

  const getTimeRemaining = (expires: number) => {
    const remaining = expires - Date.now();
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return '< 1h';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Site Authorizations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {authorizations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sites have been authorized yet
            </p>
          ) : (
            <div className="space-y-3">
              {authorizations.map((auth) => (
                <div
                  key={auth.token}
                  className={`p-3 border rounded-lg ${
                    isExpired(auth.expires) ? 'border-red-200 bg-red-50/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-4 w-4" />
                        <span className="font-medium text-sm">{auth.domain}</span>
                        {isExpired(auth.expires) && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-2">
                        Account: @{auth.account}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {auth.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Granted: {formatDate(auth.granted)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Expires: {getTimeRemaining(auth.expires)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeAuthorization(auth.token)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning about expired authorizations */}
      {authorizations.some(auth => isExpired(auth.expires)) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have expired authorizations that should be cleaned up for security.
          </AlertDescription>
        </Alert>
      )}

      {/* Token Authorization Dialog */}
      <TokenAuthDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        request={pendingRequest}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />
    </div>
  );
}