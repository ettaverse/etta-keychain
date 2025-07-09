import React, { useState, useEffect } from 'react';
import styles from './AssetBrowser.module.css';

// Mock types matching the main project structure
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

interface AssetBrowserProps {
  username: string;
  onResponse: (operation: string, response: any) => void;
  onAssetSelect?: (assets: UnmintedAsset[]) => void;
}

const AssetBrowser: React.FC<AssetBrowserProps> = ({ username, onResponse, onAssetSelect }) => {
  const [assets, setAssets] = useState<UnmintedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState({
    domain: 'all',
    assetType: 'all',
    sourcePlatform: 'all'
  });

  // Mock unminted assets data
  const mockUnmintedAssets: UnmintedAsset[] = [
    {
      id: 'domain_001',
      name: 'example.4id',
      description: 'Premium domain name in the 4ID marketplace',
      image_url: 'https://via.placeholder.com/200x200?text=Domain',
      asset_type: 'domain',
      domain: 'domains',
      source_platform: '4ID.com',
      source_id: 'domain_12345',
      estimated_mint_cost: '0.001 STEEM',
      web2_functionality: ['domain_resolution', 'marketplace_listing', 'transfer']
    },
    {
      id: 'domain_002', 
      name: 'gaming.4id',
      description: 'Gaming-focused domain with premium branding',
      image_url: 'https://via.placeholder.com/200x200?text=Gaming',
      asset_type: 'domain',
      domain: 'gaming',
      source_platform: '4ID.com',
      source_id: 'domain_67890',
      estimated_mint_cost: '0.001 STEEM',
      web2_functionality: ['domain_resolution', 'gaming_integration', 'marketplace_listing']
    },
    {
      id: 'digital_item_001',
      name: 'Fire Dragon Card',
      description: 'Rare fire-elemental trading card from beta collection',
      image_url: 'https://via.placeholder.com/200x200?text=Fire+Dragon',
      asset_type: 'trading_card',
      domain: 'gaming',
      source_platform: '4IR.network',
      source_id: 'card_11111',
      estimated_mint_cost: '0.002 STEEM',
      web2_functionality: ['database_tracking', 'portfolio_display']
    }
  ];

  // Simulate loading unminted assets from 4IR/4ID APIs
  const loadUnmintedAssets = async () => {
    setLoading(true);
    onResponse('Asset Discovery', { message: 'Discovering unminted assets...', loading: true });
    
    try {
      // In real implementation, this would call:
      // - 4IR.network API for tracked but unminted assets
      // - 4ID.com API for purchased but unminted domains
      // - Cross-reference with existing blockchain assets
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAssets(mockUnmintedAssets);
      onResponse('Asset Discovery', { 
        success: true,
        message: `Found ${mockUnmintedAssets.length} unminted assets`,
        assets: mockUnmintedAssets
      });
    } catch (error) {
      onResponse('Asset Discovery', { 
        error: 'Failed to load unminted assets',
        details: error
      });
    } finally {
      setLoading(false);
    }
  };

  // Load assets on component mount
  useEffect(() => {
    if (username) {
      loadUnmintedAssets();
    }
  }, [username]);

  // Filter assets based on current filter settings
  const filteredAssets = assets.filter(asset => {
    return (filter.domain === 'all' || asset.domain === filter.domain) &&
           (filter.assetType === 'all' || asset.asset_type === filter.assetType) &&
           (filter.sourcePlatform === 'all' || asset.source_platform === filter.sourcePlatform);
  });

  // Handle asset selection for batch operations
  const handleAssetSelection = (assetId: string, checked: boolean) => {
    const newSelected = new Set(selectedAssets);
    if (checked) {
      newSelected.add(assetId);
    } else {
      newSelected.delete(assetId);
    }
    setSelectedAssets(newSelected);
    
    // Notify parent component of selection change
    const selectedAssetObjects = assets.filter(asset => newSelected.has(asset.id));
    onAssetSelect?.(selectedAssetObjects);
    
    onResponse('Asset Selection', {
      selected_count: newSelected.size,
      selected_assets: Array.from(newSelected)
    });
  };

  // Select all filtered assets
  const selectAllAssets = () => {
    const newSelected = new Set(filteredAssets.map(asset => asset.id));
    setSelectedAssets(newSelected);
    onAssetSelect?.(filteredAssets);
    onResponse('Select All Assets', { 
      selected_count: newSelected.size,
      message: 'All visible assets selected'
    });
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedAssets(new Set());
    onAssetSelect?.([]);
    onResponse('Clear Selection', { message: 'Asset selection cleared' });
  };

  // Get unique values for filter options
  const getDomains = () => [...new Set(assets.map(asset => asset.domain))];
  const getAssetTypes = () => [...new Set(assets.map(asset => asset.asset_type))];
  const getSourcePlatforms = () => [...new Set(assets.map(asset => asset.source_platform))];

  return (
    <div className={styles['asset-browser']}>
      <div className={styles['asset-browser-header']}>
        <h3>🔍 Asset Browser - Unminted Assets</h3>
        <p>Discover and select Web2 assets ready for Web3 minting</p>
      </div>

      {/* Filter Controls */}
      <div className={styles['filter-controls']}>
        <div className={styles['filter-row']}>
          <select 
            value={filter.domain} 
            onChange={(e) => setFilter({...filter, domain: e.target.value})}
          >
            <option value="all">All Domains</option>
            {getDomains().map(domain => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </select>
          
          <select 
            value={filter.assetType} 
            onChange={(e) => setFilter({...filter, assetType: e.target.value})}
          >
            <option value="all">All Types</option>
            {getAssetTypes().map(type => (
              <option key={type} value={type}>{type.replace('_', ' ')}</option>
            ))}
          </select>
          
          <select 
            value={filter.sourcePlatform} 
            onChange={(e) => setFilter({...filter, sourcePlatform: e.target.value})}
          >
            <option value="all">All Platforms</option>
            {getSourcePlatforms().map(platform => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
          
          <button onClick={loadUnmintedAssets} disabled={loading}>
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Selection Controls */}
      {filteredAssets.length > 0 && (
        <div className={styles["selection-controls"]}>
          <div className={styles["selection-info"]}>
            Selected: {selectedAssets.size} of {filteredAssets.length} assets
          </div>
          <div className={styles["selection-buttons"]}>
            <button onClick={selectAllAssets}>Select All Visible</button>
            <button onClick={clearSelection}>Clear Selection</button>
          </div>
        </div>
      )}

      {/* Asset Grid */}
      <div className={styles["asset-grid"]}>
        {loading ? (
          <div className={styles["loading-state"]}>
            <div className={styles["loader"]}>🔄</div>
            <p>Discovering unminted assets...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className={styles["empty-state"]}>
            <p>📭 No unminted assets found</p>
            <p>Assets you own on 4IR.network and 4ID.com that haven't been minted to the blockchain will appear here.</p>
            <button onClick={loadUnmintedAssets}>🔄 Refresh</button>
          </div>
        ) : (
          filteredAssets.map(asset => (
            <div key={asset.id} className={`${styles['asset-card']} ${selectedAssets.has(asset.id) ? styles['selected'] : ''}`}>
              <div className={styles["asset-card-header"]}>
                <input
                  type="checkbox"
                  checked={selectedAssets.has(asset.id)}
                  onChange={(e) => handleAssetSelection(asset.id, e.target.checked)}
                />
                <span className={styles["asset-type-badge"]}>{asset.asset_type.replace('_', ' ')}</span>
              </div>
              
              <div className={styles["asset-image"]}>
                {asset.image_url ? (
                  <img src={asset.image_url} alt={asset.name} />
                ) : (
                  <div className={styles["placeholder-image"]}>📄</div>
                )}
              </div>
              
              <div className={styles["asset-info"]}>
                <h4>{asset.name}</h4>
                <p className={styles["asset-description"]}>{asset.description}</p>
                
                <div className={styles["asset-details"]}>
                  <div className={styles["detail-row"]}>
                    <span className={styles["label"]}>Domain:</span>
                    <span className={styles["value"]}>{asset.domain}</span>
                  </div>
                  <div className={styles["detail-row"]}>
                    <span className={styles["label"]}>Source:</span>
                    <span className={styles["value"]}>{asset.source_platform}</span>
                  </div>
                  <div className={styles["detail-row"]}>
                    <span className={styles["label"]}>Mint Cost:</span>
                    <span className={styles["value"]}>{asset.estimated_mint_cost}</span>
                  </div>
                </div>
                
                <div className={styles["web2-functionality"]}>
                  <div className={styles["functionality-label"]}>Web2 Features:</div>
                  <div className={styles["functionality-tags"]}>
                    {asset.web2_functionality.map((func, index) => (
                      <span key={index} className={styles["functionality-tag"]}>
                        {func.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Asset Browser Instructions */}
      <div className={styles["instructions"]}>
        <h4>How to Use Asset Browser:</h4>
        <ol>
          <li><strong>Discovery:</strong> Assets you own on 4IR.network and 4ID.com appear here if not yet minted</li>
          <li><strong>Filter:</strong> Use dropdown filters to find specific assets by domain, type, or source platform</li>
          <li><strong>Select:</strong> Check individual assets or use "Select All" for batch operations</li>
          <li><strong>Web2 Functionality:</strong> Assets remain functional on their original platforms after minting</li>
          <li><strong>Next Step:</strong> Use the Asset Minting interface to convert selected assets to Web3</li>
        </ol>
      </div>
    </div>
  );
};

export default AssetBrowser;
