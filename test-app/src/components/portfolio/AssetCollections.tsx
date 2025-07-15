import React, { useState, useEffect } from 'react';
import styles from './AssetCollections.module.css';

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
  game_variants?: Record<string, any>;
  collection_id?: string;
  series?: string;
  rarity?: string;
  economic_data?: {
    current_value?: { amount: string; currency: string };
    last_sale?: { amount: string; currency: string; timestamp: string };
  };
}

interface Collection {
  id: string;
  name: string;
  description: string;
  domain: string;
  total_assets: number;
  owned_assets: number;
  completion_percentage: number;
  image_url?: string;
  creator: string;
  created_date: string;
  floor_price?: { amount: string; currency: string };
  total_value?: { amount: string; currency: string };
  rarity_distribution: Record<string, number>;
  assets: UniversalAsset[];
}

interface Game {
  id: string;
  name: string;
  domain: string;
  description: string;
  icon: string;
  total_assets: number;
  collections: Collection[];
  asset_types: string[];
  supported_features: string[];
}

interface AssetCollectionsProps {
  username: string;
  onAssetSelect: (asset: UniversalAsset) => void;
  onCollectionSelect: (collection: Collection) => void;
  onGameSelect: (game: Game) => void;
  onViewAssetDetails: (asset: UniversalAsset) => void;
  onRefresh: () => void;
}

const AssetCollections: React.FC<AssetCollectionsProps> = ({
  username,
  onAssetSelect,
  onCollectionSelect,
  onGameSelect,
  onViewAssetDetails,
  onRefresh
}) => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'games' | 'collections' | 'assets'>('games');

  useEffect(() => {
    loadCollectionsData();
  }, [username]);

  const loadCollectionsData = async () => {
    if (!username) return;
    
    setLoading(true);
    setError('');

    try {
      // Mock collections data - in real implementation, this would call the extension API
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockGames: Game[] = [
        {
          id: 'splinterlands',
          name: 'Splinterlands',
          domain: 'gaming',
          description: 'Digital trading card game on blockchain',
          icon: '🃏',
          total_assets: 500,
          asset_types: ['cards', 'summoners', 'items'],
          supported_features: ['battling', 'trading', 'staking'],
          collections: [
            {
              id: 'chaos_legion',
              name: 'Chaos Legion',
              description: 'Latest edition of Splinterlands cards',
              domain: 'gaming',
              total_assets: 200,
              owned_assets: 15,
              completion_percentage: 7.5,
              image_url: 'https://example.com/chaos-legion.jpg',
              creator: 'splinterlands',
              created_date: '2024-01-01',
              floor_price: { amount: '0.050', currency: 'STEEM' },
              total_value: { amount: '12.500', currency: 'STEEM' },
              rarity_distribution: {
                'legendary': 2,
                'rare': 4,
                'uncommon': 6,
                'common': 3
              },
              assets: [
                {
                  universal_id: 'card_001',
                  domain: 'gaming',
                  current_owner: username,
                  base_metadata: {
                    name: 'Fire Dragon',
                    description: 'A powerful fire-breathing dragon',
                    image_url: 'https://example.com/fire-dragon.jpg',
                    core_attributes: { attack: 5, defense: 7, speed: 3, mana: 8 },
                    tags: ['dragon', 'fire', 'legendary']
                  },
                  properties: {
                    tradeable: true,
                    transferable: true,
                    burnable: false,
                    mintable: false
                  },
                  minting_status: 'minted',
                  collection_id: 'chaos_legion',
                  series: 'Edition 1',
                  rarity: 'legendary',
                  economic_data: {
                    current_value: { amount: '5.000', currency: 'STEEM' }
                  },
                  game_variants: {
                    'splinterlands': { attack: 5, defense: 7, speed: 3, mana: 8 }
                  }
                }
              ]
            },
            {
              id: 'dice_edition',
              name: 'Dice Edition',
              description: 'Classic Splinterlands cards',
              domain: 'gaming',
              total_assets: 150,
              owned_assets: 8,
              completion_percentage: 5.3,
              creator: 'splinterlands',
              created_date: '2023-06-01',
              floor_price: { amount: '0.025', currency: 'STEEM' },
              total_value: { amount: '3.200', currency: 'STEEM' },
              rarity_distribution: {
                'legendary': 1,
                'rare': 2,
                'uncommon': 3,
                'common': 2
              },
              assets: []
            }
          ]
        },
        {
          id: 'cryptobrewmaster',
          name: 'CryptoBrewMaster',
          domain: 'gaming',
          description: 'Brewing simulation game with NFT ingredients',
          icon: '🍺',
          total_assets: 300,
          asset_types: ['ingredients', 'recipes', 'equipment'],
          supported_features: ['brewing', 'trading', 'competitions'],
          collections: [
            {
              id: 'premium_hops',
              name: 'Premium Hops Collection',
              description: 'Rare brewing ingredients',
              domain: 'gaming',
              total_assets: 50,
              owned_assets: 3,
              completion_percentage: 6.0,
              creator: 'cryptobrewmaster',
              created_date: '2023-12-01',
              floor_price: { amount: '0.100', currency: 'STEEM' },
              total_value: { amount: '1.800', currency: 'STEEM' },
              rarity_distribution: {
                'legendary': 1,
                'rare': 1,
                'uncommon': 1
              },
              assets: []
            }
          ]
        },
        {
          id: 'domain_marketplace',
          name: 'Domain Marketplace',
          domain: 'domains',
          description: 'Premium domain names and Web3 identities',
          icon: '🌐',
          total_assets: 1000,
          asset_types: ['domains', 'subdomains', 'aliases'],
          supported_features: ['resolution', 'trading', 'customization'],
          collections: [
            {
              id: 'premium_domains',
              name: 'Premium Domains',
              description: 'High-value domain names',
              domain: 'domains',
              total_assets: 100,
              owned_assets: 2,
              completion_percentage: 2.0,
              creator: 'domain_registry',
              created_date: '2023-01-01',
              floor_price: { amount: '1.000', currency: 'STEEM' },
              total_value: { amount: '8.000', currency: 'STEEM' },
              rarity_distribution: {
                'premium': 1,
                'standard': 1
              },
              assets: []
            }
          ]
        }
      ];

      setGames(mockGames);
    } catch (err) {
      setError('Failed to load collections data');
    } finally {
      setLoading(false);
    }
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setSelectedCollection(null);
    setViewMode('collections');
    onGameSelect(game);
  };

  const handleCollectionSelect = (collection: Collection) => {
    setSelectedCollection(collection);
    setViewMode('assets');
    onCollectionSelect(collection);
  };

  const handleBackToGames = () => {
    setSelectedGame(null);
    setSelectedCollection(null);
    setViewMode('games');
  };

  const handleBackToCollections = () => {
    setSelectedCollection(null);
    setViewMode('collections');
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

  if (loading) {
    return (
      <div className={styles.collectionsContainer}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading collections data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.collectionsContainer}>
        <div className={styles.errorState}>
          <h3>Error Loading Collections</h3>
          <p>{error}</p>
          <button onClick={loadCollectionsData} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.collectionsContainer}>
      {/* Header */}
      <div className={styles.collectionsHeader}>
        <div className={styles.headerInfo}>
          <h2>🎯 Asset Collections</h2>
          <div className={styles.breadcrumb}>
            {viewMode === 'games' && <span>Games</span>}
            {viewMode === 'collections' && (
              <>
                <button onClick={handleBackToGames} className={styles.breadcrumbLink}>Games</button>
                <span> / {selectedGame?.name}</span>
              </>
            )}
            {viewMode === 'assets' && (
              <>
                <button onClick={handleBackToGames} className={styles.breadcrumbLink}>Games</button>
                <span> / </span>
                <button onClick={handleBackToCollections} className={styles.breadcrumbLink}>
                  {selectedGame?.name}
                </button>
                <span> / {selectedCollection?.name}</span>
              </>
            )}
          </div>
        </div>
        <button onClick={onRefresh} className={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>

      {/* Games View */}
      {viewMode === 'games' && (
        <div className={styles.gamesGrid}>
          {games.map((game) => (
            <div key={game.id} className={styles.gameCard} onClick={() => handleGameSelect(game)}>
              <div className={styles.gameHeader}>
                <div className={styles.gameIcon}>{game.icon}</div>
                <div className={styles.gameInfo}>
                  <h3 className={styles.gameName}>{game.name}</h3>
                  <p className={styles.gameDescription}>{game.description}</p>
                </div>
              </div>
              
              <div className={styles.gameStats}>
                <div className={styles.gameStat}>
                  <span className={styles.statValue}>{game.collections.length}</span>
                  <span className={styles.statLabel}>Collections</span>
                </div>
                <div className={styles.gameStat}>
                  <span className={styles.statValue}>
                    {game.collections.reduce((sum, col) => sum + col.owned_assets, 0)}
                  </span>
                  <span className={styles.statLabel}>Owned Assets</span>
                </div>
                <div className={styles.gameStat}>
                  <span className={styles.statValue}>
                    {game.collections.reduce((sum, col) => sum + parseFloat(col.total_value?.amount || '0'), 0).toFixed(2)} STEEM
                  </span>
                  <span className={styles.statLabel}>Total Value</span>
                </div>
              </div>

              <div className={styles.gameFeatures}>
                <div className={styles.gameFeaturesList}>
                  {game.asset_types.map((type) => (
                    <span key={type} className={styles.featureTag}>{type}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collections View */}
      {viewMode === 'collections' && selectedGame && (
        <div className={styles.collectionsGrid}>
          {selectedGame.collections.map((collection) => (
            <div key={collection.id} className={styles.collectionCard} onClick={() => handleCollectionSelect(collection)}>
              <div className={styles.collectionImage}>
                {collection.image_url ? (
                  <img src={collection.image_url} alt={collection.name} />
                ) : (
                  <div className={styles.placeholderImage}>
                    {getDomainIcon(collection.domain)}
                  </div>
                )}
              </div>
              
              <div className={styles.collectionInfo}>
                <h3 className={styles.collectionName}>{collection.name}</h3>
                <p className={styles.collectionDescription}>{collection.description}</p>
                
                <div className={styles.collectionStats}>
                  <div className={styles.collectionStat}>
                    <span className={styles.statLabel}>Owned:</span>
                    <span className={styles.statValue}>{collection.owned_assets}/{collection.total_assets}</span>
                  </div>
                  <div className={styles.collectionStat}>
                    <span className={styles.statLabel}>Complete:</span>
                    <span className={styles.statValue}>{collection.completion_percentage}%</span>
                  </div>
                  {collection.floor_price && (
                    <div className={styles.collectionStat}>
                      <span className={styles.statLabel}>Floor:</span>
                      <span className={styles.statValue}>
                        {collection.floor_price.amount} {collection.floor_price.currency}
                      </span>
                    </div>
                  )}
                  {collection.total_value && (
                    <div className={styles.collectionStat}>
                      <span className={styles.statLabel}>Value:</span>
                      <span className={styles.statValue}>
                        {collection.total_value.amount} {collection.total_value.currency}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.rarityDistribution}>
                  <div className={styles.rarityLabel}>Rarity Distribution:</div>
                  <div className={styles.rarityTags}>
                    {Object.entries(collection.rarity_distribution).map(([rarity, count]) => (
                      <span 
                        key={rarity} 
                        className={styles.rarityTag}
                        style={{ backgroundColor: getRarityColor(rarity) }}
                      >
                        {rarity}: {count}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.completionBar}>
                  <div 
                    className={styles.completionFill}
                    style={{ width: `${collection.completion_percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assets View */}
      {viewMode === 'assets' && selectedCollection && (
        <div className={styles.assetsSection}>
          <div className={styles.collectionHeader}>
            <h3>{selectedCollection.name}</h3>
            <div className={styles.collectionMeta}>
              <span>
                {selectedCollection.owned_assets} of {selectedCollection.total_assets} owned 
                ({selectedCollection.completion_percentage}% complete)
              </span>
              {selectedCollection.total_value && (
                <span className={styles.collectionValue}>
                  Total Value: {selectedCollection.total_value.amount} {selectedCollection.total_value.currency}
                </span>
              )}
            </div>
          </div>

          <div className={styles.assetsGrid}>
            {selectedCollection.assets.length > 0 ? (
              selectedCollection.assets.map((asset) => (
                <div key={asset.universal_id} className={styles.assetCard}>
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
                      <span className={styles.assetRarity} style={{ color: getRarityColor(asset.rarity || 'common') }}>
                        {asset.rarity || 'common'}
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

                    {asset.game_variants && (
                      <div className={styles.gameVariants}>
                        {Object.entries(asset.game_variants).map(([game, variant]) => (
                          <div key={game} className={styles.variantInfo}>
                            <span className={styles.variantGame}>{game}:</span>
                            <span className={styles.variantStats}>
                              {Object.entries(variant as Record<string, any>).map(([key, value]) => (
                                <span key={key} className={styles.variantStat}>
                                  {key}: {value}
                                </span>
                              ))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.assetActions}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssetSelect(asset);
                        }}
                        className={styles.actionButton}
                      >
                        Select
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewAssetDetails(asset);
                        }}
                        className={styles.actionButton}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyAssets}>
                <p>No assets found in this collection.</p>
                <p>This collection may contain assets you don't own yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetCollections;