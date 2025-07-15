import React, { useState, useEffect } from 'react';
import styles from './PortfolioDashboard.module.css';

// Import types from existing components
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
  blockchain_data?: {
    transaction_id: string;
    block_number: number;
    timestamp: string;
  };
  economic_data?: {
    current_value?: { amount: string; currency: string };
    last_sale?: { amount: string; currency: string; timestamp: string };
  };
  game_variants?: Record<string, any>;
}

interface PortfolioData {
  user_assets: UniversalAsset[];
  total_count: number;
  minted_count: number;
  unminted_count: number;
  pending_count: number;
  domains: Record<string, UniversalAsset[]>;
  total_value: { amount: string; currency: string };
  recent_activity: {
    action: string;
    asset_name: string;
    timestamp: string;
    transaction_id?: string;
  }[];
}

interface PortfolioFilters {
  domain: string;
  minting_status: string;
  search: string;
  sort_by: 'name' | 'date' | 'value';
  sort_order: 'asc' | 'desc';
}

interface PortfolioDashboardProps {
  username: string;
  onAssetSelect: (asset: UniversalAsset) => void;
  onBatchSelect: (assets: UniversalAsset[]) => void;
  onMintAssets: (assets: UniversalAsset[]) => void;
  onTransferAsset: (asset: UniversalAsset) => void;
  onViewAssetDetails: (asset: UniversalAsset) => void;
  onRefresh: () => void;
}

const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  username,
  onAssetSelect,
  onBatchSelect,
  onMintAssets,
  onTransferAsset,
  onViewAssetDetails,
  onRefresh
}) => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<PortfolioFilters>({
    domain: 'all',
    minting_status: 'all',
    search: '',
    sort_by: 'name',
    sort_order: 'asc'
  });
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadPortfolioData();
  }, [username]);

  const loadPortfolioData = async () => {
    if (!username) return;
    
    setLoading(true);
    setError('');

    try {
      // Mock portfolio data - in real implementation, this would call the extension API
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockAssets: UniversalAsset[] = [
        {
          universal_id: 'asset_001',
          domain: 'gaming',
          current_owner: username,
          base_metadata: {
            name: 'Fire Dragon #001',
            description: 'A legendary fire-breathing dragon with immense power',
            image_url: 'https://example.com/fire-dragon.jpg',
            core_attributes: { 
              rarity: 'legendary', 
              element: 'fire', 
              power: 95, 
              health: 100 
            },
            tags: ['dragon', 'fire', 'legendary', 'combat']
          },
          properties: {
            tradeable: true,
            transferable: true,
            burnable: false,
            mintable: false
          },
          minting_status: 'minted',
          blockchain_data: {
            transaction_id: 'abc123def456',
            block_number: 50123456,
            timestamp: '2024-01-15T10:30:00Z'
          },
          economic_data: {
            current_value: { amount: '5.000', currency: 'STEEM' },
            last_sale: { amount: '4.500', currency: 'STEEM', timestamp: '2024-01-10T12:00:00Z' }
          },
          game_variants: {
            'splinterlands': { attack: 5, defense: 7, speed: 3 },
            'cryptobrewmaster': { brewing_power: 8, rarity_bonus: 2 }
          }
        },
        {
          universal_id: 'asset_002',
          domain: 'domains',
          current_owner: username,
          base_metadata: {
            name: 'example.steem',
            description: 'A premium STEEM domain name',
            core_attributes: { 
              length: 7, 
              tld: 'steem', 
              registration_date: '2024-01-01' 
            },
            tags: ['domain', 'premium', 'web3']
          },
          properties: {
            tradeable: true,
            transferable: true,
            burnable: false,
            mintable: false
          },
          minting_status: 'unminted',
          economic_data: {
            current_value: { amount: '10.000', currency: 'STEEM' }
          }
        },
        {
          universal_id: 'asset_003',
          domain: 'collectibles',
          current_owner: username,
          base_metadata: {
            name: 'Mystic Crystal Orb',
            description: 'A mystical orb containing ancient power',
            core_attributes: { 
              rarity: 'rare', 
              magic_type: 'crystal', 
              power_level: 75 
            },
            tags: ['crystal', 'magic', 'rare', 'orb']
          },
          properties: {
            tradeable: true,
            transferable: true,
            burnable: false,
            mintable: false
          },
          minting_status: 'pending',
          economic_data: {
            current_value: { amount: '2.500', currency: 'STEEM' }
          }
        },
        {
          universal_id: 'asset_004',
          domain: 'gaming',
          current_owner: username,
          base_metadata: {
            name: 'Steel Sword +5',
            description: 'A masterfully crafted steel sword',
            core_attributes: { 
              rarity: 'uncommon', 
              weapon_type: 'sword', 
              damage: 45, 
              durability: 85 
            },
            tags: ['weapon', 'sword', 'steel', 'combat']
          },
          properties: {
            tradeable: true,
            transferable: true,
            burnable: false,
            mintable: false
          },
          minting_status: 'minted',
          blockchain_data: {
            transaction_id: 'def456ghi789',
            block_number: 50123400,
            timestamp: '2024-01-12T14:20:00Z'
          },
          economic_data: {
            current_value: { amount: '1.200', currency: 'STEEM' }
          }
        }
      ];

      const mockPortfolio: PortfolioData = {
        user_assets: mockAssets,
        total_count: mockAssets.length,
        minted_count: mockAssets.filter(a => a.minting_status === 'minted').length,
        unminted_count: mockAssets.filter(a => a.minting_status === 'unminted').length,
        pending_count: mockAssets.filter(a => a.minting_status === 'pending').length,
        domains: {
          'gaming': mockAssets.filter(a => a.domain === 'gaming'),
          'domains': mockAssets.filter(a => a.domain === 'domains'),
          'collectibles': mockAssets.filter(a => a.domain === 'collectibles')
        },
        total_value: { amount: '18.700', currency: 'STEEM' },
        recent_activity: [
          { action: 'Minted', asset_name: 'Fire Dragon #001', timestamp: '2024-01-15T10:30:00Z', transaction_id: 'abc123def456' },
          { action: 'Transferred', asset_name: 'Old Sword', timestamp: '2024-01-14T16:45:00Z', transaction_id: 'ghi789jkl012' },
          { action: 'Received', asset_name: 'Mystic Crystal Orb', timestamp: '2024-01-13T09:15:00Z', transaction_id: 'jkl012mno345' }
        ]
      };

      setPortfolioData(mockPortfolio);
    } catch (err) {
      setError('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetSelection = (assetId: string) => {
    const newSelection = new Set(selectedAssets);
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId);
    } else {
      newSelection.add(assetId);
    }
    setSelectedAssets(newSelection);
  };

  const handleBatchMint = () => {
    if (!portfolioData) return;
    const unmintedAssets = portfolioData.user_assets.filter(
      asset => asset.minting_status === 'unminted' && selectedAssets.has(asset.universal_id)
    );
    if (unmintedAssets.length > 0) {
      onMintAssets(unmintedAssets);
    }
  };

  const handleBatchTransfer = () => {
    if (!portfolioData) return;
    const mintedAssets = portfolioData.user_assets.filter(
      asset => asset.minting_status === 'minted' && selectedAssets.has(asset.universal_id)
    );
    if (mintedAssets.length > 0) {
      onBatchSelect(mintedAssets);
    }
  };

  const filteredAssets = portfolioData?.user_assets.filter(asset => {
    // Domain filter
    if (filters.domain !== 'all' && asset.domain !== filters.domain) return false;
    
    // Minting status filter
    if (filters.minting_status !== 'all' && asset.minting_status !== filters.minting_status) return false;
    
    // Search filter
    if (filters.search && !asset.base_metadata.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    const order = filters.sort_order === 'asc' ? 1 : -1;
    
    switch (filters.sort_by) {
      case 'name':
        return a.base_metadata.name.localeCompare(b.base_metadata.name) * order;
      case 'date':
        const aDate = a.blockchain_data?.timestamp || '2024-01-01';
        const bDate = b.blockchain_data?.timestamp || '2024-01-01';
        return aDate.localeCompare(bDate) * order;
      case 'value':
        const aValue = parseFloat(a.economic_data?.current_value?.amount || '0');
        const bValue = parseFloat(b.economic_data?.current_value?.amount || '0');
        return (aValue - bValue) * order;
      default:
        return 0;
    }
  }) || [];

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

  const getMintingStatusColor = (status: string) => {
    const colors = {
      'minted': styles.statusMinted,
      'unminted': styles.statusUnminted,
      'pending': styles.statusPending
    };
    return colors[status as keyof typeof colors] || styles.statusUnminted;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.portfolioContainer}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.portfolioContainer}>
        <div className={styles.errorState}>
          <h3>Error Loading Portfolio</h3>
          <p>{error}</p>
          <button onClick={loadPortfolioData} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div className={styles.portfolioContainer}>
        <div className={styles.emptyState}>
          <h3>No Portfolio Data</h3>
          <p>Unable to load portfolio information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.portfolioContainer}>
      {/* Header */}
      <div className={styles.portfolioHeader}>
        <h2>📊 {username}'s Portfolio</h2>
        <button onClick={onRefresh} className={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className={styles.portfolioSummary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{portfolioData.total_count}</div>
          <div className={styles.summaryLabel}>Total Assets</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{portfolioData.minted_count}</div>
          <div className={styles.summaryLabel}>Minted</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{portfolioData.unminted_count}</div>
          <div className={styles.summaryLabel}>Unminted</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>
            {portfolioData.total_value.amount} {portfolioData.total_value.currency}
          </div>
          <div className={styles.summaryLabel}>Total Value</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className={styles.controlsSection}>
        <div className={styles.filtersRow}>
          <select
            value={filters.domain}
            onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
            className={styles.filterSelect}
          >
            <option value="all">All Domains</option>
            <option value="gaming">🎮 Gaming</option>
            <option value="domains">🌐 Domains</option>
            <option value="collectibles">💎 Collectibles</option>
          </select>

          <select
            value={filters.minting_status}
            onChange={(e) => setFilters({ ...filters, minting_status: e.target.value })}
            className={styles.filterSelect}
          >
            <option value="all">All Statuses</option>
            <option value="minted">Minted</option>
            <option value="unminted">Unminted</option>
            <option value="pending">Pending</option>
          </select>

          <input
            type="text"
            placeholder="Search assets..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.viewToggle}>
            <button
              onClick={() => setActiveView('grid')}
              className={activeView === 'grid' ? styles.viewButtonActive : styles.viewButton}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={activeView === 'list' ? styles.viewButtonActive : styles.viewButton}
            >
              ☰ List
            </button>
          </div>

          <div className={styles.sortControls}>
            <select
              value={filters.sort_by}
              onChange={(e) => setFilters({ ...filters, sort_by: e.target.value as any })}
              className={styles.sortSelect}
            >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Date</option>
              <option value="value">Sort by Value</option>
            </select>
            <button
              onClick={() => setFilters({ ...filters, sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc' })}
              className={styles.sortOrderButton}
            >
              {filters.sort_order === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Batch Actions */}
        {selectedAssets.size > 0 && (
          <div className={styles.batchActions}>
            <span className={styles.selectionInfo}>
              {selectedAssets.size} asset{selectedAssets.size > 1 ? 's' : ''} selected
            </span>
            <button onClick={handleBatchMint} className={styles.batchButton}>
              🪙 Mint Selected
            </button>
            <button onClick={handleBatchTransfer} className={styles.batchButton}>
              📤 Transfer Selected
            </button>
            <button onClick={() => setSelectedAssets(new Set())} className={styles.batchButton}>
              ✕ Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Assets Grid/List */}
      <div className={activeView === 'grid' ? styles.assetsGrid : styles.assetsList}>
        {filteredAssets.map((asset) => (
          <div
            key={asset.universal_id}
            className={selectedAssets.has(asset.universal_id) ? styles.assetCardSelected : styles.assetCard}
            onClick={() => handleAssetSelection(asset.universal_id)}
          >
            <div className={styles.assetImage}>
              {asset.base_metadata.image_url ? (
                <img src={asset.base_metadata.image_url} alt={asset.base_metadata.name} />
              ) : (
                <div className={styles.placeholderImage}>
                  {getDomainIcon(asset.domain)}
                </div>
              )}
            </div>
            
            <div className={styles.assetInfo}>
              <h4 className={styles.assetName}>{asset.base_metadata.name}</h4>
              <p className={styles.assetDescription}>{asset.base_metadata.description}</p>
              
              <div className={styles.assetMetadata}>
                <span className={styles.assetDomain}>
                  {getDomainIcon(asset.domain)} {asset.domain}
                </span>
                <span className={getMintingStatusColor(asset.minting_status)}>
                  {asset.minting_status}
                </span>
              </div>

              {asset.economic_data?.current_value && (
                <div className={styles.assetValue}>
                  {asset.economic_data.current_value.amount} {asset.economic_data.current_value.currency}
                </div>
              )}

              <div className={styles.assetActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewAssetDetails(asset);
                  }}
                  className={styles.actionButton}
                >
                  👁️ Details
                </button>
                {asset.minting_status === 'minted' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTransferAsset(asset);
                    }}
                    className={styles.actionButton}
                  >
                    📤 Transfer
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <div className={styles.emptyResults}>
          <p>No assets found matching your filters.</p>
        </div>
      )}

      {/* Recent Activity */}
      <div className={styles.recentActivity}>
        <h3>Recent Activity</h3>
        <div className={styles.activityList}>
          {portfolioData.recent_activity.map((activity, index) => (
            <div key={index} className={styles.activityItem}>
              <span className={styles.activityAction}>{activity.action}</span>
              <span className={styles.activityAsset}>{activity.asset_name}</span>
              <span className={styles.activityTime}>
                {formatTimestamp(activity.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortfolioDashboard;