import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';

interface VoteRequest {
  account: string;
  permlink: string;
  author: string;
  weight: number;
}

interface VoteOperationUIProps {
  initialData?: Partial<VoteRequest>;
  onSubmit: (data: VoteRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
  accounts: string[];
  votingPower?: Record<string, number>;
}

interface PostInfo {
  title?: string;
  category?: string;
  created?: string;
  payout?: number;
  votes?: number;
}

export function VoteOperationUI({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  accounts,
  votingPower = {}
}: VoteOperationUIProps) {
  const [formData, setFormData] = useState<VoteRequest>({
    account: initialData.account || '',
    permlink: initialData.permlink || '',
    author: initialData.author || '',
    weight: initialData.weight || 10000
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [postInfo, setPostInfo] = useState<PostInfo | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(false);

  const currentVotingPower = votingPower[formData.account] || 100;
  const votePercentage = formData.weight / 100;
  const isUpvote = formData.weight > 0;
  const isDownvote = formData.weight < 0;

  // Calculate estimated vote value (simplified calculation)
  const estimatedVoteValue = Math.abs(votePercentage) * (currentVotingPower / 100) * 0.01;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.account) {
      newErrors.account = 'Account is required';
    }

    if (!formData.author) {
      newErrors.author = 'Author is required';
    }

    if (!formData.permlink) {
      newErrors.permlink = 'Permlink is required';
    }

    if (formData.weight === 0) {
      newErrors.weight = 'Vote weight cannot be zero';
    }

    if (Math.abs(formData.weight) > 10000) {
      newErrors.weight = 'Vote weight cannot exceed 100%';
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

  const handleInputChange = (field: keyof VoteRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleWeightChange = (value: number[]) => {
    handleInputChange('weight', value[0]);
  };

  const handleUrlParse = (url: string) => {
    try {
      // Parse STEEM post URL format: https://steemit.com/@author/permlink
      const match = url.match(/\/@([^/]+)\/([^/?]+)/);
      if (match) {
        const [, author, permlink] = match;
        handleInputChange('author', author);
        handleInputChange('permlink', permlink);
      }
    } catch (error) {
      console.error('Failed to parse URL:', error);
    }
  };

  const loadPostInfo = async () => {
    if (!formData.author || !formData.permlink) return;
    
    setIsLoadingPost(true);
    try {
      // Simulate API call to get post information
      setTimeout(() => {
        setPostInfo({
          title: `Post by @${formData.author}`,
          category: 'steemit',
          created: new Date().toISOString(),
          payout: 1.23,
          votes: 42
        });
        setIsLoadingPost(false);
      }, 1000);
    } catch (error) {
      setIsLoadingPost(false);
    }
  };

  useEffect(() => {
    loadPostInfo();
  }, [formData.author, formData.permlink]);

  const getVoteTypeIcon = () => {
    if (isUpvote) return '👍';
    if (isDownvote) return '👎';
    return '🗳️';
  };

  const getVoteTypeText = () => {
    if (isUpvote) return 'Upvote';
    if (isDownvote) return 'Downvote';
    return 'Neutral';
  };

  const getWeightColor = () => {
    if (isUpvote) return 'text-green-600';
    if (isDownvote) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          {getVoteTypeIcon()} Vote on Post
        </CardTitle>
        <CardDescription>
          Cast your vote on a STEEM post or comment
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="account">Voting Account</Label>
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
                      <Badge variant="secondary" className="ml-2">
                        {votingPower[account] || 100}% VP
                      </Badge>
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

          {/* URL Input Helper */}
          <div className="space-y-2">
            <Label htmlFor="url">Post URL (Optional)</Label>
            <Input
              id="url"
              placeholder="https://steemit.com/@author/permlink"
              onChange={(e) => handleUrlParse(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Paste a STEEM post URL to auto-fill author and permlink
            </p>
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => handleInputChange('author', e.target.value)}
              placeholder="Enter author username"
              className={errors.author ? 'border-red-500' : ''}
            />
            {errors.author && (
              <Alert>
                <AlertDescription className="text-sm text-red-600">
                  {errors.author}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Permlink */}
          <div className="space-y-2">
            <Label htmlFor="permlink">Permlink</Label>
            <Input
              id="permlink"
              value={formData.permlink}
              onChange={(e) => handleInputChange('permlink', e.target.value)}
              placeholder="Enter post permlink"
              className={errors.permlink ? 'border-red-500' : ''}
            />
            {errors.permlink && (
              <Alert>
                <AlertDescription className="text-sm text-red-600">
                  {errors.permlink}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Post Information */}
          {(postInfo || isLoadingPost) && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Post Information</h4>
              {isLoadingPost ? (
                <div className="text-sm text-gray-500">Loading post data...</div>
              ) : postInfo ? (
                <div className="space-y-1 text-sm">
                  <div className="font-medium">{postInfo.title}</div>
                  <div className="text-gray-600">by @{formData.author}</div>
                  {postInfo.payout && (
                    <div className="flex justify-between">
                      <span>Current Payout:</span>
                      <span>${postInfo.payout.toFixed(2)}</span>
                    </div>
                  )}
                  {postInfo.votes && (
                    <div className="flex justify-between">
                      <span>Total Votes:</span>
                      <span>{postInfo.votes}</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Vote Weight Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Vote Weight</Label>
              <div className={`font-medium ${getWeightColor()}`}>
                {getVoteTypeText()} {Math.abs(votePercentage).toFixed(1)}%
              </div>
            </div>
            
            <div className="space-y-3">
              <Slider
                value={[formData.weight]}
                onValueChange={handleWeightChange}
                min={-10000}
                max={10000}
                step={100}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>-100% (Downvote)</span>
                <span>0%</span>
                <span>+100% (Upvote)</span>
              </div>
            </div>

            {/* Quick Vote Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {[-10000, -2500, 0, 2500, 10000].map((weight) => (
                <Button
                  key={weight}
                  type="button"
                  variant={formData.weight === weight ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleInputChange('weight', weight)}
                  className="text-xs"
                >
                  {weight === 0 ? '0%' : `${weight > 0 ? '+' : ''}${weight / 100}%`}
                </Button>
              ))}
            </div>

            {errors.weight && (
              <Alert>
                <AlertDescription className="text-sm text-red-600">
                  {errors.weight}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Vote Impact Summary */}
          {formData.weight !== 0 && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Vote Impact</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Vote Type:</span>
                  <span className={getWeightColor()}>{getVoteTypeText()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vote Strength:</span>
                  <span>{Math.abs(votePercentage).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Voting Power:</span>
                  <span>{currentVotingPower.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Value:</span>
                  <span>${estimatedVoteValue.toFixed(3)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>VP After Vote:</span>
                  <span>{Math.max(0, currentVotingPower - (Math.abs(votePercentage) * 0.02)).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Voting Power Warning */}
          {currentVotingPower < 80 && (
            <Alert>
              <AlertDescription className="text-sm text-amber-600">
                ⚠️ Your voting power is below 80%. Consider waiting for it to recharge for maximum impact.
              </AlertDescription>
            </Alert>
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
              {isLoading ? 'Voting...' : `Cast ${getVoteTypeText()}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}