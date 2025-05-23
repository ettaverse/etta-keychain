import React, { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { DefaultRpcs } from '@/src/reference-data/default-rpc.list';

interface RpcNode {
  uri: string;
  chainId?: string;
  custom?: boolean;
}

interface RpcStatus {
  uri: string;
  latency?: number;
  status: 'online' | 'offline' | 'checking';
  lastChecked?: Date;
}

export function RpcSelector() {
  const [currentRpc, setCurrentRpc] = useState<RpcNode>(DefaultRpcs[0]);
  const [customRpcs, setCustomRpcs] = useState<RpcNode[]>([]);
  const [rpcStatuses, setRpcStatuses] = useState<Map<string, RpcStatus>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRpcUri, setNewRpcUri] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTestingNewRpc, setIsTestingNewRpc] = useState(false);

  useEffect(() => {
    loadSettings();
    checkAllRpcStatuses();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getRpcSettings'
      });

      if (response.success) {
        setCurrentRpc(response.data.currentRpc || DefaultRpcs[0]);
        setCustomRpcs(response.data.customRpcs || []);
      }
    } catch (err) {
      console.error('Failed to load RPC settings:', err);
    }
  };

  const saveSettings = async (rpc: RpcNode) => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'setRpc',
        payload: { rpc }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save RPC settings');
      }

      setCurrentRpc(rpc);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const testRpcNode = async (uri: string): Promise<{ success: boolean; latency?: number }> => {
    const startTime = Date.now();
    
    try {
      const response = await browser.runtime.sendMessage({
        action: 'testRpc',
        payload: { uri }
      });

      const latency = Date.now() - startTime;

      return {
        success: response.success,
        latency: response.success ? latency : undefined
      };
    } catch (err) {
      return { success: false };
    }
  };

  const checkAllRpcStatuses = async () => {
    const allRpcs = [...DefaultRpcs, ...customRpcs];
    
    for (const rpc of allRpcs) {
      setRpcStatuses(prev => new Map(prev).set(rpc.uri, {
        uri: rpc.uri,
        status: 'checking'
      }));

      const result = await testRpcNode(rpc.uri);
      
      setRpcStatuses(prev => new Map(prev).set(rpc.uri, {
        uri: rpc.uri,
        status: result.success ? 'online' : 'offline',
        latency: result.latency,
        lastChecked: new Date()
      }));
    }
  };

  const handleRpcChange = async (uri: string) => {
    setLoading(true);
    const rpc = [...DefaultRpcs, ...customRpcs].find(r => r.uri === uri);
    
    if (rpc) {
      await saveSettings(rpc);
    }
    
    setLoading(false);
  };

  const handleAddCustomRpc = async () => {
    if (!newRpcUri.startsWith('https://')) {
      setError('RPC URL must start with https://');
      return;
    }

    setIsTestingNewRpc(true);
    const result = await testRpcNode(newRpcUri);
    
    if (!result.success) {
      setError('Failed to connect to RPC node. Please check the URL and try again.');
      setIsTestingNewRpc(false);
      return;
    }

    const newRpc: RpcNode = { uri: newRpcUri, custom: true };
    const updatedCustomRpcs = [...customRpcs, newRpc];
    
    try {
      const response = await browser.runtime.sendMessage({
        action: 'saveCustomRpcs',
        payload: { customRpcs: updatedCustomRpcs }
      });

      if (response.success) {
        setCustomRpcs(updatedCustomRpcs);
        setNewRpcUri('');
        setIsAddDialogOpen(false);
        setError(null);
        
        // Update status
        setRpcStatuses(prev => new Map(prev).set(newRpcUri, {
          uri: newRpcUri,
          status: 'online',
          latency: result.latency,
          lastChecked: new Date()
        }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTestingNewRpc(false);
    }
  };

  const handleRemoveCustomRpc = async (uri: string) => {
    const updatedCustomRpcs = customRpcs.filter(rpc => rpc.uri !== uri);
    
    try {
      const response = await browser.runtime.sendMessage({
        action: 'saveCustomRpcs',
        payload: { customRpcs: updatedCustomRpcs }
      });

      if (response.success) {
        setCustomRpcs(updatedCustomRpcs);
        setRpcStatuses(prev => {
          const newMap = new Map(prev);
          newMap.delete(uri);
          return newMap;
        });

        // If the removed RPC was the current one, switch to default
        if (currentRpc.uri === uri) {
          await saveSettings(DefaultRpcs[0]);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (uri: string) => {
    const status = rpcStatuses.get(uri);
    
    if (!status || status.status === 'checking') {
      return <Badge variant="secondary">Checking...</Badge>;
    }
    
    if (status.status === 'offline') {
      return <Badge variant="destructive">Offline</Badge>;
    }
    
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        {status.latency ? `${status.latency}ms` : 'Online'}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>RPC Node Settings</CardTitle>
            <CardDescription>
              Select a STEEM API node for blockchain queries
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={checkAllRpcStatuses}
            title="Refresh node status"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rpc-select">Active RPC Node</Label>
          <Select
            value={currentRpc.uri}
            onValueChange={handleRpcChange}
            disabled={loading}
          >
            <SelectTrigger id="rpc-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="font-semibold text-sm px-2 py-1.5 text-muted-foreground">
                Default Nodes
              </div>
              {DefaultRpcs.map((rpc) => (
                <SelectItem key={rpc.uri} value={rpc.uri}>
                  <div className="flex items-center justify-between w-full">
                    <span className="mr-2">{rpc.uri}</span>
                    {getStatusBadge(rpc.uri)}
                  </div>
                </SelectItem>
              ))}
              
              {customRpcs.length > 0 && (
                <>
                  <div className="font-semibold text-sm px-2 py-1.5 text-muted-foreground mt-2">
                    Custom Nodes
                  </div>
                  {customRpcs.map((rpc) => (
                    <SelectItem key={rpc.uri} value={rpc.uri}>
                      <div className="flex items-center justify-between w-full">
                        <span className="mr-2">{rpc.uri}</span>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(rpc.uri)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomRpc(rpc.uri);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Custom RPC Node
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom RPC Node</DialogTitle>
              <DialogDescription>
                Enter the URL of a STEEM API node. The connection will be tested before adding.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-rpc">RPC URL</Label>
                <Input
                  id="new-rpc"
                  placeholder="https://api.example.com"
                  value={newRpcUri}
                  onChange={(e) => setNewRpcUri(e.target.value)}
                  disabled={isTestingNewRpc}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isTestingNewRpc}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCustomRpc}
                disabled={!newRpcUri || isTestingNewRpc}
              >
                {isTestingNewRpc ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Add Node'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="text-sm text-muted-foreground">
          <p>Current node: <span className="font-medium">{currentRpc.uri}</span></p>
          {rpcStatuses.get(currentRpc.uri)?.lastChecked && (
            <p>Last checked: {rpcStatuses.get(currentRpc.uri)?.lastChecked?.toLocaleTimeString()}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}