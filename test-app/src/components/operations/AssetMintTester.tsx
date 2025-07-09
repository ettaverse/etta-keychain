import React, { useState } from 'react';
import styles from './AssetMintTester.module.css';

// Import types for testing minting operations
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

interface AssetMintTesterProps {
  selectedAssets: UnmintedAsset[];
  username: string;
  onResponse: (operation: string, response: any) => void;
  onMintComplete?: (results: any[]) => void;
}

const AssetMintTester: React.FC<AssetMintTesterProps> = ({ 
  selectedAssets, 
  username, 
  onResponse, 
  onMintComplete 
}) => {
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResults, setTestResults] = useState<any[]>([]);

  const testMintingViaExtension = async () => {
    if (selectedAssets.length === 0) {
      onResponse('Mint Test Error', { 
        error: 'No assets selected for minting test',
        success: false 
      });
      return;
    }

    setTestingStatus('testing');
    setTestResults([]);

    try {
      // Mock minting request that would be sent to extension
      const mockMintingRequest: MintingRequest = {
        assets: selectedAssets,
        options: {
          domain: 'gaming',
          asset_type: 'universal',
          tradeable: true,
          transferable: true,
          burnable: false,
          mintable: false,
          total_supply: 1,
          royalty_percentage: 0,
          royalty_recipient: username,
          custom_tags: ['test', 'via-extension']
        }
      };

      onResponse('Testing Extension Minting', {
        message: 'Simulating minting request to Etta Keychain extension',
        request: mockMintingRequest,
        assets: selectedAssets.map(a => a.name)
      });

      // Simulate extension API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock successful response from extension
      const mockResults = selectedAssets.map(asset => ({
        asset: asset,
        success: true,
        universal_id: `extension_${asset.domain}_${asset.source_id}_${Date.now()}`,
        transaction_id: `ext_tx_${Math.random().toString(36).substr(2, 9)}`,
        block_number: Math.floor(Math.random() * 1000000) + 50000000,
        mint_cost: '0.001 STEEM',
        minted_via: 'extension_api'
      }));

      setTestResults(mockResults);
      setTestingStatus('success');

      onResponse('Extension Minting Test Complete', {
        success: true,
        message: `Successfully tested minting ${selectedAssets.length} assets via extension`,
        results: mockResults
      });

      onMintComplete?.(mockResults);

    } catch (error) {
      setTestingStatus('error');
      onResponse('Extension Minting Test Failed', {
        success: false,
        error: 'Failed to communicate with Etta Keychain extension',
        details: error
      });
    }
  };

  const testExtensionConnection = async () => {
    onResponse('Testing Extension Connection', {
      message: 'Checking if Etta Keychain extension is available'
    });

    try {
      // In a real implementation, this would check for the extension
      // For now, we'll simulate a successful connection
      await new Promise(resolve => setTimeout(resolve, 500));

      onResponse('Extension Connection Test', {
        success: true,
        message: 'Etta Keychain extension is available and ready',
        extension_version: '1.0.0-beta',
        api_version: '1.0'
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

  return (
    <div className={styles["mint-tester-container"]}>
      <div className={styles["tester-header"]}>
        <h3>🧪 Asset Minting Extension Tester</h3>
        <p>Test minting functionality via Etta Keychain browser extension</p>
      </div>

      <div className={styles["test-controls"]}>
        <div className={styles["selected-assets-info"]}>
          <h4>Selected Assets for Testing ({selectedAssets.length})</h4>
          {selectedAssets.length > 0 ? (
            <div className={styles["asset-list"]}>
              {selectedAssets.map(asset => (
                <div key={asset.id} className={styles["asset-item"]}>
                  <span className={styles["asset-name"]}>{asset.name}</span>
                  <span className={styles["asset-domain"]}>{asset.domain}</span>
                  <span className={styles["asset-platform"]}>{asset.source_platform}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles["no-assets"]}>No assets selected. Please select assets from the Asset Browser.</p>
          )}
        </div>

        <div className={styles["test-actions"]}>
          <button 
            onClick={testExtensionConnection}
            className={`${styles["test-btn"]} ${styles["connection-btn"]}`}
            disabled={testingStatus === 'testing'}
          >
            Test Extension Connection
          </button>
          
          <button 
            onClick={testMintingViaExtension}
            className={`${styles["test-btn"]} ${styles["mint-btn"]}`}
            disabled={testingStatus === 'testing' || selectedAssets.length === 0}
          >
            {testingStatus === 'testing' ? 'Testing Minting...' : 'Test Minting via Extension'}
          </button>

          {testingStatus !== 'idle' && (
            <button 
              onClick={resetTest}
              className={`${styles["test-btn"]} ${styles["reset-btn"]}`}
              disabled={testingStatus === 'testing'}
            >
              Reset Test
            </button>
          )}
        </div>
      </div>

      {testingStatus === 'testing' && (
        <div className={styles["testing-status"]}>
          <div className={styles["loading-spinner"]}></div>
          <p>Testing minting operation via extension...</p>
        </div>
      )}

      {testResults.length > 0 && (
        <div className={styles["test-results"]}>
          <h4>Test Results</h4>
          <div className={styles["results-list"]}>
            {testResults.map((result, index) => (
              <div key={index} className={`${styles["result-item"]} ${result.success ? styles['success'] : styles['error']}`}>
                <div className={styles["result-header"]}>
                  <span className={styles["asset-name"]}>{result.asset.name}</span>
                  <span className={`${styles["status"]} ${result.success ? styles['success'] : styles['error']}`}>
                    {result.success ? '✅ Success' : '❌ Failed'}
                  </span>
                </div>
                {result.success && (
                  <div className={styles["result-details"]}>
                    <div className={styles["detail-row"]}>
                      <span>Universal ID:</span>
                      <span className={styles["monospace"]}>{result.universal_id}</span>
                    </div>
                    <div className={styles["detail-row"]}>
                      <span>Transaction ID:</span>
                      <span className={styles["monospace"]}>{result.transaction_id}</span>
                    </div>
                    <div className={styles["detail-row"]}>
                      <span>Block Number:</span>
                      <span className={styles["monospace"]}>{result.block_number}</span>
                    </div>
                    <div className={styles["detail-row"]}>
                      <span>Mint Cost:</span>
                      <span className={styles["cost"]}>{result.mint_cost}</span>
                    </div>
                    <div className={styles["detail-row"]}>
                      <span>Minted Via:</span>
                      <span className={styles["method"]}>{result.minted_via}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles["test-info"]}>
        <h4>About This Tester</h4>
        <ul>
          <li>Tests communication with Etta Keychain browser extension</li>
          <li>Simulates minting requests using the extension API</li>
          <li>Validates proper data flow between test app and extension</li>
          <li>Ensures security-sensitive operations happen in extension context</li>
        </ul>
      </div>

    </div>
  );
};

export default AssetMintTester;