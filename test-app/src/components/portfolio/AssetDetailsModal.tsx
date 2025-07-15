import React, { useState, useEffect } from 'react';
import styles from './AssetDetailsModal.module.css';

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
  series?: string;
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
  history?: Array<{
    action: string;
    timestamp: string;
    from_user?: string;
    to_user?: string;
    transaction_id?: string;
    amount?: { value: string; currency: string };
  }>;
}

interface AssetDetailsModalProps {
  asset: UniversalAsset;
  isOpen: boolean;
  onClose: () => void;
  onAssetAction: (asset: UniversalAsset, action: 'mint' | 'transfer' | 'trade' | 'burn') => void;
  username: string;
}

const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({
  asset,
  isOpen,
  onClose,
  onAssetAction,
  username
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'variants' | 'history' | 'economics'>('details');
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImageLoading(true);
      setImageError(false);
      setActiveTab('details');
    }
  }, [isOpen, asset]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTransactionId = (txId: string) => {
    if (txId.length <= 16) return txId;
    return `${txId.slice(0, 8)}...${txId.slice(-8)}`;
  };

  const getAvailableActions = () => {
    const actions = [];
    
    if (asset.minting_status === 'unminted') {
      actions.push({ key: 'mint', label: '🪙 Mint Asset', color: '#3b82f6' });
    }
    
    if (asset.minting_status === 'minted') {
      if (asset.properties.transferable) {
        actions.push({ key: 'transfer', label: '📤 Transfer', color: '#8b5cf6' });
      }
      if (asset.properties.tradeable) {
        actions.push({ key: 'trade', label: '💰 Trade', color: '#10b981' });
      }
      if (asset.properties.burnable) {
        actions.push({ key: 'burn', label: '🔥 Burn', color: '#ef4444' });
      }
    }
    
    return actions;
  };

  const renderDetailsTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.detailsSection}>
        <h4>Basic Information</h4>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Asset ID:</span>
            <span className={styles.detailValue}>{asset.universal_id}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Domain:</span>
            <span className={styles.detailValue}>
              {getDomainIcon(asset.domain)} {asset.domain}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Owner:</span>
            <span className={styles.detailValue}>{asset.current_owner}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Status:</span>
            <span className={getMintingStatusColor(asset.minting_status)}>
              {asset.minting_status}
            </span>
          </div>
          {asset.rarity && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Rarity:</span>
              <span 
                className={styles.rarityBadge}
                style={{ backgroundColor: getRarityColor(asset.rarity) }}
              >
                {asset.rarity}
              </span>
            </div>
          )}
          {asset.collection_id && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Collection:</span>
              <span className={styles.detailValue}>{asset.collection_id}</span>
            </div>
          )}
          {asset.series && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Series:</span>
              <span className={styles.detailValue}>{asset.series}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.detailsSection}>
        <h4>Properties</h4>
        <div className={styles.propertiesGrid}>
          <div className={`${styles.propertyItem} ${asset.properties.tradeable ? styles.enabled : styles.disabled}`}>
            <span className={styles.propertyIcon}>💰</span>
            <span className={styles.propertyLabel}>Tradeable</span>
          </div>
          <div className={`${styles.propertyItem} ${asset.properties.transferable ? styles.enabled : styles.disabled}`}>
            <span className={styles.propertyIcon}>📤</span>
            <span className={styles.propertyLabel}>Transferable</span>
          </div>
          <div className={`${styles.propertyItem} ${asset.properties.burnable ? styles.enabled : styles.disabled}`}>
            <span className={styles.propertyIcon}>🔥</span>
            <span className={styles.propertyLabel}>Burnable</span>
          </div>
          <div className={`${styles.propertyItem} ${asset.properties.mintable ? styles.enabled : styles.disabled}`}>
            <span className={styles.propertyIcon}>🪙</span>
            <span className={styles.propertyLabel}>Mintable</span>
          </div>
        </div>
      </div>

      <div className={styles.detailsSection}>
        <h4>Attributes</h4>
        <div className={styles.attributesGrid}>
          {Object.entries(asset.base_metadata.core_attributes).map(([key, value]) => (
            <div key={key} className={styles.attributeItem}>
              <span className={styles.attributeKey}>{key}</span>
              <span className={styles.attributeValue}>{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.detailsSection}>
        <h4>Tags</h4>
        <div className={styles.tagsList}>
          {asset.base_metadata.tags.map((tag, index) => (
            <span key={index} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {asset.blockchain_data && (
        <div className={styles.detailsSection}>
          <h4>Blockchain Data</h4>
          <div className={styles.blockchainGrid}>
            <div className={styles.blockchainItem}>
              <span className={styles.blockchainLabel}>Transaction ID:</span>
              <span className={styles.blockchainValue}>
                {formatTransactionId(asset.blockchain_data.transaction_id)}
              </span>
            </div>
            <div className={styles.blockchainItem}>
              <span className={styles.blockchainLabel}>Block Number:</span>
              <span className={styles.blockchainValue}>{asset.blockchain_data.block_number}</span>
            </div>
            <div className={styles.blockchainItem}>
              <span className={styles.blockchainLabel}>Timestamp:</span>
              <span className={styles.blockchainValue}>
                {formatTimestamp(asset.blockchain_data.timestamp)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderVariantsTab = () => (
    <div className={styles.tabContent}>
      {asset.game_variants && Object.keys(asset.game_variants).length > 0 ? (
        <div className={styles.variantsSection}>
          <h4>Game Variants</h4>
          <div className={styles.variantsList}>
            {Object.entries(asset.game_variants).map(([gameId, variant]) => (
              <div key={gameId} className={styles.variantCard}>
                <div className={styles.variantHeader}>
                  <h5>{gameId}</h5>
                </div>
                <div className={styles.variantDetails}>
                  {Object.entries(variant as Record<string, any>).map(([key, value]) => (
                    <div key={key} className={styles.variantStat}>
                      <span className={styles.variantStatKey}>{key}:</span>
                      <span className={styles.variantStatValue}>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No game variants available for this asset.</p>
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className={styles.tabContent}>
      {asset.history && asset.history.length > 0 ? (
        <div className={styles.historySection}>
          <h4>Asset History</h4>
          <div className={styles.historyList}>
            {asset.history.map((event, index) => (
              <div key={index} className={styles.historyItem}>
                <div className={styles.historyIcon}>
                  {event.action === 'minted' && '🪙'}
                  {event.action === 'transferred' && '📤'}
                  {event.action === 'received' && '📥'}
                  {event.action === 'traded' && '💰'}
                  {event.action === 'burned' && '🔥'}
                </div>
                <div className={styles.historyDetails}>
                  <div className={styles.historyAction}>{event.action}</div>
                  <div className={styles.historyMeta}>
                    <span className={styles.historyTime}>
                      {formatTimestamp(event.timestamp)}
                    </span>
                    {event.from_user && (
                      <span className={styles.historyUser}>
                        From: {event.from_user}
                      </span>
                    )}
                    {event.to_user && (
                      <span className={styles.historyUser}>
                        To: {event.to_user}
                      </span>
                    )}
                  </div>
                  {event.amount && (
                    <div className={styles.historyAmount}>
                      Amount: {event.amount.value} {event.amount.currency}
                    </div>
                  )}
                  {event.transaction_id && (
                    <div className={styles.historyTransaction}>
                      TX: {formatTransactionId(event.transaction_id)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No transaction history available for this asset.</p>
        </div>
      )}
    </div>
  );

  const renderEconomicsTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.economicsSection}>
        <h4>Economic Data</h4>
        
        {asset.economic_data?.current_value && (
          <div className={styles.economicCard}>
            <div className={styles.economicLabel}>Current Value</div>
            <div className={styles.economicValue}>
              {asset.economic_data.current_value.amount} {asset.economic_data.current_value.currency}
            </div>
          </div>
        )}
        
        {asset.economic_data?.last_sale && (
          <div className={styles.economicCard}>
            <div className={styles.economicLabel}>Last Sale</div>
            <div className={styles.economicValue}>
              {asset.economic_data.last_sale.amount} {asset.economic_data.last_sale.currency}
            </div>
            <div className={styles.economicDate}>
              {formatTimestamp(asset.economic_data.last_sale.timestamp)}
            </div>
          </div>
        )}
        
        {!asset.economic_data?.current_value && !asset.economic_data?.last_sale && (
          <div className={styles.emptyState}>
            <p>No economic data available for this asset.</p>
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerInfo}>
            <h2>{asset.base_metadata.name}</h2>
            <p>{asset.base_metadata.description}</p>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Main Content */}
        <div className={styles.modalBody}>
          {/* Image Section */}
          <div className={styles.imageSection}>
            <div className={styles.assetImageContainer}>
              {asset.base_metadata.image_url && !imageError ? (
                <>
                  {imageLoading && (
                    <div className={styles.imageLoader}>
                      <div className={styles.loadingSpinner}></div>
                    </div>
                  )}
                  <img
                    src={asset.base_metadata.image_url}
                    alt={asset.base_metadata.name}
                    className={styles.assetImage}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                    style={{ opacity: imageLoading ? 0 : 1 }}
                  />
                </>
              ) : (
                <div className={styles.placeholderImage}>
                  {getDomainIcon(asset.domain)}
                </div>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className={styles.contentSection}>
            {/* Tabs */}
            <div className={styles.tabNavigation}>
              <button
                onClick={() => setActiveTab('details')}
                className={activeTab === 'details' ? styles.tabActive : styles.tab}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('variants')}
                className={activeTab === 'variants' ? styles.tabActive : styles.tab}
              >
                Variants
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={activeTab === 'history' ? styles.tabActive : styles.tab}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab('economics')}
                className={activeTab === 'economics' ? styles.tabActive : styles.tab}
              >
                Economics
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'variants' && renderVariantsTab()}
            {activeTab === 'history' && renderHistoryTab()}
            {activeTab === 'economics' && renderEconomicsTab()}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.modalActions}>
          <div className={styles.actionButtons}>
            {getAvailableActions().map((action) => (
              <button
                key={action.key}
                onClick={() => onAssetAction(asset, action.key as any)}
                className={styles.actionButton}
                style={{ backgroundColor: action.color }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailsModal;