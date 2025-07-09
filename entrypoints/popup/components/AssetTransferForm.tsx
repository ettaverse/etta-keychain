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
import { Avatar } from '@/components/ui/avatar';

interface UniversalAsset {
  universal_id: string;
  domain: string;
  current_owner: string;
  base_metadata: {
    name: string;
    description: string;
    image_url?: string;
    core_attributes: Record<string, any>;
    tags: string[];
  };
  properties: {
    tradeable: boolean;
    transferable: boolean;
    burnable: boolean;
    mintable: boolean;
  };
  economic_data?: {
    current_value?: { amount: string; currency: string };
    last_sale?: { amount: string; currency: string; timestamp: string };
  };
}

interface TransferRequest {
  assetId: string;
  transferType: 'gift' | 'sale' | 'trade' | 'conversion';
  recipientUser: string;
  salePrice?: { amount: string; currency: string };
  gameContext?: string;
  memo?: string;
}

interface AssetTransferFormProps {
  asset: UniversalAsset;
  currentAccount: string;
  onSubmit: (data: TransferRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TRANSFER_TYPES = [
  { 
    value: 'gift', 
    label: 'Gift', 
    icon: '🎁', 
    description: 'Transfer asset for free to another user',
    color: 'bg-green-100 text-green-800'
  },
  { 
    value: 'sale', 
    label: 'Sale', 
    icon: '💰', 
    description: 'Sell asset for STEEM or SBD payment',
    color: 'bg-blue-100 text-blue-800'
  },
  { 
    value: 'trade', 
    label: 'Trade', 
    icon: '🔄', 
    description: 'Exchange asset with another user',
    color: 'bg-purple-100 text-purple-800'
  },
  { 
    value: 'conversion', 
    label: 'Conversion', 
    icon: '⚡', 
    description: 'Convert asset for cross-game use',
    color: 'bg-orange-100 text-orange-800'
  }
];

const SUPPORTED_CURRENCIES = [
  { value: 'STEEM', label: 'STEEM', icon: '🟢' },
  { value: 'SBD', label: 'SBD', icon: '💵' },
];

const GAME_CONTEXTS = [
  { value: '', label: 'No specific game' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'domains', label: 'Domains' },
  { value: 'music', label: 'Music' },
  { value: 'art', label: 'Art' }
];

export function AssetTransferForm({
  asset,
  currentAccount,
  onSubmit,
  onCancel,
  isLoading = false
}: AssetTransferFormProps) {
  const [currentStep, setCurrentStep] = useState<'details' | 'confirm'>('details');
  const [formData, setFormData] = useState<TransferRequest>({
    assetId: asset.universal_id,
    transferType: 'gift',
    recipientUser: '',
    gameContext: asset.domain,
    memo: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Validate form data
  useEffect(() => {
    validateForm();
  }, [formData, asset]);

  const validateForm = () => {
    const newErrors: string[] = [];
    const newWarnings: string[] = [];

    // Check if asset is transferable
    if (!asset.properties.transferable) {
      newErrors.push('This asset is not transferable');
    }

    // Check recipient user
    if (!formData.recipientUser.trim()) {
      newErrors.push('Recipient username is required');
    } else if (formData.recipientUser === currentAccount) {
      newErrors.push('Cannot transfer to yourself');
    } else if (formData.recipientUser.length < 3) {
      newErrors.push('Username must be at least 3 characters');
    }

    // Check sale-specific validation
    if (formData.transferType === 'sale') {
      if (!asset.properties.tradeable) {
        newErrors.push('This asset is not tradeable');
      }
      if (!formData.salePrice?.amount || parseFloat(formData.salePrice.amount) <= 0) {
        newErrors.push('Sale price is required and must be greater than 0');
      }
    }

    // Warnings
    if (formData.transferType === 'gift' && asset.economic_data?.current_value) {
      newWarnings.push(
        `You are gifting an asset valued at ${asset.economic_data.current_value.amount} ${asset.economic_data.current_value.currency}`
      );
    }

    if (formData.transferType === 'conversion' && !formData.gameContext) {
      newWarnings.push('Game context recommended for conversion transfers');
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
  };

  const handleInputChange = (field: keyof TransferRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSalePriceChange = (field: 'amount' | 'currency', value: string) => {
    setFormData(prev => ({
      ...prev,
      salePrice: {
        amount: prev.salePrice?.amount || '0',
        currency: prev.salePrice?.currency || 'STEEM',
        [field]: value
      }
    }));
  };

  const handleSubmit = () => {
    if (errors.length === 0) {
      onSubmit(formData);
    }
  };

  const selectedTransferType = TRANSFER_TYPES.find(t => t.value === formData.transferType);
  const isFormValid = errors.length === 0 && formData.recipientUser.trim().length >= 3;

  return (
    <div className="space-y-6">
      {/* Asset Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            🔄 Transfer Asset
          </CardTitle>
          <CardDescription>
            Transfer ownership of this asset to another user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {asset.base_metadata.image_url ? (
                <img 
                  src={asset.base_metadata.image_url} 
                  alt={asset.base_metadata.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">📄</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1 truncate">
                {asset.base_metadata.name}
              </h3>
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {asset.base_metadata.description}
              </p>
              <div className="flex gap-2 text-xs">
                <Badge variant={asset.properties.transferable ? 'default' : 'destructive'}>
                  {asset.properties.transferable ? '✅ Transferable' : '❌ Not Transferable'}
                </Badge>
                <Badge variant={asset.properties.tradeable ? 'default' : 'secondary'}>
                  {asset.properties.tradeable ? '✅ Tradeable' : '❌ Not Tradeable'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-based Content */}
      <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as 'details' | 'confirm')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Transfer Details</TabsTrigger>
          <TabsTrigger value="confirm" disabled={!isFormValid}>
            Confirm Transfer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {/* Transfer Type Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transfer Type</CardTitle>
              <CardDescription>Choose how you want to transfer this asset</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {TRANSFER_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleInputChange('transferType', type.value)}
                  disabled={type.value === 'sale' && !asset.properties.tradeable}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${formData.transferType === type.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${type.value === 'sale' && !asset.properties.tradeable 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'cursor-pointer'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{type.icon}</span>
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{type.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Transfer Details Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recipient */}
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Username</Label>
                <Input
                  id="recipient"
                  value={formData.recipientUser}
                  onChange={(e) => handleInputChange('recipientUser', e.target.value)}
                  placeholder="Enter STEEM username"
                  className={errors.some(e => e.includes('username') || e.includes('Recipient')) 
                    ? 'border-red-500' : ''
                  }
                />
              </div>

              {/* Sale Price (if sale) */}
              {formData.transferType === 'sale' && (
                <div className="space-y-2">
                  <Label>Sale Price</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={formData.salePrice?.amount || ''}
                      onChange={(e) => handleSalePriceChange('amount', e.target.value)}
                      placeholder="0.000"
                      className="flex-1"
                    />
                    <Select
                      value={formData.salePrice?.currency || 'STEEM'}
                      onValueChange={(value) => handleSalePriceChange('currency', value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.icon} {currency.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Game Context */}
              <div className="space-y-2">
                <Label htmlFor="gameContext">Game Context (Optional)</Label>
                <Select
                  value={formData.gameContext || ''}
                  onValueChange={(value) => handleInputChange('gameContext', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select game context" />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_CONTEXTS.map((context) => (
                      <SelectItem key={context.value} value={context.value}>
                        {context.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Memo */}
              <div className="space-y-2">
                <Label htmlFor="memo">Transfer Message (Optional)</Label>
                <Input
                  id="memo"
                  value={formData.memo || ''}
                  onChange={(e) => handleInputChange('memo', e.target.value)}
                  placeholder="Add a message for the recipient..."
                  maxLength={280}
                />
                <p className="text-xs text-gray-500">
                  {(formData.memo || '').length}/280 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Validation Messages */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {warnings.length > 0 && (
            <Alert>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="confirm" className="space-y-4">
          {/* Transfer Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transfer Summary</CardTitle>
              <CardDescription>Please review the transfer details before confirming</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Asset:</span>
                  <span className="text-sm font-medium">{asset.base_metadata.name}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Owner:</span>
                  <span className="text-sm font-medium">{currentAccount}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Transfer Type:</span>
                  <Badge className={selectedTransferType?.color}>
                    {selectedTransferType?.icon} {selectedTransferType?.label}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Recipient:</span>
                  <span className="text-sm font-medium">{formData.recipientUser}</span>
                </div>

                {formData.transferType === 'sale' && formData.salePrice && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sale Price:</span>
                    <span className="text-sm font-medium text-green-600">
                      {formData.salePrice.amount} {formData.salePrice.currency}
                    </span>
                  </div>
                )}

                {formData.gameContext && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Game Context:</span>
                    <span className="text-sm font-medium">{formData.gameContext}</span>
                  </div>
                )}

                {formData.memo && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">Message:</span>
                    <span className="text-sm font-medium text-right max-w-48">{formData.memo}</span>
                  </div>
                )}
              </div>

              <Separator />

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>⚠️ Important:</strong> Asset transfers are irreversible. 
                  You will no longer own this asset after the transfer is completed.
                </AlertDescription>
              </Alert>
            </CardContent>
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
        
        {currentStep === 'details' ? (
          <Button 
            onClick={() => setCurrentStep('confirm')}
            disabled={!isFormValid}
            className="flex-1"
          >
            Review Transfer
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Processing...' : 'Confirm Transfer'}
          </Button>
        )}
      </div>
    </div>
  );
}