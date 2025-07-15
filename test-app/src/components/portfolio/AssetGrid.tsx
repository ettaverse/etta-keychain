import React, { useState, useEffect, useRef } from 'react';
import styles from './AssetGrid.module.css';

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
  minting_status: 'unminted' | 'pending' | 'minted';
  rarity?: string;
  collection_id?: string;
  game_variants?: Record<string, any>;
  economic_data?: {
    current_value?: { amount: string; currency: string };
    last_sale?: { amount: string; currency: string; timestamp: string };
  };
  blockchain_data?: {
    transaction_id: string;
    block_number: number;
    timestamp: string;
  };
}

interface AssetGridProps {
  assets: UniversalAsset[];
  viewMode: 'grid' | 'list' | 'compact';
  selectedAssets: Set<string>;
  onAssetSelect: (assetId: string) => void;
  onAssetClick: (asset: UniversalAsset) => void;
  onAssetAction: (asset: UniversalAsset, action: 'mint' | 'transfer' | 'details' | 'trade') => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  sortBy?: 'name' | 'date' | 'value' | 'rarity';
  sortOrder?: 'asc' | 'desc';
  showBatchActions?: boolean;
  allowSelection?: boolean;
}

const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  viewMode,
  selectedAssets,
  onAssetSelect,
  onAssetClick,
  onAssetAction,
  loading = false,
  hasMore = false,
  onLoadMore,
  sortBy = 'name',
  sortOrder = 'asc',
  showBatchActions = true,
  allowSelection = true
}) => {
  const [displayedAssets, setDisplayedAssets] = useState<UniversalAsset[]>([]);
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayedAssets(assets);
  }, [assets]);

  useEffect(() => {
    if (!hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  const handleImageLoad = (assetId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [assetId]: false }));
  };

  const handleImageError = (assetId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [assetId]: false }));
  };

  const handleImageLoadStart = (assetId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [assetId]: true }));
  };

  const getDomainIcon = (domain: string) => {
    const icons: Record<string, string> = {
      'gaming': '🎮',
      'domains': '🌐',
      'collectibles': '💎',
      'music': '🎵',
      'art': '🎨'
    };
    return icons[domain] || '📄';
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      'legendary': '#f59e0b',
      'rare': '#8b5cf6',
      'uncommon': '#10b981',
      'common': '#6b7280',
      'premium': '#ef4444'
    };
    return colors[rarity] || '#6b7280';
  };

  const getMintingStatusColor = (status: string) => {
    const colors = {
      'minted': styles.statusMinted,
      'unminted': styles.statusUnminted,
      'pending': styles.statusPending
    };
    return colors[status as keyof typeof colors] || styles.statusUnminted;
  };

  const formatValue = (value: { amount: string; currency: string } | undefined) => {
    if (!value) return null;
    return `${value.amount} ${value.currency}`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAvailableActions = (asset: UniversalAsset) => {
    const actions = [];
    
    if (asset.minting_status === 'unminted') {
      actions.push({ key: 'mint', label: '🪙 Mint', primary: true });
    }
    
    if (asset.minting_status === 'minted') {
      if (asset.properties.transferable) {
        actions.push({ key: 'transfer', label: '📤 Transfer', primary: true });
      }
      if (asset.properties.tradeable) {
        actions.push({ key: 'trade', label: '💰 Trade', primary: false });
      }
    }
    
    actions.push({ key: 'details', label: '👁️ Details', primary: false });
    
    return actions;
  };

  const renderAssetImage = (asset: UniversalAsset) => {
    const isLoading = imageLoadingStates[asset.universal_id];
    
    return (
      <div className={styles.assetImageContainer}>
        {asset.base_metadata.image_url ? (
          <>
            {isLoading && (
              <div className={styles.imageLoader}>
                <div className={styles.loadingSpinner}></div>
              </div>
            )}
            <img
              src={asset.base_metadata.image_url}
              alt={asset.base_metadata.name}
              className={styles.assetImage}
              onLoad={() => handleImageLoad(asset.universal_id)}
              onError={() => handleImageError(asset.universal_id)}
              onLoadStart={() => handleImageLoadStart(asset.universal_id)}
              style={{ opacity: isLoading ? 0 : 1 }}
            />
          </>
        ) : (
          <div className={styles.placeholderImage}>
            {getDomainIcon(asset.domain)}
          </div>
        )}
        
        {/* Selection Overlay */}
        {allowSelection && selectedAssets.has(asset.universal_id) && (
          <div className={styles.selectionOverlay}>
            <div className={styles.selectionCheckmark}>✓</div>
          </div>
        )}
      </div>
    );
  };

  const renderGridView = () => (
    <div className={styles.gridView}>
      {displayedAssets.map((asset) => (
        <div
          key={asset.universal_id}
          className={`${styles.gridAssetCard} ${
            selectedAssets.has(asset.universal_id) ? styles.selected : ''
          }`}
          onClick={() => allowSelection && onAssetSelect(asset.universal_id)}
          onMouseEnter={() => setHoveredAsset(asset.universal_id)}
          onMouseLeave={() => setHoveredAsset(null)}
        >
          {renderAssetImage(asset)}
          
          <div className={styles.assetInfo}>
            <div className={styles.assetHeader}>
              <h4 className={styles.assetName}>{asset.base_metadata.name}</h4>
              <span className={getMintingStatusColor(asset.minting_status)}>
                {asset.minting_status}
              </span>
            </div>
            
            <div className={styles.assetMeta}>
              <span className={styles.assetDomain}>
                {getDomainIcon(asset.domain)} {asset.domain}
              </span>
              {asset.rarity && (
                <span 
                  className={styles.assetRarity}
                  style={{ color: getRarityColor(asset.rarity) }}
                >
                  {asset.rarity}
                </span>
              )}
            </div>
            
            <p className={styles.assetDescription}>{asset.base_metadata.description}</p>
            
            {asset.economic_data?.current_value && (
              <div className={styles.assetValue}>
                {formatValue(asset.economic_data.current_value)}
              </div>
            )}
            
            {/* Action Buttons */}
            {hoveredAsset === asset.universal_id && (
              <div className={styles.actionButtons}>
                {getAvailableActions(asset).slice(0, 2).map((action) => (
                  <button
                    key={action.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssetAction(asset, action.key as any);
                    }}
                    className={action.primary ? styles.primaryAction : styles.secondaryAction}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className={styles.listView}>
      {displayedAssets.map((asset) => (
        <div
          key={asset.universal_id}
          className={`${styles.listAssetCard} ${
            selectedAssets.has(asset.universal_id) ? styles.selected : ''
          }`}
          onClick={() => allowSelection && onAssetSelect(asset.universal_id)}
        >
          <div className={styles.listAssetImage}>
            {renderAssetImage(asset)}
          </div>
          
          <div className={styles.listAssetInfo}>
            <div className={styles.listAssetHeader}>
              <h4 className={styles.assetName}>{asset.base_metadata.name}</h4>
              <div className={styles.listAssetMeta}>
                <span className={styles.assetDomain}>
                  {getDomainIcon(asset.domain)} {asset.domain}
                </span>
                {asset.rarity && (
                  <span 
                    className={styles.assetRarity}
                    style={{ color: getRarityColor(asset.rarity) }}
                  >
                    {asset.rarity}
                  </span>
                )}
                <span className={getMintingStatusColor(asset.minting_status)}>
                  {asset.minting_status}
                </span>
              </div>
            </div>
            
            <p className={styles.listAssetDescription}>{asset.base_metadata.description}</p>
            
            <div className={styles.listAssetDetails}>
              {asset.economic_data?.current_value && (
                <div className={styles.assetValue}>
                  Value: {formatValue(asset.economic_data.current_value)}
                </div>
              )}
              
              {asset.blockchain_data?.timestamp && (
                <div className={styles.assetDate}>
                  Minted: {formatDate(asset.blockchain_data.timestamp)}
                </div>
              )}
              
              <div className={styles.assetProperties}>
                {asset.properties.tradeable && <span className={styles.property}>Tradeable</span>}
                {asset.properties.transferable && <span className={styles.property}>Transferable</span>}
              </div>
            </div>
          </div>
          
          <div className={styles.listAssetActions}>
            {getAvailableActions(asset).map((action) => (
              <button
                key={action.key}
                onClick={(e) => {
                  e.stopPropagation();
                  onAssetAction(asset, action.key as any);
                }}
                className={action.primary ? styles.primaryAction : styles.secondaryAction}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderCompactView = () => (
    <div className={styles.compactView}>
      {displayedAssets.map((asset) => (
        <div
          key={asset.universal_id}
          className={`${styles.compactAssetCard} ${
            selectedAssets.has(asset.universal_id) ? styles.selected : ''
          }`}
          onClick={() => allowSelection && onAssetSelect(asset.universal_id)}
        >
          <div className={styles.compactAssetImage}>
            {renderAssetImage(asset)}
          </div>
          
          <div className={styles.compactAssetInfo}>
            <span className={styles.compactAssetName}>{asset.base_metadata.name}</span>
            <div className={styles.compactAssetMeta}>
              <span className={styles.assetDomain}>
                {getDomainIcon(asset.domain)}
              </span>
              {asset.rarity && (
                <span 
                  className={styles.compactRarity}
                  style={{ backgroundColor: getRarityColor(asset.rarity) }}
                >
                  {asset.rarity.charAt(0).toUpperCase()}
                </span>
              )}
              <span className={getMintingStatusColor(asset.minting_status)}>
                {asset.minting_status.charAt(0).toUpperCase()}
              </span>
            </div>
            
            {asset.economic_data?.current_value && (
              <div className={styles.compactAssetValue}>
                {formatValue(asset.economic_data.current_value)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading && assets.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading assets...</p>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📭</div>
        <h3>No Assets Found</h3>
        <p>No assets match your current filters or search criteria.</p>
      </div>
    );
  }

  return (
    <div className={styles.assetGridContainer}>
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'compact' && renderCompactView()}
      
      {/* Load More */}
      {hasMore && (
        <div ref={loadMoreRef} className={styles.loadMoreContainer}>
          {loading ? (
            <div className={styles.loadingSpinner}></div>
          ) : (
            <p>Load more assets...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetGrid;