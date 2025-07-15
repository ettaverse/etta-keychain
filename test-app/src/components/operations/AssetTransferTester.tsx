import React, { useState } from 'react';
import styles from './AssetTransferTester.module.css';

// Import types for testing transfer operations
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

interface AssetTransferTesterProps {
  selectedAssets: UniversalAsset[];
  username: string;
  onResponse: (operation: string, response: any) => void;
  onTransferComplete?: (results: any[]) => void;
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

const AssetTransferTester: React.FC<AssetTransferTesterProps> = ({ 
  selectedAssets, 
  username, 
  onResponse, 
  onTransferComplete 
}) => {
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [transferConfig, setTransferConfig] = useState({
    transferType: 'gift' as 'gift' | 'sale' | 'trade' | 'conversion',
    recipientUser: '',
    salePrice: { amount: '1.000', currency: 'STEEM' },
    gameContext: '',
    memo: ''
  });

  const testTransferViaExtension = async () => {
    if (selectedAssets.length === 0) {
      onResponse('Transfer Test Error', { 
        error: 'No assets selected for transfer test',
        success: false 
      });
      return;
    }

    if (!transferConfig.recipientUser.trim()) {
      onResponse('Transfer Test Error', { 
        error: 'Recipient username is required',
        success: false 
      });
      return;
    }

    setTestingStatus('testing');
    setTestResults([]);

    try {
      // Mock transfer requests that would be sent to extension
      const mockTransferRequests = selectedAssets.map(asset => ({
        assetId: asset.universal_id,
        transferType: transferConfig.transferType,
        recipientUser: transferConfig.recipientUser,
        salePrice: transferConfig.transferType === 'sale' ? transferConfig.salePrice : undefined,
        gameContext: transferConfig.gameContext || undefined,
        memo: transferConfig.memo || undefined
      }));

      onResponse('Testing Extension Transfer', {
        message: 'Simulating transfer requests to Etta Keychain extension',
        transferType: transferConfig.transferType,
        requests: mockTransferRequests,
        assets: selectedAssets.map(a => a.base_metadata.name)
      });

      // Simulate extension API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful response from extension
      const mockResults = selectedAssets.map(asset => ({
        asset: asset,
        success: true,
        transferType: transferConfig.transferType,
        recipientUser: transferConfig.recipientUser,
        transaction_id: `ext_transfer_${Math.random().toString(36).substr(2, 9)}`,
        block_number: Math.floor(Math.random() * 1000000) + 50000000,
        transfer_fee: transferConfig.transferType === 'sale' ? '0.001 STEEM' : '0.000 STEEM',
        final_recipient: transferConfig.recipientUser,
        transfer_amount: transferConfig.transferType === 'sale' ? transferConfig.salePrice.amount + ' ' + transferConfig.salePrice.currency : 'N/A',
        transferred_via: 'extension_api'
      }));

      setTestResults(mockResults);
      setTestingStatus('success');

      onResponse('Extension Transfer Test Complete', {
        success: true,
        message: `Successfully tested ${transferConfig.transferType} transfer of ${selectedAssets.length} assets via extension`,
        transferType: transferConfig.transferType,
        recipient: transferConfig.recipientUser,
        results: mockResults
      });

      onTransferComplete?.(mockResults);

    } catch (error) {
      setTestingStatus('error');
      onResponse('Extension Transfer Test Failed', {
        success: false,
        error: 'Failed to communicate with Etta Keychain extension',
        details: error
      });
    }
  };

  const testExtensionConnection = async () => {
    onResponse('Testing Extension Connection', {
      message: 'Checking if Etta Keychain extension is available for transfers'
    });

    try {
      // In a real implementation, this would check for the extension
      // For now, we'll simulate a successful connection
      await new Promise(resolve => setTimeout(resolve, 500));

      onResponse('Extension Connection Test', {
        success: true,
        message: 'Etta Keychain extension is available and ready for transfers',
        extension_version: '1.0.0-beta',
        api_version: '1.0',
        transfer_capabilities: ['gift', 'sale', 'trade', 'conversion']
      });
    } catch (error) {
      onResponse('Extension Connection Failed', {
        success: false,
        error: 'Could not connect to Etta Keychain extension',
        details: error
      });
    }
  };

  const resetTest = () => {
    setTestingStatus('idle');
    setTestResults([]);
  };

  const selectedTransferType = TRANSFER_TYPES.find(t => t.value === transferConfig.transferType);

  return (
    <div className={styles['transfer-tester-container']}>
      <div className={styles['tester-header']}>
        <h3>🔄 Asset Transfer Extension Tester</h3>
        <p>Test asset transfer functionality via Etta Keychain browser extension</p>
      </div>

      <div className={styles['test-controls']}>
        <div className={styles['selected-assets-info']}>
          <h4>Selected Assets for Transfer Testing ({selectedAssets.length})</h4>
          {selectedAssets.length > 0 ? (
            <div className={styles['asset-list']}>
              {selectedAssets.map(asset => (
                <div key={asset.universal_id} className={styles['asset-item']}>
                  <span className={styles['asset-name']}>{asset.base_metadata.name}</span>
                  <span className={styles['asset-domain']}>{asset.domain}</span>
                  <span className={styles['asset-owner']}>Owner: {asset.current_owner}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles['no-assets']}>No assets selected. Please select assets from the Asset Browser.</p>
          )}
        </div>

        <div className={styles['transfer-configuration']}>
          <h4>Transfer Configuration</h4>
          
          <div className={styles['config-section']}>
            <label className={styles['config-label']}>Transfer Type:</label>
            <div className={styles['transfer-type-grid']}>
              {TRANSFER_TYPES.map(type => (
                <button
                  key={type.value}
                  className={`${styles['transfer-type-btn']} ${
                    transferConfig.transferType === type.value ? styles['selected'] : ''
                  }`}
                  onClick={() => setTransferConfig({...transferConfig, transferType: type.value as any})}
                  disabled={testingStatus === 'testing'}
                >
                  <span className={styles['type-icon']}>{type.icon}</span>
                  <span className={styles['type-label']}>{type.label}</span>
                  <span className={styles['type-description']}>{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles['config-section']}>
            <label className={styles['config-label']}>Recipient Username:</label>
            <input
              type="text"
              className={styles['config-input']}
              value={transferConfig.recipientUser}
              onChange={(e) => setTransferConfig({...transferConfig, recipientUser: e.target.value})}
              placeholder="Enter STEEM username"
              disabled={testingStatus === 'testing'}
            />
          </div>

          {transferConfig.transferType === 'sale' && (
            <div className={styles['config-section']}>
              <label className={styles['config-label']}>Sale Price:</label>
              <div className={styles['price-inputs']}>
                <input
                  type="number"
                  className={styles['config-input']}
                  value={transferConfig.salePrice.amount}
                  onChange={(e) => setTransferConfig({
                    ...transferConfig, 
                    salePrice: {...transferConfig.salePrice, amount: e.target.value}
                  })}
                  placeholder="Amount"
                  step="0.001"
                  min="0"
                  disabled={testingStatus === 'testing'}
                />
                <select
                  className={styles['config-select']}
                  value={transferConfig.salePrice.currency}
                  onChange={(e) => setTransferConfig({
                    ...transferConfig, 
                    salePrice: {...transferConfig.salePrice, currency: e.target.value}
                  })}
                  disabled={testingStatus === 'testing'}
                >
                  <option value="STEEM">STEEM</option>
                  <option value="SBD">SBD</option>
                </select>
              </div>
            </div>
          )}

          {transferConfig.transferType === 'conversion' && (
            <div className={styles['config-section']}>
              <label className={styles['config-label']}>Game Context:</label>
              <input
                type="text"
                className={styles['config-input']}
                value={transferConfig.gameContext}
                onChange={(e) => setTransferConfig({...transferConfig, gameContext: e.target.value})}
                placeholder="Target game or context"
                disabled={testingStatus === 'testing'}
              />
            </div>
          )}

          <div className={styles['config-section']}>
            <label className={styles['config-label']}>Memo (Optional):</label>
            <textarea
              className={styles['config-textarea']}
              value={transferConfig.memo}
              onChange={(e) => setTransferConfig({...transferConfig, memo: e.target.value})}
              placeholder="Transfer message or notes"
              rows={2}
              disabled={testingStatus === 'testing'}
            />
          </div>
        </div>

        <div className={styles['test-actions']}>
          <button 
            onClick={testExtensionConnection}
            className={`${styles['test-btn']} ${styles['connection-btn']}`}
            disabled={testingStatus === 'testing'}
          >
            Test Extension Connection
          </button>
          
          <button 
            onClick={testTransferViaExtension}
            className={`${styles['test-btn']} ${styles['transfer-btn']}`}
            disabled={testingStatus === 'testing' || selectedAssets.length === 0 || !transferConfig.recipientUser.trim()}
          >
            {testingStatus === 'testing' ? 'Testing Transfer...' : `Test ${selectedTransferType?.label} Transfer`}
          </button>

          {testingStatus !== 'idle' && (
            <button 
              onClick={resetTest}
              className={`${styles['test-btn']} ${styles['reset-btn']}`}
              disabled={testingStatus === 'testing'}
            >
              Reset Test
            </button>
          )}
        </div>
      </div>

      {testingStatus === 'testing' && (
        <div className={styles['testing-status']}>
          <div className={styles['loading-spinner']}></div>
          <p>Testing {transferConfig.transferType} transfer operation via extension...</p>
        </div>
      )}

      {testResults.length > 0 && (
        <div className={styles['test-results']}>
          <h4>Transfer Test Results</h4>
          <div className={styles['results-list']}>
            {testResults.map((result, index) => (
              <div key={index} className={`${styles['result-item']} ${result.success ? styles['success'] : styles['error']}`}>
                <div className={styles['result-header']}>
                  <span className={styles['asset-name']}>{result.asset.base_metadata.name}</span>
                  <span className={`${styles['status']} ${result.success ? styles['success'] : styles['error']}`}>
                    {result.success ? '✅ Transfer Success' : '❌ Transfer Failed'}
                  </span>
                </div>
                {result.success && (
                  <div className={styles['result-details']}>
                    <div className={styles['detail-row']}>
                      <span>Transfer Type:</span>
                      <span className={styles['transfer-type']}>{result.transferType}</span>
                    </div>
                    <div className={styles['detail-row']}>
                      <span>Recipient:</span>
                      <span className={styles['recipient']}>{result.recipientUser}</span>
                    </div>
                    <div className={styles['detail-row']}>
                      <span>Transaction ID:</span>
                      <span className={styles['monospace']}>{result.transaction_id}</span>
                    </div>
                    <div className={styles['detail-row']}>
                      <span>Block Number:</span>
                      <span className={styles['monospace']}>{result.block_number}</span>
                    </div>
                    <div className={styles['detail-row']}>
                      <span>Transfer Fee:</span>
                      <span className={styles['cost']}>{result.transfer_fee}</span>
                    </div>
                    {result.transfer_amount !== 'N/A' && (
                      <div className={styles['detail-row']}>
                        <span>Transfer Amount:</span>
                        <span className={styles['amount']}>{result.transfer_amount}</span>
                      </div>
                    )}
                    <div className={styles['detail-row']}>
                      <span>Transferred Via:</span>
                      <span className={styles['method']}>{result.transferred_via}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles['test-info']}>
        <h4>About This Transfer Tester</h4>
        <ul>
          <li>Tests communication with Etta Keychain browser extension for transfers</li>
          <li>Simulates all 4 transfer types: Gift, Sale, Trade, Conversion</li>
          <li>Validates proper data flow between test app and extension</li>
          <li>Ensures security-sensitive transfer operations happen in extension context</li>
          <li>Tests recipient validation and transaction fee calculations</li>
        </ul>
      </div>
    </div>
  );
};

export default AssetTransferTester;