import React, { useState } from 'react';
import { AccountLookup } from '../components/AccountLookup';
import { RpcSelector } from '../components/RpcSelector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Search, ArrowLeft } from 'lucide-react';

interface AccountConnectionProps {
  onBack: () => void;
  onImportAccount: (username: string) => void;
}

export function AccountConnection({ onBack, onImportAccount }: AccountConnectionProps) {
  const [activeTab, setActiveTab] = useState('lookup');

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Connect STEEM Account</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lookup" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Account Lookup
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              RPC Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lookup" className="mt-4">
            <AccountLookup 
              onImport={onImportAccount}
              showImportButton={true}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <RpcSelector />
          </TabsContent>
        </Tabs>

        <Card className="p-4 bg-muted/50">
          <h3 className="font-medium mb-2">What is this?</h3>
          <p className="text-sm text-muted-foreground">
            This interface allows you to search for STEEM accounts on the blockchain and configure 
            which API node to use for queries. You can import accounts after finding them, or 
            switch to a faster node if you're experiencing connection issues.
          </p>
        </Card>
      </div>
    </div>
  );
}