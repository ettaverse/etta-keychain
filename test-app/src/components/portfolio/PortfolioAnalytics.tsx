import React, { useState, useEffect } from 'react';
import styles from './PortfolioAnalytics.module.css';

interface AnalyticsData {
  portfolio_value: {
    current: { amount: string; currency: string };
    change_24h: { amount: string; percentage: string };
    change_7d: { amount: string; percentage: string };
    change_30d: { amount: string; percentage: string };
  };
  asset_distribution: {
    by_domain: Record<string, { count: number; value: { amount: string; currency: string } }>;
    by_rarity: Record<string, { count: number; value: { amount: string; currency: string } }>;
    by_status: Record<string, { count: number; value: { amount: string; currency: string } }>;
  };
  activity_stats: {
    total_transactions: number;
    minting_activity: { count: number; total_cost: { amount: string; currency: string } };
    transfer_activity: { sent: number; received: number };
    trading_volume: { amount: string; currency: string };
  };
  top_assets: {
    by_value: Array<{
      name: string;
      value: { amount: string; currency: string };
      domain: string;
      rarity: string;
    }>;
    by_popularity: Array<{
      name: string;
      interaction_count: number;
      domain: string;
      last_activity: string;
    }>;
  };
  performance_metrics: {
    roi: { percentage: string; period: string };
    best_performing_asset: { name: string; gain: { amount: string; percentage: string } };
    worst_performing_asset: { name: string; loss: { amount: string; percentage: string } };
  };
  time_series_data: Array<{
    date: string;
    total_value: number;
    asset_count: number;
    transaction_count: number;
  }>;
}

interface PortfolioAnalyticsProps {
  username: string;
  onAssetClick: (assetName: string) => void;
  onRefresh: () => void;
}

const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({
  username,
  onAssetClick,
  onRefresh
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'distribution' | 'performance' | 'activity'>('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [username]);

  const loadAnalyticsData = async () => {
    if (!username) return;
    
    setLoading(true);
    setError('');

    try {
      // Mock analytics data - in real implementation, this would call the extension API
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockAnalytics: AnalyticsData = {
        portfolio_value: {
          current: { amount: '18.750', currency: 'STEEM' },
          change_24h: { amount: '+0.500', percentage: '+2.74%' },
          change_7d: { amount: '+1.250', percentage: '+7.14%' },
          change_30d: { amount: '+3.750', percentage: '+25.00%' }
        },
        asset_distribution: {
          by_domain: {
            'gaming': { count: 7, value: { amount: '12.500', currency: 'STEEM' } },
            'domains': { count: 3, value: { amount: '4.000', currency: 'STEEM' } },
            'collectibles': { count: 2, value: { amount: '2.250', currency: 'STEEM' } }
          },
          by_rarity: {
            'legendary': { count: 2, value: { amount: '9.000', currency: 'STEEM' } },
            'rare': { count: 3, value: { amount: '6.500', currency: 'STEEM' } },
            'uncommon': { count: 4, value: { amount: '2.750', currency: 'STEEM' } },
            'common': { count: 3, value: { amount: '0.500', currency: 'STEEM' } }
          },
          by_status: {
            'minted': { count: 8, value: { amount: '15.250', currency: 'STEEM' } },
            'unminted': { count: 3, value: { amount: '3.000', currency: 'STEEM' } },
            'pending': { count: 1, value: { amount: '0.500', currency: 'STEEM' } }
          }
        },
        activity_stats: {
          total_transactions: 15,
          minting_activity: { count: 8, total_cost: { amount: '0.008', currency: 'STEEM' } },
          transfer_activity: { sent: 3, received: 4 },
          trading_volume: { amount: '5.500', currency: 'STEEM' }
        },
        top_assets: {
          by_value: [
            { name: 'Fire Dragon #001', value: { amount: '5.000', currency: 'STEEM' }, domain: 'gaming', rarity: 'legendary' },
            { name: 'example.steem', value: { amount: '4.000', currency: 'STEEM' }, domain: 'domains', rarity: 'rare' },
            { name: 'Mystic Crystal Orb', value: { amount: '2.500', currency: 'STEEM' }, domain: 'collectibles', rarity: 'rare' },
            { name: 'Steel Sword +5', value: { amount: '1.200', currency: 'STEEM' }, domain: 'gaming', rarity: 'uncommon' },
            { name: 'Magic Scroll', value: { amount: '0.800', currency: 'STEEM' }, domain: 'gaming', rarity: 'uncommon' }
          ],
          by_popularity: [
            { name: 'Fire Dragon #001', interaction_count: 12, domain: 'gaming', last_activity: '2024-01-15T10:30:00Z' },
            { name: 'example.steem', interaction_count: 8, domain: 'domains', last_activity: '2024-01-14T15:45:00Z' },
            { name: 'Steel Sword +5', interaction_count: 6, domain: 'gaming', last_activity: '2024-01-12T14:20:00Z' },
            { name: 'Mystic Crystal Orb', interaction_count: 5, domain: 'collectibles', last_activity: '2024-01-13T09:15:00Z' }
          ]
        },
        performance_metrics: {
          roi: { percentage: '+33.33%', period: '30 days' },
          best_performing_asset: { name: 'Fire Dragon #001', gain: { amount: '+1.500', percentage: '+42.86%' } },
          worst_performing_asset: { name: 'Old Sword', loss: { amount: '-0.200', percentage: '-20.00%' } }
        },
        time_series_data: [
          { date: '2024-01-01', total_value: 15.0, asset_count: 10, transaction_count: 1 },
          { date: '2024-01-08', total_value: 16.2, asset_count: 11, transaction_count: 3 },
          { date: '2024-01-15', total_value: 18.75, asset_count: 12, transaction_count: 5 }
        ]
      };

      setAnalyticsData(mockAnalytics);
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
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
      'common': '#6b7280'
    };
    return colors[rarity] || '#6b7280';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeColor = (change: string) => {
    return change.startsWith('+') ? styles.positive : styles.negative;
  };

  if (loading) {
    return (
      <div className={styles.analyticsContainer}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.analyticsContainer}>
        <div className={styles.errorState}>
          <h3>Error Loading Analytics</h3>
          <p>{error}</p>
          <button onClick={loadAnalyticsData} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className={styles.analyticsContainer}>
        <div className={styles.emptyState}>
          <h3>No Analytics Data</h3>
          <p>Unable to load analytics information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.analyticsContainer}>
      {/* Header */}
      <div className={styles.analyticsHeader}>
        <h2>📊 Portfolio Analytics</h2>
        <button onClick={onRefresh} className={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>

      {/* Portfolio Value Overview */}
      <div className={styles.valueOverview}>
        <div className={styles.currentValue}>
          <h3>{analyticsData.portfolio_value.current.amount} {analyticsData.portfolio_value.current.currency}</h3>
          <span className={styles.valueLabel}>Total Portfolio Value</span>
        </div>
        <div className={styles.valueChanges}>
          <div className={styles.changeItem}>
            <span className={styles.changeLabel}>24h</span>
            <span className={getChangeColor(analyticsData.portfolio_value.change_24h.amount)}>
              {analyticsData.portfolio_value.change_24h.amount} ({analyticsData.portfolio_value.change_24h.percentage})
            </span>
          </div>
          <div className={styles.changeItem}>
            <span className={styles.changeLabel}>7d</span>
            <span className={getChangeColor(analyticsData.portfolio_value.change_7d.amount)}>
              {analyticsData.portfolio_value.change_7d.amount} ({analyticsData.portfolio_value.change_7d.percentage})
            </span>
          </div>
          <div className={styles.changeItem}>
            <span className={styles.changeLabel}>30d</span>
            <span className={getChangeColor(analyticsData.portfolio_value.change_30d.amount)}>
              {analyticsData.portfolio_value.change_30d.amount} ({analyticsData.portfolio_value.change_30d.percentage})
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabNavigation}>
        <button
          onClick={() => setActiveTab('overview')}
          className={activeTab === 'overview' ? styles.tabActive : styles.tab}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('distribution')}
          className={activeTab === 'distribution' ? styles.tabActive : styles.tab}
        >
          Distribution
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={activeTab === 'performance' ? styles.tabActive : styles.tab}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={activeTab === 'activity' ? styles.tabActive : styles.tab}
        >
          Activity
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewContent}>
            {/* Top Assets */}
            <div className={styles.topAssetsSection}>
              <h3>Top Assets by Value</h3>
              <div className={styles.assetsList}>
                {analyticsData.top_assets.by_value.map((asset, index) => (
                  <div key={index} className={styles.assetItem}>
                    <div className={styles.assetRank}>#{index + 1}</div>
                    <div className={styles.assetInfo}>
                      <button
                        onClick={() => onAssetClick(asset.name)}
                        className={styles.assetName}
                      >
                        {asset.name}
                      </button>
                      <div className={styles.assetMeta}>
                        <span className={styles.assetDomain}>
                          {getDomainIcon(asset.domain)} {asset.domain}
                        </span>
                        <span 
                          className={styles.assetRarity}
                          style={{ color: getRarityColor(asset.rarity) }}
                        >
                          {asset.rarity}
                        </span>
                      </div>
                    </div>
                    <div className={styles.assetValue}>
                      {asset.value.amount} {asset.value.currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Summary */}
            <div className={styles.performanceSection}>
              <h3>Performance Summary</h3>
              <div className={styles.performanceCards}>
                <div className={styles.performanceCard}>
                  <div className={styles.performanceLabel}>Portfolio ROI</div>
                  <div className={styles.performanceValue}>
                    {analyticsData.performance_metrics.roi.percentage}
                  </div>
                  <div className={styles.performancePeriod}>
                    {analyticsData.performance_metrics.roi.period}
                  </div>
                </div>
                <div className={styles.performanceCard}>
                  <div className={styles.performanceLabel}>Best Performer</div>
                  <div className={styles.performanceAsset}>
                    {analyticsData.performance_metrics.best_performing_asset.name}
                  </div>
                  <div className={styles.performanceGain}>
                    {analyticsData.performance_metrics.best_performing_asset.gain.amount} 
                    ({analyticsData.performance_metrics.best_performing_asset.gain.percentage})
                  </div>
                </div>
                <div className={styles.performanceCard}>
                  <div className={styles.performanceLabel}>Trading Volume</div>
                  <div className={styles.performanceValue}>
                    {analyticsData.activity_stats.trading_volume.amount} {analyticsData.activity_stats.trading_volume.currency}
                  </div>
                  <div className={styles.performancePeriod}>Last 30 days</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className={styles.distributionContent}>
            {/* Domain Distribution */}
            <div className={styles.distributionSection}>
              <h3>Assets by Domain</h3>
              <div className={styles.distributionGrid}>
                {Object.entries(analyticsData.asset_distribution.by_domain).map(([domain, data]) => (
                  <div key={domain} className={styles.distributionCard}>
                    <div className={styles.distributionIcon}>
                      {getDomainIcon(domain)}
                    </div>
                    <div className={styles.distributionInfo}>
                      <div className={styles.distributionLabel}>{domain}</div>
                      <div className={styles.distributionCount}>{data.count} assets</div>
                      <div className={styles.distributionValue}>
                        {data.value.amount} {data.value.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rarity Distribution */}
            <div className={styles.distributionSection}>
              <h3>Assets by Rarity</h3>
              <div className={styles.rarityDistribution}>
                {Object.entries(analyticsData.asset_distribution.by_rarity).map(([rarity, data]) => (
                  <div key={rarity} className={styles.rarityItem}>
                    <div className={styles.rarityBar}>
                      <div 
                        className={styles.rarityFill}
                        style={{ 
                          width: `${(data.count / 12) * 100}%`,
                          backgroundColor: getRarityColor(rarity)
                        }}
                      ></div>
                    </div>
                    <div className={styles.rarityInfo}>
                      <span className={styles.rarityLabel} style={{ color: getRarityColor(rarity) }}>
                        {rarity}
                      </span>
                      <span className={styles.rarityCount}>{data.count} assets</span>
                      <span className={styles.rarityValue}>
                        {data.value.amount} {data.value.currency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Distribution */}
            <div className={styles.distributionSection}>
              <h3>Assets by Status</h3>
              <div className={styles.statusDistribution}>
                {Object.entries(analyticsData.asset_distribution.by_status).map(([status, data]) => (
                  <div key={status} className={styles.statusItem}>
                    <div className={styles.statusIndicator}>
                      {status === 'minted' && '✅'}
                      {status === 'unminted' && '🪙'}
                      {status === 'pending' && '⏳'}
                    </div>
                    <div className={styles.statusInfo}>
                      <div className={styles.statusLabel}>{status}</div>
                      <div className={styles.statusCount}>{data.count} assets</div>
                      <div className={styles.statusValue}>
                        {data.value.amount} {data.value.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className={styles.performanceContent}>
            {/* Performance Metrics */}
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>📈</div>
                <div className={styles.metricValue}>
                  {analyticsData.performance_metrics.roi.percentage}
                </div>
                <div className={styles.metricLabel}>Portfolio ROI</div>
                <div className={styles.metricPeriod}>
                  {analyticsData.performance_metrics.roi.period}
                </div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>🏆</div>
                <div className={styles.metricAsset}>
                  {analyticsData.performance_metrics.best_performing_asset.name}
                </div>
                <div className={styles.metricLabel}>Best Performer</div>
                <div className={styles.metricGain}>
                  {analyticsData.performance_metrics.best_performing_asset.gain.amount} 
                  ({analyticsData.performance_metrics.best_performing_asset.gain.percentage})
                </div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon}>💹</div>
                <div className={styles.metricValue}>
                  {analyticsData.activity_stats.trading_volume.amount} {analyticsData.activity_stats.trading_volume.currency}
                </div>
                <div className={styles.metricLabel}>Trading Volume</div>
                <div className={styles.metricPeriod}>Last 30 days</div>
              </div>
            </div>

            {/* Time Series Chart Placeholder */}
            <div className={styles.chartSection}>
              <h3>Portfolio Value Over Time</h3>
              <div className={styles.chartPlaceholder}>
                <p>📈 Portfolio value chart would be displayed here</p>
                <div className={styles.chartData}>
                  {analyticsData.time_series_data.map((point, index) => (
                    <div key={index} className={styles.dataPoint}>
                      <span className={styles.dataDate}>{new Date(point.date).toLocaleDateString()}</span>
                      <span className={styles.dataValue}>{point.total_value} STEEM</span>
                      <span className={styles.dataCount}>{point.asset_count} assets</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className={styles.activityContent}>
            {/* Activity Stats */}
            <div className={styles.activityStats}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📊</div>
                <div className={styles.statValue}>{analyticsData.activity_stats.total_transactions}</div>
                <div className={styles.statLabel}>Total Transactions</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🪙</div>
                <div className={styles.statValue}>{analyticsData.activity_stats.minting_activity.count}</div>
                <div className={styles.statLabel}>Assets Minted</div>
                <div className={styles.statCost}>
                  Cost: {analyticsData.activity_stats.minting_activity.total_cost.amount} {analyticsData.activity_stats.minting_activity.total_cost.currency}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📤</div>
                <div className={styles.statValue}>{analyticsData.activity_stats.transfer_activity.sent}</div>
                <div className={styles.statLabel}>Transfers Sent</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📥</div>
                <div className={styles.statValue}>{analyticsData.activity_stats.transfer_activity.received}</div>
                <div className={styles.statLabel}>Transfers Received</div>
              </div>
            </div>

            {/* Popular Assets */}
            <div className={styles.popularAssetsSection}>
              <h3>Most Active Assets</h3>
              <div className={styles.popularAssetsList}>
                {analyticsData.top_assets.by_popularity.map((asset, index) => (
                  <div key={index} className={styles.popularAssetItem}>
                    <div className={styles.popularAssetRank}>#{index + 1}</div>
                    <div className={styles.popularAssetInfo}>
                      <button
                        onClick={() => onAssetClick(asset.name)}
                        className={styles.popularAssetName}
                      >
                        {asset.name}
                      </button>
                      <div className={styles.popularAssetMeta}>
                        <span className={styles.popularAssetDomain}>
                          {getDomainIcon(asset.domain)} {asset.domain}
                        </span>
                        <span className={styles.popularAssetActivity}>
                          {asset.interaction_count} interactions
                        </span>
                      </div>
                    </div>
                    <div className={styles.popularAssetTime}>
                      {formatTimestamp(asset.last_activity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioAnalytics;