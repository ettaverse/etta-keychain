import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

interface UnmintedAsset {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  asset_type: string;
  domain: string;
  source_platform: string;
  source_id: string;
  estimated_mint_cost: string;
  web2_functionality: string[];
}

interface MintingOptions {
  domain: string;
  asset_type: string;
  tradeable: boolean;
  transferable: boolean;
  burnable: boolean;
  mintable: boolean;
  total_supply?: number;
  royalty_percentage?: number;
  royalty_recipient?: string;
  custom_tags: string[];
}

interface MintingRequest {
  assets: UnmintedAsset[];
  options: MintingOptions;
}

interface AssetMintFormProps {
  selectedAssets: UnmintedAsset[];
  currentAccount: string;
  onSubmit: (data: MintingRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DOMAINS = [
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'collectibles', label: 'Collectibles', icon: '💎' },
  { value: 'domains', label: 'Domains', icon: '🌐' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'art', label: 'Art', icon: '🎨' }
];

const ASSET_TYPES = [
  { value: 'universal', label: 'Universal Asset', description: 'Usable across multiple games' },
  { value: 'domain_specific', label: 'Domain Specific', description: 'Limited to specific domain' },
  { value: 'limited_edition', label: 'Limited Edition', description: 'Rare, numbered assets' }
];

export function AssetMintForm({
  selectedAssets,
  currentAccount,
  onSubmit,
  onCancel,
  isLoading = false
}: AssetMintFormProps) {
  const [currentStep, setCurrentStep] = useState<'options' | 'preview' | 'confirm'>('options');
  const [mintingOptions, setMintingOptions] = useState<MintingOptions>({
    domain: 'gaming',
    asset_type: 'universal',
    tradeable: true,
    transferable: true,
    burnable: false,
    mintable: false,
    total_supply: 1,
    royalty_percentage: 0,
    royalty_recipient: currentAccount,
    custom_tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [estimatedCosts, setEstimatedCosts] = useState({
    per_asset: '0.001 STEEM',
    total: '0.000 STEEM'
  });

  // Calculate estimated costs
  useEffect(() => {
    calculateEstimatedCosts();
  }, [selectedAssets, mintingOptions]);

  const calculateEstimatedCosts = () => {
    const baseCost = 0.001;
    const complexityMultiplier = mintingOptions.tradeable ? 1.2 : 1.0;
    const royaltyMultiplier = mintingOptions.royalty_percentage ? 1.1 : 1.0;
    
    const costPerAsset = baseCost * complexityMultiplier * royaltyMultiplier;
    const totalCost = costPerAsset * selectedAssets.length;

    setEstimatedCosts({
      per_asset: `${costPerAsset.toFixed(3)} STEEM`,
      total: `${totalCost.toFixed(3)} STEEM`
    });
  };

  const handleOptionsChange = (field: keyof MintingOptions, value: any) => {
    setMintingOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addCustomTag = () => {
    if (newTag.trim() && !mintingOptions.custom_tags.includes(newTag.trim())) {
      setMintingOptions(prev => ({
        ...prev,
        custom_tags: [...prev.custom_tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeCustomTag = (tagToRemove: string) => {
    setMintingOptions(prev => ({
      ...prev,
      custom_tags: prev.custom_tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = () => {
    onSubmit({
      assets: selectedAssets,
      options: mintingOptions
    });
  };

  if (selectedAssets.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🪙 Asset Minting
            </CardTitle>
            <CardDescription>
              No assets selected for minting
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Please select assets from the Asset Browser to continue.
            </p>
            <Button onClick={onCancel} variant="outline">
              Back to Browser
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            🪙 Mint Assets to Blockchain
          </CardTitle>
          <CardDescription>
            Convert {selectedAssets.length} Web2 asset{selectedAssets.length > 1 ? 's' : ''} to Web3
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Step-based Content */}
      <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as 'options' | 'preview' | 'confirm')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="options">Minting Options</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="confirm">Confirm</TabsTrigger>
        </TabsList>

        <TabsContent value="options" className="space-y-4">
          {/* Selected Assets Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Selected Assets ({selectedAssets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-32 overflow-y-auto">
                {selectedAssets.map(asset => (
                  <div key={asset.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center text-xs">
                      {asset.image_url ? (
                        <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover rounded-md" />
                      ) : (
                        '📄'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{asset.name}</p>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="secondary">{asset.asset_type}</Badge>
                        <Badge variant="outline">{asset.source_platform}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Minting Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Minting Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Domain Selection */}
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={mintingOptions.domain} onValueChange={(value) => handleOptionsChange('domain', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((domain) => (
                      <SelectItem key={domain.value} value={domain.value}>
                        {domain.icon} {domain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Asset Type */}
              <div className="space-y-2">
                <Label>Asset Type</Label>
                <Select value={mintingOptions.asset_type} onValueChange={(value) => handleOptionsChange('asset_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Asset Properties */}
              <div className="space-y-3">
                <Label className="text-base">Asset Properties</Label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={mintingOptions.tradeable}
                      onChange={(e) => handleOptionsChange('tradeable', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Tradeable</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={mintingOptions.transferable}
                      onChange={(e) => handleOptionsChange('transferable', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Transferable</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={mintingOptions.burnable}
                      onChange={(e) => handleOptionsChange('burnable', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Burnable</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={mintingOptions.mintable}
                      onChange={(e) => handleOptionsChange('mintable', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Mintable</span>
                  </label>
                </div>
              </div>

              {/* Royalty Settings (if tradeable) */}
              {mintingOptions.tradeable && (
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-base">Royalty Settings</Label>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Royalty Percentage: {mintingOptions.royalty_percentage}%</Label>
                      <Slider
                        value={[mintingOptions.royalty_percentage || 0]}
                        onValueChange={(value) => handleOptionsChange('royalty_percentage', value[0])}
                        max={10}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="royalty-recipient" className="text-sm">Royalty Recipient</Label>
                      <Input
                        id="royalty-recipient"
                        value={mintingOptions.royalty_recipient || currentAccount}
                        onChange={(e) => handleOptionsChange('royalty_recipient', e.target.value)}
                        placeholder="STEEM username"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Tags */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-base">Custom Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                    placeholder="Add custom tag"
                    className="flex-1"
                  />
                  <Button onClick={addCustomTag} size="sm" variant="outline">
                    Add
                  </Button>
                </div>
                {mintingOptions.custom_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mintingOptions.custom_tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeCustomTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-green-800">Estimated Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Per Asset:</span>
                  <span className="font-medium">{estimatedCosts.per_asset}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-green-800">
                  <span>Total ({selectedAssets.length} assets):</span>
                  <span>{estimatedCosts.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {/* Minting Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Minting Summary</CardTitle>
              <CardDescription>Review the minting operation details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Assets to mint:</span>
                  <span className="text-sm font-medium">{selectedAssets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Domain:</span>
                  <span className="text-sm font-medium">{mintingOptions.domain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Asset Type:</span>
                  <span className="text-sm font-medium">{mintingOptions.asset_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total cost:</span>
                  <span className="text-sm font-medium text-green-600">{estimatedCosts.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Properties:</span>
                  <div className="flex gap-1">
                    {mintingOptions.tradeable && <Badge variant="default" className="text-xs">Tradeable</Badge>}
                    {mintingOptions.transferable && <Badge variant="default" className="text-xs">Transferable</Badge>}
                    {mintingOptions.burnable && <Badge variant="destructive" className="text-xs">Burnable</Badge>}
                    {mintingOptions.mintable && <Badge variant="secondary" className="text-xs">Mintable</Badge>}
                  </div>
                </div>
                {mintingOptions.royalty_percentage && mintingOptions.royalty_percentage > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Royalty:</span>
                    <span className="text-sm font-medium">
                      {mintingOptions.royalty_percentage}% to {mintingOptions.royalty_recipient}
                    </span>
                  </div>
                )}
                {mintingOptions.custom_tags.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">Custom Tags:</span>
                    <div className="flex flex-wrap gap-1 max-w-48">
                      {mintingOptions.custom_tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confirm" className="space-y-4">
          {/* Final Confirmation */}
          <Alert>
            <AlertDescription>
              <strong>⚠️ Important Notes:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Minting is irreversible and costs STEEM tokens</li>
                <li>Assets will be converted from Web2 to Web3 format</li>
                <li>Original Web2 functionality will be preserved</li>
                <li>You will receive ownership NFTs on the STEEM blockchain</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ready to Mint</CardTitle>
              <CardDescription>
                Confirm to proceed with minting {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''} for {estimatedCosts.total}
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="flex-1"
          disabled={isLoading}
        >
          Cancel
        </Button>
        
        {currentStep === 'options' ? (
          <Button 
            onClick={() => setCurrentStep('preview')}
            className="flex-1"
          >
            Review Minting
          </Button>
        ) : currentStep === 'preview' ? (
          <Button 
            onClick={() => setCurrentStep('confirm')}
            className="flex-1"
          >
            Confirm Details
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Minting...' : 'Start Minting Process'}
          </Button>
        )}
      </div>
    </div>
  );
}