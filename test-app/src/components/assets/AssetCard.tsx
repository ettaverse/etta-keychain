import React from 'react';
import styles from './AssetCard.module.css';

// Import types from parent AssetBrowser component
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

interface AssetCardProps {
  asset: UnmintedAsset;
  isSelected: boolean;
  onSelect: (assetId: string, selected: boolean) => void;
  onViewDetails?: (asset: UnmintedAsset) => void;
  onMintAsset?: (asset: UnmintedAsset) => void;
  showActions?: boolean;
  compact?: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, 
  isSelected, 
  onSelect, 
  onViewDetails,
  onMintAsset,
  showActions = true,
  compact = false
}) => {

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card selection when clicking on buttons
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }
    onSelect(asset.id, !isSelected);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails?.(asset);
  };

  const handleMintAsset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMintAsset?.(asset);
  };

  return (
    <div 
      className={`${styles['asset-card']} ${isSelected ? styles['selected'] : ''} ${compact ? styles['compact'] : ''}`}
      onClick={handleCardClick}
    >
      {/* Selection Checkbox */}
      <div className={styles["asset-card-header"]}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(asset.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className={styles["asset-type-badge"]}>{asset.asset_type.replace('_', ' ')}</span>
      </div>

      {/* Asset Image */}
      <div className={styles["asset-image"]}>
        {asset.image_url ? (
          <img src={asset.image_url} alt={asset.name} />
        ) : (
          <div className={styles["placeholder-image"]}>
            {asset.asset_type === 'domain' ? '🌐' : '📄'}
          </div>
        )}
      </div>

      {/* Asset Information */}
      <div className={styles["asset-info"]}>
        <h4 className={styles["asset-name"]}>{asset.name}</h4>
        {!compact && (
          <p className={styles["asset-description"]}>{asset.description}</p>
        )}

        {/* Asset Details */}
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
            <span className={`${styles["value"]} ${styles["mint-cost"]}`}>{asset.estimated_mint_cost}</span>
          </div>
        </div>

        {/* Web2 Functionality Tags */}
        {!compact && (
          <div className={styles["web2-functionality"]}>
            <div className={styles["functionality-label"]}>Web2 Features:</div>
            <div className={styles["functionality-tags"]}>
              {asset.web2_functionality.slice(0, 3).map((func, index) => (
                <span key={index} className={styles["functionality-tag"]}>
                  {func.replace('_', ' ')}
                </span>
              ))}
              {asset.web2_functionality.length > 3 && (
                <span className={`${styles["functionality-tag"]} ${styles["more"]}`}>
                  +{asset.web2_functionality.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className={styles["asset-actions"]}>
            {onViewDetails && (
              <button 
                className={`${styles["action-btn"]} ${styles["secondary"]}`} 
                onClick={handleViewDetails}
                title="View asset details"
              >
                📋 Details
              </button>
            )}
            {onMintAsset && (
              <button 
                className={`${styles["action-btn"]} ${styles["primary"]}`} 
                onClick={handleMintAsset}
                title="Mint this asset to blockchain"
              >
                ⚒️ Mint
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default AssetCard;