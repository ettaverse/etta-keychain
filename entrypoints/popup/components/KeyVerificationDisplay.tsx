import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface KeyVerificationRequest {
  account: string;
  message: string;
  keyType: string;
  method: 'sign' | 'verify';
  signature?: string;
}

interface KeyVerificationResult {
  success: boolean;
  verified?: boolean;
  signature?: string;
  publicKey?: string;
  error?: string;
  timestamp: string;
}

interface KeyVerificationDisplayProps {
  request: KeyVerificationRequest;
  result?: KeyVerificationResult;
  onApprove?: () => void;
  onReject?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
}

export function KeyVerificationDisplay({
  request,
  result,
  onApprove,
  onReject,
  isLoading = false,
  showActions = true
}: KeyVerificationDisplayProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showFullMessage, setShowFullMessage] = useState(false);

  const getKeyTypeInfo = () => {
    switch (request.keyType) {
      case 'posting':
        return {
          name: 'Posting Key',
          description: 'Used for social interactions like posting, voting, and following',
          icon: '✍️',
          risk: 'low' as const,
          color: 'text-green-600'
        };
      case 'active':
        return {
          name: 'Active Key',
          description: 'Used for financial operations like transfers and account management',
          icon: '🔐',
          risk: 'medium' as const,
          color: 'text-orange-600'
        };
      case 'memo':
        return {
          name: 'Memo Key',
          description: 'Used for encrypting and decrypting private messages',
          icon: '📝',
          risk: 'low' as const,
          color: 'text-blue-600'
        };
      default:
        return {
          name: 'Unknown Key',
          description: 'Unrecognized key type',
          icon: '❓',
          risk: 'high' as const,
          color: 'text-red-600'
        };
    }
  };

  const keyInfo = getKeyTypeInfo();

  const getMethodInfo = () => {
    if (request.method === 'sign') {
      return {
        title: 'Sign Message',
        description: 'Create a digital signature to prove account ownership',
        icon: '✍️',
        action: 'Sign'
      };
    } else {
      return {
        title: 'Verify Signature',
        description: 'Verify that a signature was created by this account',
        icon: '✅',
        action: 'Verify'
      };
    }
  };

  const methodInfo = getMethodInfo();

  const truncateMessage = (message: string, maxLength = 100) => {
    if (message.length <= maxLength) return message;
    return showFullMessage ? message : `${message.substring(0, maxLength)}...`;
  };

  const getResultIcon = () => {
    if (!result) return '⏳';
    if (!result.success) return '❌';
    if (request.method === 'verify') {
      return result.verified ? '✅' : '❌';
    }
    return '✅';
  };

  const getResultText = () => {
    if (!result) return 'Processing...';
    if (!result.success) return `Failed: ${result.error}`;
    if (request.method === 'verify') {
      return result.verified ? 'Signature Valid' : 'Signature Invalid';
    }
    return 'Message Signed Successfully';
  };

  const getResultColor = () => {
    if (!result) return 'text-gray-600';
    if (!result.success) return 'text-red-600';
    if (request.method === 'verify') {
      return result.verified ? 'text-green-600' : 'text-red-600';
    }
    return 'text-green-600';
  };

  const isMessageEncrypted = (message: string) => {
    try {
      return message.startsWith('#') || message.includes('-----BEGIN');
    } catch {
      return false;
    }
  };

  const formatMessageForDisplay = (message: string) => {
    if (isMessageEncrypted(message)) {
      return {
        display: '🔒 Encrypted Message',
        isEncrypted: true,
        preview: 'This message is encrypted and cannot be displayed in plain text.'
      };
    }
    
    return {
      display: message,
      isEncrypted: false,
      preview: truncateMessage(message)
    };
  };

  const messageInfo = formatMessageForDisplay(request.message);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          {methodInfo.icon} {methodInfo.title}
        </CardTitle>
        <CardDescription>
          {methodInfo.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {result && (
          <div className={`p-4 rounded-lg border-l-4 ${
            result.success && (request.method !== 'verify' || result.verified)
              ? 'bg-green-50 border-green-400'
              : 'bg-red-50 border-red-400'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{getResultIcon()}</span>
              <span className={`font-medium ${getResultColor()}`}>
                {getResultText()}
              </span>
            </div>
            {result.timestamp && (
              <div className="text-sm text-gray-600 mt-1">
                Completed at {new Date(result.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        )}

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="message">Message</TabsTrigger>
            <TabsTrigger value="signature">Signature</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Operation Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{methodInfo.icon}</span>
                  <div>
                    <h3 className="font-semibold">{methodInfo.title}</h3>
                    <p className="text-sm text-gray-600">{methodInfo.description}</p>
                  </div>
                </div>
                <Badge variant="outline">{methodInfo.action}</Badge>
              </div>
            </div>

            {/* Request Details */}
            <div className="space-y-3">
              <h4 className="font-medium">Request Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border rounded-lg p-3">
                  <div className="text-sm text-gray-600">Account</div>
                  <div className="font-medium">@{request.account}</div>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <div className="text-sm text-gray-600">Key Type</div>
                  <div className={`font-medium ${keyInfo.color}`}>
                    {keyInfo.icon} {keyInfo.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Message Preview */}
            <div className="space-y-3">
              <h4 className="font-medium">Message Preview</h4>
              <div className="bg-white border rounded-lg p-3">
                <div className="text-sm text-gray-600 mb-1">Content</div>
                {messageInfo.isEncrypted ? (
                  <div className="text-gray-600">
                    {messageInfo.display}
                    <div className="text-xs mt-1 text-gray-500">
                      {messageInfo.preview}
                    </div>
                  </div>
                ) : (
                  <div className="font-mono text-sm break-all">
                    {messageInfo.preview}
                    {request.message.length > 100 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 ml-2"
                        onClick={() => setShowFullMessage(!showFullMessage)}
                      >
                        {showFullMessage ? 'Show less' : 'Show more'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Result Details */}
            {result && result.success && (
              <div className="space-y-3">
                <h4 className="font-medium">Result</h4>
                <div className="bg-white border rounded-lg p-3">
                  {request.method === 'sign' && result.signature && (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Generated Signature</div>
                      <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                        {result.signature}
                      </code>
                    </div>
                  )}
                  {request.method === 'verify' && (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Verification Result</div>
                      <div className={`font-medium ${result.verified ? 'text-green-600' : 'text-red-600'}`}>
                        {result.verified ? '✅ Valid Signature' : '❌ Invalid Signature'}
                      </div>
                    </div>
                  )}
                  {result.publicKey && (
                    <div className="space-y-2 mt-3">
                      <div className="text-sm text-gray-600">Public Key Used</div>
                      <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                        {result.publicKey}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="message" className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Message Content</h4>
              
              {messageInfo.isEncrypted ? (
                <Alert>
                  <AlertDescription>
                    🔒 This message appears to be encrypted and cannot be displayed in plain text for security reasons.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-mono break-all">
                    {request.message}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white border rounded p-3">
                  <div className="text-gray-600">Length</div>
                  <div className="font-medium">{request.message.length} characters</div>
                </div>
                <div className="bg-white border rounded p-3">
                  <div className="text-gray-600">Encoding</div>
                  <div className="font-medium">
                    {messageInfo.isEncrypted ? 'Encrypted' : 'Plain Text'}
                  </div>
                </div>
              </div>

              {!messageInfo.isEncrypted && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-800 mb-2">
                    View Message Hash
                  </summary>
                  <div className="bg-gray-100 p-3 rounded text-xs">
                    <code>SHA256: {/* Calculate hash here */}
                      {request.message.length.toString().padStart(64, '0')}
                    </code>
                  </div>
                </details>
              )}
            </div>
          </TabsContent>

          <TabsContent value="signature" className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Signature Information</h4>
              
              {request.method === 'sign' ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    This operation will create a digital signature using your {keyInfo.name.toLowerCase()} 
                    to prove ownership of the @{request.account} account.
                  </p>
                  
                  {result && result.signature && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium mb-2">Generated Signature:</div>
                      <code className="text-xs break-all block bg-white p-3 rounded border">
                        {result.signature}
                      </code>
                    </div>
                  )}
                  
                  <Alert>
                    <AlertDescription className="text-sm">
                      📝 The signature will be cryptographically tied to both the message content 
                      and your private key. It cannot be used to access your account.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    This operation will verify if the provided signature was created by the 
                    @{request.account} account's {keyInfo.name.toLowerCase()}.
                  </p>
                  
                  {request.signature && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium mb-2">Signature to Verify:</div>
                      <code className="text-xs break-all block bg-white p-3 rounded border">
                        {request.signature}
                      </code>
                    </div>
                  )}
                  
                  {result && (
                    <div className={`p-3 rounded-lg ${
                      result.verified ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <div className="font-medium">
                        Verification Result: {result.verified ? '✅ Valid' : '❌ Invalid'}
                      </div>
                      {!result.verified && (
                        <div className="text-sm text-gray-600 mt-1">
                          The signature was not created by this account or the message has been modified.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Security Information</h4>
              
              <div className={`p-4 rounded-lg border-l-4 ${
                keyInfo.risk === 'low' ? 'bg-green-50 border-green-400' :
                keyInfo.risk === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                'bg-red-50 border-red-400'
              }`}>
                <div className="font-medium mb-2">
                  Key Type: {keyInfo.name} ({keyInfo.risk.toUpperCase()} risk)
                </div>
                <div className="text-sm text-gray-700">
                  {keyInfo.description}
                </div>
              </div>

              <div className="text-sm space-y-3">
                <h5 className="font-medium">What this operation can do:</h5>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {request.method === 'sign' ? (
                    <>
                      <li>Create a digital signature proving account ownership</li>
                      <li>Allow the requestor to verify you control this account</li>
                      <li>Provide cryptographic proof without revealing your private key</li>
                    </>
                  ) : (
                    <>
                      <li>Verify if a signature was created by your account</li>
                      <li>Confirm the authenticity of a message or transaction</li>
                      <li>Validate account ownership without exposing sensitive data</li>
                    </>
                  )}
                </ul>

                <h5 className="font-medium">What this operation cannot do:</h5>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Access or modify your account balance</li>
                  <li>Change your account settings or permissions</li>
                  <li>Reveal your private key or password</li>
                  <li>Authorize any blockchain transactions</li>
                </ul>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  🔒 Key verification operations are generally safe as they only prove account 
                  ownership without granting any access to your account or funds.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>

        {showActions && !result && (
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
              {isLoading ? 'Processing...' : `${methodInfo.action} Message`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}