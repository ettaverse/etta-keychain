import React, { useState, useEffect } from 'react';
import styles from './TradingHistory.module.css';

interface TradeEvent {
  id: string;
  timestamp: string;
  type: 'buy' | 'sell' | 'trade';
  asset: {
    universal_id: string;
    name: string;
    domain: string;
    image_url?: string;
  };
  price: {
    amount: string;
    currency: string;
  };
  quantity: number;
  counterparty: string;
  transaction_id: string;
  status: 'completed' | 'pending' | 'failed';
  fees?: {
    amount: string;
    currency: string;
  };
  profit_loss?: {
    amount: string;
    currency: string;
    percentage: number;
  };
}

interface TradingHistoryProps {
  username: string;
  onTradeSelect?: (trade: TradeEvent) => void;
  dateRange?: { start: string; end: string };
  assetFilter?: string;
  tradeTypeFilter?: 'all' | 'buy' | 'sell' | 'trade';
  sortBy?: 'timestamp' | 'value' | 'profit' | 'asset';
  sortOrder?: 'asc' | 'desc';
}

const TradingHistory: React.FC<TradingHistoryProps> = ({
  username,
  onTradeSelect,
  dateRange,
  assetFilter,
  tradeTypeFilter = 'all',
  sortBy = 'timestamp',
  sortOrder = 'desc'
}) => {
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('month');
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);

  useEffect(() => {
    loadTradingHistory();
  }, [username, dateRange, assetFilter, tradeTypeFilter, sortBy, sortOrder]);

  const loadTradingHistory = async () => {
    setLoading(true);
    
    // Mock trading history data
    const mockTrades: TradeEvent[] = [
      {
        id: 'trade_001',
        timestamp: '2024-01-15T10:30:00Z',
        type: 'buy',
        asset: {
          universal_id: 'splinterlands_card_123',
          name: 'Dragon Summoner',
          domain: 'gaming',
          image_url: 'https://d36mxiodymuqjm.cloudfront.net/cards_by_level/splinterlands_card_123_1.png'
        },
        price: { amount: '25.50', currency: 'STEEM' },
        quantity: 1,
        counterparty: 'trader_alice',
        transaction_id: '0x1234567890abcdef',
        status: 'completed',
        fees: { amount: '0.50', currency: 'STEEM' }
      },
      {
        id: 'trade_002',
        timestamp: '2024-01-14T15:45:00Z',
        type: 'sell',
        asset: {
          universal_id: 'steemmonsters_card_456',
          name: 'Fire Elemental',
          domain: 'gaming',
          image_url: 'https://d36mxiodymuqjm.cloudfront.net/cards_by_level/steemmonsters_card_456_1.png'
        },
        price: { amount: '18.75', currency: 'STEEM' },
        quantity: 2,
        counterparty: 'trader_bob',
        transaction_id: '0xabcdef1234567890',
        status: 'completed',
        fees: { amount: '0.38', currency: 'STEEM' },
        profit_loss: { amount: '3.25', currency: 'STEEM', percentage: 21.3 }
      },
      {
        id: 'trade_003',
        timestamp: '2024-01-13T09:20:00Z',
        type: 'trade',
        asset: {
          universal_id: 'steemmonsters_card_789',
          name: 'Water Wizard',
          domain: 'gaming',
          image_url: 'https://d36mxiodymuqjm.cloudfront.net/cards_by_level/steemmonsters_card_789_1.png'
        },
        price: { amount: '45.00', currency: 'STEEM' },
        quantity: 1,
        counterparty: 'trader_charlie',
        transaction_id: '0x567890abcdef1234',
        status: 'pending',
        fees: { amount: '0.90', currency: 'STEEM' }
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setTrades(mockTrades);
      setLoading(false);
    }, 1000);
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

  const getTradeTypeIcon = (type: string) => {
    const icons = {
      'buy': '🛒',
      'sell': '💰',
      'trade': '🔄'
    };
    return icons[type as keyof typeof icons] || '📊';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'completed': styles.statusCompleted,
      'pending': styles.statusPending,
      'failed': styles.statusFailed
    };
    return colors[status as keyof typeof colors] || styles.statusPending;
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

  const formatCurrency = (amount: string, currency: string) => {
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
  };

  const calculateTotalValue = () => {
    return trades.reduce((total, trade) => {
      const amount = parseFloat(trade.price.amount) * trade.quantity;
      return total + amount;
    }, 0);
  };

  const calculateProfitLoss = () => {
    return trades.reduce((total, trade) => {
      if (trade.profit_loss) {
        return total + parseFloat(trade.profit_loss.amount);
      }
      return total;
    }, 0);
  };

  const getFilteredTrades = () => {
    let filtered = trades;

    if (tradeTypeFilter !== 'all') {
      filtered = filtered.filter(trade => trade.type === tradeTypeFilter);
    }

    if (assetFilter) {
      filtered = filtered.filter(trade => 
        trade.asset.name.toLowerCase().includes(assetFilter.toLowerCase()) ||
        trade.asset.domain.toLowerCase().includes(assetFilter.toLowerCase())
      );
    }

    return filtered;
  };

  const renderTradeSummary = () => {
    const filteredTrades = getFilteredTrades();
    const totalValue = calculateTotalValue();
    const profitLoss = calculateProfitLoss();
    
    return (
      <div className={styles.tradeSummary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Trades</div>
          <div className={styles.summaryValue}>{filteredTrades.length}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Value</div>
          <div className={styles.summaryValue}>{totalValue.toFixed(2)} STEEM</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Profit/Loss</div>
          <div className={`${styles.summaryValue} ${profitLoss >= 0 ? styles.profit : styles.loss}`}>
            {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)} STEEM
          </div>
        </div>
      </div>
    );
  };

  const renderTradeItem = (trade: TradeEvent) => {
    const isExpanded = expandedTrade === trade.id;
    
    return (
      <div key={trade.id} className={styles.tradeItem}>
        <div 
          className={styles.tradeHeader}
          onClick={() => setExpandedTrade(isExpanded ? null : trade.id)}
        >
          <div className={styles.tradeBasicInfo}>
            <div className={styles.tradeIcon}>
              {trade.asset.image_url ? (
                <img src={trade.asset.image_url} alt={trade.asset.name} className={styles.assetImage} />
              ) : (
                <div className={styles.placeholderIcon}>
                  {getDomainIcon(trade.asset.domain)}
                </div>
              )}
            </div>
            
            <div className={styles.tradeDetails}>
              <div className={styles.tradeTitle}>
                <span className={styles.tradeType}>
                  {getTradeTypeIcon(trade.type)} {trade.type.toUpperCase()}
                </span>
                <span className={styles.assetName}>{trade.asset.name}</span>
              </div>
              <div className={styles.tradeMeta}>
                <span className={styles.tradeTime}>{formatTimestamp(trade.timestamp)}</span>
                <span className={styles.tradeQuantity}>Qty: {trade.quantity}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.tradeValue}>
            <div className={styles.tradePrice}>
              {formatCurrency(trade.price.amount, trade.price.currency)}
            </div>
            <div className={styles.tradeStatus}>
              <span className={getStatusColor(trade.status)}>
                {trade.status}
              </span>
            </div>
          </div>
          
          <div className={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
        
        {isExpanded && (
          <div className={styles.tradeExpanded}>
            <div className={styles.expandedGrid}>
              <div className={styles.expandedSection}>
                <h5>Transaction Details</h5>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Transaction ID:</span>
                  <span className={styles.detailValue}>{trade.transaction_id}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Counterparty:</span>
                  <span className={styles.detailValue}>{trade.counterparty}</span>
                </div>
                {trade.fees && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Fees:</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(trade.fees.amount, trade.fees.currency)}
                    </span>
                  </div>
                )}
              </div>
              
              {trade.profit_loss && (
                <div className={styles.expandedSection}>
                  <h5>Profit/Loss</h5>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Amount:</span>
                    <span className={`${styles.detailValue} ${trade.profit_loss.percentage >= 0 ? styles.profit : styles.loss}`}>
                      {trade.profit_loss.percentage >= 0 ? '+' : ''}{formatCurrency(trade.profit_loss.amount, trade.profit_loss.currency)}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Percentage:</span>
                    <span className={`${styles.detailValue} ${trade.profit_loss.percentage >= 0 ? styles.profit : styles.loss}`}>
                      {trade.profit_loss.percentage >= 0 ? '+' : ''}{trade.profit_loss.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className={styles.tradeActions}>
              <button 
                className={styles.actionButton}
                onClick={() => onTradeSelect && onTradeSelect(trade)}
              >
                View Details
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.tradingHistoryContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading trading history...</p>
        </div>
      </div>
    );
  }

  const filteredTrades = getFilteredTrades();

  return (
    <div className={styles.tradingHistoryContainer}>
      <div className={styles.historyHeader}>
        <h3>Trading History</h3>
        <div className={styles.periodSelector}>
          {['day', 'week', 'month', 'year', 'all'].map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period as any)}
              className={`${styles.periodButton} ${selectedPeriod === period ? styles.active : ''}`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {renderTradeSummary()}
      
      <div className={styles.tradesContainer}>
        {filteredTrades.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <h4>No Trading History</h4>
            <p>No trades found matching your current filters.</p>
          </div>
        ) : (
          <div className={styles.tradesList}>
            {filteredTrades.map(trade => renderTradeItem(trade))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingHistory;