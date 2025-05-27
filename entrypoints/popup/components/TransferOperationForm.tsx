import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TransferRequest {
  account: string;
  to: string;
  amount: string;
  memo: string;
  currency: string;
  enforce?: boolean;
}

interface TransferOperationFormProps {
  initialData?: Partial<TransferRequest>;
  onSubmit: (data: TransferRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
  accounts: string[];
  balances?: Record<string, { steem: number; sbd: number; sp: number }>;
}

const SUPPORTED_CURRENCIES = [
  { value: 'STEEM', label: 'STEEM', icon: '🟢' },
  { value: 'SBD', label: 'SBD (Steem Dollars)', icon: '💵' },
];

export function TransferOperationForm({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  accounts,
  balances = {}
}: TransferOperationFormProps) {
  const [formData, setFormData] = useState<TransferRequest>({
    account: initialData.account || '',
    to: initialData.to || '',
    amount: initialData.amount || '',
    memo: initialData.memo || '',
    currency: initialData.currency || 'STEEM',
    enforce: initialData.enforce || false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const selectedBalance = balances[formData.account];
  const currentBalance = selectedBalance ? selectedBalance[formData.currency.toLowerCase() as keyof typeof selectedBalance] : 0;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.account) {
      newErrors.account = 'Account is required';
    }

    if (!formData.to) {
      newErrors.to = 'Recipient is required';
    } else if (formData.to === formData.account) {
      newErrors.to = 'Cannot transfer to yourself';
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      } else if (amount > currentBalance) {
        newErrors.amount = `Insufficient balance. Available: ${currentBalance.toFixed(3)} ${formData.currency}`;
      }
    }

    if (formData.memo.length > 2048) {
      newErrors.memo = 'Memo must be less than 2048 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof TransferRequest, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMaxAmount = () => {
    if (currentBalance > 0) {
      const maxAmount = Math.max(0, currentBalance - 0.001).toFixed(3);
      handleInputChange('amount', maxAmount);
    }
  };

  const estimatedFee = 0.001;
  const finalAmount = parseFloat(formData.amount || '0');
  const totalCost = finalAmount + (formData.currency === 'STEEM' ? estimatedFee : 0);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          💸 Transfer Funds
        </CardTitle>
        <CardDescription>
          Send STEEM or SBD to another account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From Account */}
          <div className="space-y-2">
            <Label htmlFor="account">From Account</Label>
            <Select
              value={formData.account}
              onValueChange={(value) => handleInputChange('account', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account} value={account}>
                    <div className="flex items-center justify-between w-full">
                      <span>@{account}</span>
                      {selectedBalance && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedBalance.steem.toFixed(3)} STEEM
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account && (
              <Alert>
                <AlertDescription className="text-sm text-red-600">
                  {errors.account}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* To Account */}
          <div className="space-y-2">
            <Label htmlFor="to">To Account</Label>
            <Input
              id="to"
              value={formData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              placeholder="Enter recipient username"
              className={errors.to ? 'border-red-500' : ''}
            />
            {errors.to && (
              <Alert>
                <AlertDescription className="text-sm text-red-600">
                  {errors.to}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Currency Selection */}
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => handleInputChange('currency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    <div className="flex items-center gap-2">
                      <span>{currency.icon}</span>
                      <span>{currency.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount</Label>
              {currentBalance > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMaxAmount}
                >
                  Max: {currentBalance.toFixed(3)}
                </Button>
              )}
            </div>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.001"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.000"
                className={errors.amount ? 'border-red-500 pr-16' : 'pr-16'}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                {formData.currency}
              </div>
            </div>
            {errors.amount && (
              <Alert>
                <AlertDescription className="text-sm text-red-600">
                  {errors.amount}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Memo */}
          <div className="space-y-2">
            <Label htmlFor="memo">Memo (Optional)</Label>
            <Input
              id="memo"
              value={formData.memo}
              onChange={(e) => handleInputChange('memo', e.target.value)}
              placeholder="Add a note (optional)"
              className={errors.memo ? 'border-red-500' : ''}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Memo will be public on the blockchain</span>
              <span>{formData.memo.length}/2048</span>
            </div>
            {errors.memo && (
              <Alert>
                <AlertDescription className="text-sm text-red-600">
                  {errors.memo}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Transaction Summary */}
          {formData.amount && !errors.amount && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Transaction Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Transfer Amount:</span>
                  <span>{finalAmount.toFixed(3)} {formData.currency}</span>
                </div>
                {formData.currency === 'STEEM' && (
                  <div className="flex justify-between">
                    <span>Estimated Fee:</span>
                    <span>{estimatedFee.toFixed(3)} STEEM</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total Cost:</span>
                  <span>{totalCost.toFixed(3)} {formData.currency}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Remaining Balance:</span>
                  <span>{Math.max(0, currentBalance - totalCost).toFixed(3)} {formData.currency}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || Object.keys(errors).length > 0}
              className="flex-1"
            >
              {isLoading ? 'Processing...' : 'Send Transfer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}