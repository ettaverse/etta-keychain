import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface CustomJsonRequest {
  account: string;
  id: string;
  keyType: string;
  json: object | string;
  displayName: string;
  required_auths?: string[];
  required_posting_auths?: string[];
}

interface CustomJsonFormatterProps {
  request: CustomJsonRequest;
  onApprove?: () => void;
  onReject?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
}

interface AppInfo {
  name: string;
  description: string;
  icon: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

const KNOWN_APPS: Record<string, AppInfo> = {
  'ssc-mainnet-hive': {
    name: 'Hive Engine',
    description: 'Sidechain token operations and smart contracts',
    icon: '🔧',
    risk: 'medium',
    category: 'DeFi'
  },
  'sm_market_purchase': {
    name: 'Splinterlands',
    description: 'Digital card game marketplace transactions',
    icon: '🎮',
    risk: 'low',
    category: 'Gaming'
  },
  'peakd_app': {
    name: 'PeakD',
    description: 'Social media platform operations',
    icon: '📱',
    risk: 'low',
    category: 'Social'
  },
  'dlux-io': {
    name: 'dLux',
    description: 'Decentralized media and VR platform',
    icon: '🎬',
    risk: 'medium',
    category: 'Media'
  },
  'dtube-snap': {
    name: 'DTube',
    description: 'Decentralized video platform',
    icon: '📺',
    risk: 'low',
    category: 'Media'
  },
  'reblog': {
    name: 'Reblog',
    description: 'Share posts to your blog',
    icon: '🔄',
    risk: 'low',
    category: 'Social'
  },
  'follow': {
    name: 'Follow/Unfollow',
    description: 'Manage your following list',
    icon: '👥',
    risk: 'low',
    category: 'Social'
  }
};

export function CustomJsonFormatter({
  request,
  onApprove,
  onReject,
  isLoading = false,
  showActions = true
}: CustomJsonFormatterProps) {
  const [selectedTab, setSelectedTab] = useState('overview');

  const appInfo = KNOWN_APPS[request.id] || {
    name: 'Unknown Application',
    description: 'Custom JSON operation from unknown source',
    icon: '❓',
    risk: 'high' as const,
    category: 'Unknown'
  };

  const jsonData = typeof request.json === 'string' 
    ? (() => {
        try {
          return JSON.parse(request.json);
        } catch {
          return request.json;
        }
      })()
    : request.json;

  const formatJsonValue = (value: any, depth = 0): ReactNode => {
    if (depth > 3) return <span className="text-gray-500">...</span>;

    if (value === null) return <span className="text-gray-500">null</span>;
    if (typeof value === 'boolean') return <span className="text-blue-600">{value.toString()}</span>;
    if (typeof value === 'number') return <span className="text-green-600">{value}</span>;
    if (typeof value === 'string') return <span className="text-orange-600">"{value}"</span>;

    if (Array.isArray(value)) {
      return (
        <div className="ml-4">
          <span className="text-gray-700">[</span>
          {value.map((item, index) => (
            <div key={index} className="ml-2">
              {formatJsonValue(item, depth + 1)}
              {index < value.length - 1 && <span className="text-gray-500">,</span>}
            </div>
          ))}
          <span className="text-gray-700">]</span>
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="ml-4">
          <span className="text-gray-700">{'{'}</span>
          {Object.entries(value).map(([key, val], index, array) => (
            <div key={key} className="ml-2">
              <span className="text-purple-600">"{key}"</span>
              <span className="text-gray-500">: </span>
              {formatJsonValue(val, depth + 1)}
              {index < array.length - 1 && <span className="text-gray-500">,</span>}
            </div>
          ))}
          <span className="text-gray-700">{'}'}</span>
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  const getRiskBadgeColor = () => {
    switch (appInfo.risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOperationDescription = () => {
    if (request.id === 'follow') {
      const action = jsonData?.[1]?.what?.[0];
      const following = jsonData?.[1]?.following;
      return `${action === 'blog' ? 'Follow' : 'Unfollow'} @${following}`;
    }
    
    if (request.id === 'reblog') {
      const author = jsonData?.[1]?.author;
      const permlink = jsonData?.[1]?.permlink;
      return `Reblog post by @${author}/${permlink}`;
    }

    if (request.id === 'ssc-mainnet-hive') {
      const contractName = jsonData?.contractName;
      const contractAction = jsonData?.contractAction;
      return `${contractName}: ${contractAction}`;
    }

    return appInfo.description;
  };

  const extractImportantData = () => {
    const important: Array<{ label: string; value: any; highlight?: boolean }> = [];

    if (request.id === 'ssc-mainnet-hive') {
      const payload = jsonData?.contractPayload || {};
      if (payload.symbol) important.push({ label: 'Token', value: payload.symbol, highlight: true });
      if (payload.quantity) important.push({ label: 'Amount', value: payload.quantity, highlight: true });
      if (payload.to) important.push({ label: 'Recipient', value: payload.to, highlight: true });
    }

    if (request.id === 'follow') {
      const following = jsonData?.[1]?.following;
      const action = jsonData?.[1]?.what?.[0];
      if (following) important.push({ label: 'User', value: `@${following}`, highlight: true });
      if (action) important.push({ label: 'Action', value: action === 'blog' ? 'Follow' : 'Unfollow' });
    }

    if (request.id === 'reblog') {
      const author = jsonData?.[1]?.author;
      const permlink = jsonData?.[1]?.permlink;
      if (author) important.push({ label: 'Author', value: `@${author}`, highlight: true });
      if (permlink) important.push({ label: 'Post', value: permlink });
    }

    return important;
  };

  const importantData = extractImportantData();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          {appInfo.icon} Custom JSON Operation
        </CardTitle>
        <CardDescription>
          Application requesting custom JSON operation
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="data">JSON Data</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Application Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{appInfo.icon}</span>
                  <div>
                    <h3 className="font-semibold">{appInfo.name}</h3>
                    <p className="text-sm text-gray-600">{getOperationDescription()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={getRiskBadgeColor()}>
                    {appInfo.risk.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{appInfo.category}</Badge>
                </div>
              </div>
            </div>

            {/* Important Data */}
            {importantData.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Key Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  {importantData.map((item, index) => (
                    <div key={index} className="bg-white border rounded-lg p-3">
                      <div className="text-sm text-gray-600">{item.label}</div>
                      <div className={`font-medium ${item.highlight ? 'text-blue-600' : ''}`}>
                        {String(item.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operation Summary */}
            <div className="space-y-3">
              <h4 className="font-medium">Operation Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Application ID:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{request.id}</code>
                </div>
                <div className="flex justify-between">
                  <span>Authority Required:</span>
                  <span>{request.keyType === 'posting' ? 'Posting Key' : 'Active Key'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Account:</span>
                  <span>@{request.account}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Request Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Application ID:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{request.id}</code>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Display Name:</span>
                  <span>{request.displayName || 'None provided'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Key Type:</span>
                  <span>{request.keyType}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Account:</span>
                  <span>@{request.account}</span>
                </div>
                {request.required_auths && request.required_auths.length > 0 && (
                  <div className="py-1">
                    <span className="text-gray-600">Required Active Auths:</span>
                    <div className="mt-1">
                      {request.required_auths.map((auth, index) => (
                        <Badge key={index} variant="outline" className="mr-1">
                          @{auth}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {request.required_posting_auths && request.required_posting_auths.length > 0 && (
                  <div className="py-1">
                    <span className="text-gray-600">Required Posting Auths:</span>
                    <div className="mt-1">
                      {request.required_posting_auths.map((auth, index) => (
                        <Badge key={index} variant="outline" className="mr-1">
                          @{auth}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">JSON Data</h4>
              <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {formatJsonValue(jsonData)}
                </pre>
              </div>
              
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  View Raw JSON
                </summary>
                <div className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  <code>{JSON.stringify(jsonData, null, 2)}</code>
                </div>
              </details>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Security Assessment</h4>
              
              <div className={`p-4 rounded-lg border-l-4 ${
                appInfo.risk === 'low' ? 'bg-green-50 border-green-400' :
                appInfo.risk === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                appInfo.risk === 'high' ? 'bg-orange-50 border-orange-400' :
                'bg-red-50 border-red-400'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Risk Level: {appInfo.risk.toUpperCase()}</span>
                </div>
                <div className="text-sm text-gray-700">
                  {appInfo.risk === 'low' && 'This operation is generally safe and commonly used.'}
                  {appInfo.risk === 'medium' && 'This operation involves some risk. Review the details carefully.'}
                  {appInfo.risk === 'high' && 'This operation has significant risk. Ensure you trust the application.'}
                  {appInfo.risk === 'critical' && 'This operation is very dangerous. Only approve if you absolutely trust the source.'}
                </div>
              </div>

              {appInfo.risk === 'high' && (
                <Alert>
                  <AlertDescription className="text-sm">
                    ⚠️ Unknown application detected. This custom JSON operation comes from an unrecognized source. 
                    Verify the application is legitimate before approving.
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-sm space-y-2">
                <h5 className="font-medium">What this operation can do:</h5>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Execute custom logic on the blockchain</li>
                  <li>Interact with third-party applications</li>
                  <li>Store custom data in your account history</li>
                  {request.keyType === 'posting' ? (
                    <li>Modify your posting settings and social interactions</li>
                  ) : (
                    <li>Access your account funds and perform financial operations</li>
                  )}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {showActions && (
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onReject}
              disabled={isLoading}
              className="flex-1"
            >
              Reject
            </Button>
            <Button
              type="button"
              onClick={onApprove}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Processing...' : 'Approve Operation'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}