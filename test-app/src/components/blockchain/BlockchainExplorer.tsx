import React, { useState, useEffect } from 'react';
import styles from './BlockchainExplorer.module.css';

interface CustomJsonOperation {
  sequence?: number;
  timestamp: string;
  block: number;
  transaction_id: string;
  operation_type: string;
  operation_data: {
    required_auths: string[];
    required_posting_auths: string[];
    id: string;
    json: string;
  };
  json_data: any;
}

interface BlockchainExplorerProps {
  username: string;
  onResponse: (operation: string, response: any) => void;
}

const BlockchainExplorer: React.FC<BlockchainExplorerProps> = ({ username, onResponse }) => {
  const [operations, setOperations] = useState<CustomJsonOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<CustomJsonOperation | null>(null);
  const [queryType, setQueryType] = useState<'account' | 'block' | 'date_range' | 'block_range'>('account');
  const [filters, setFilters] = useState({
    account: username,
    customJsonId: 'etta_asset',
    limit: 1000,
    blockNumber: '',
    startDate: '',
    endDate: '',
    startBlock: '',
    endBlock: '',
    maxResults: 5000
  });
  const [sortBy, setSortBy] = useState<'timestamp' | 'block' | 'account'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    setFilters(prev => ({ ...prev, account: username }));
  }, [username]);

  const executeQuery = async () => {
    if (!window.steem_keychain) {
      onResponse('Blockchain Query Error', { error: 'Extension not detected' });
      return;
    }

    setLoading(true);
    onResponse('Blockchain Query Started', { 
      message: `Searching for custom_json operations with ID "${filters.customJsonId}"...`,
      queryType
    });

    try {
      let requestData: any = {
        type: '',
        customJsonId: filters.customJsonId
      };

      switch (queryType) {
        case 'account':
          requestData.type = 'query_custom_json_by_account';
          requestData.account = filters.account;
          requestData.limit = filters.limit;
          break;
        case 'block':
          requestData.type = 'query_custom_json_by_block';
          requestData.blockNumber = parseInt(filters.blockNumber);
          break;
        case 'date_range':
          requestData.type = 'query_custom_json_by_date_range';
          requestData.accounts = [filters.account];
          requestData.startDate = filters.startDate;
          requestData.endDate = filters.endDate;
          requestData.maxResults = filters.maxResults;
          break;
        case 'block_range':
          requestData.type = 'query_custom_json_by_block_range';
          requestData.startBlock = parseInt(filters.startBlock);
          requestData.endBlock = parseInt(filters.endBlock);
          requestData.maxResults = filters.maxResults;
          break;
      }

      window.steem_keychain.requestAssetOperation!(
        username,
        requestData.type,
        requestData,
        (response: any) => {
          setLoading(false);
          
          if (response.success) {
            setOperations(response.operations || []);
            onResponse('Blockchain Query Success', {
              success: true,
              count: response.count,
              query_type: response.query_type,
              message: response.message,
              operations: response.operations
            });
          } else {
            onResponse('Blockchain Query Failed', {
              success: false,
              error: response.error,
              message: response.message
            });
          }
        },
        `Query ${queryType.replace('_', ' ')} for ${filters.customJsonId}`,
        undefined
      );
    } catch (error) {
      setLoading(false);
      onResponse('Blockchain Query Error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const getFilteredOperations = () => {
    let filtered = operations;

    // Apply text filter
    if (filterText) {
      filtered = filtered.filter(op => 
        op.transaction_id.toLowerCase().includes(filterText.toLowerCase()) ||
        JSON.stringify(op.json_data).toLowerCase().includes(filterText.toLowerCase()) ||
        op.operation_data.required_posting_auths.some(auth => 
          auth.toLowerCase().includes(filterText.toLowerCase())
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'block':
          aValue = a.block;
          bValue = b.block;
          break;
        case 'account':
          aValue = a.operation_data.required_posting_auths[0] || '';
          bValue = b.operation_data.required_posting_auths[0] || '';
          break;
        default:
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getOperationTypeIcon = (jsonData: any) => {
    if (!jsonData) return '📄';
    
    const action = jsonData.action || jsonData.type;
    const icons: Record<string, string> = {
      'mint': '🪙',
      'create': '🪙',
      'transfer': '🔄',
      'send': '📤',
      'receive': '📥',
      'update': '📝',
      'burn': '🔥',
      'destroy': '🔥',
      'convert': '🔄',
      'trade': '💱'
    };
    
    return icons[action] || '📄';
  };

  const exportToCSV = () => {
    const filtered = getFilteredOperations();
    const csvContent = [
      ['Timestamp', 'Block', 'Transaction ID', 'Account', 'Action', 'JSON Data'],
      ...filtered.map(op => [
        op.timestamp,
        op.block.toString(),
        op.transaction_id,
        op.operation_data.required_posting_auths[0] || '',
        op.json_data?.action || op.json_data?.type || 'unknown',
        JSON.stringify(op.json_data)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etta_asset_operations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    onResponse('Export Complete', { 
      message: `Exported ${filtered.length} operations to CSV`,
      filename: a.download
    });
  };

  const exportToJSON = () => {
    const filtered = getFilteredOperations();
    const jsonContent = JSON.stringify(filtered, null, 2);
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etta_asset_operations_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    onResponse('Export Complete', { 
      message: `Exported ${filtered.length} operations to JSON`,
      filename: a.download
    });
  };

  const filteredOperations = getFilteredOperations();

  return (
    <div className={styles.blockchainExplorer}>
      <div className={styles.header}>
        <h3>🔍 Blockchain Explorer</h3>
        <p>Query and analyze custom_json operations on the STEEM blockchain</p>
      </div>

      {/* Query Controls */}
      <div className={styles.queryControls}>
        <div className={styles.queryTypeSelector}>
          <label>Query Type:</label>
          <select value={queryType} onChange={(e) => setQueryType(e.target.value as any)}>
            <option value="account">By Account</option>
            <option value="block">By Block</option>
            <option value="date_range">By Date Range</option>
            <option value="block_range">By Block Range</option>
          </select>
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>Custom JSON ID:</label>
            <input
              type="text"
              value={filters.customJsonId}
              onChange={(e) => setFilters(prev => ({ ...prev, customJsonId: e.target.value }))}
              placeholder="e.g., etta_asset"
            />
          </div>

          {queryType === 'account' && (
            <>
              <div className={styles.filterItem}>
                <label>Account:</label>
                <input
                  type="text"
                  value={filters.account}
                  onChange={(e) => setFilters(prev => ({ ...prev, account: e.target.value }))}
                  placeholder="Enter account name"
                />
              </div>
              <div className={styles.filterItem}>
                <label>Limit:</label>
                <input
                  type="number"
                  value={filters.limit}
                  onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                  min="1"
                  max="10000"
                />
              </div>
            </>
          )}

          {queryType === 'block' && (
            <div className={styles.filterItem}>
              <label>Block Number:</label>
              <input
                type="number"
                value={filters.blockNumber}
                onChange={(e) => setFilters(prev => ({ ...prev, blockNumber: e.target.value }))}
                placeholder="Enter block number"
              />
            </div>
          )}

          {queryType === 'date_range' && (
            <>
              <div className={styles.filterItem}>
                <label>Start Date:</label>
                <input
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className={styles.filterItem}>
                <label>End Date:</label>
                <input
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div className={styles.filterItem}>
                <label>Max Results:</label>
                <input
                  type="number"
                  value={filters.maxResults}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxResults: parseInt(e.target.value) }))}
                  min="1"
                  max="10000"
                />
              </div>
            </>
          )}

          {queryType === 'block_range' && (
            <>
              <div className={styles.filterItem}>
                <label>Start Block:</label>
                <input
                  type="number"
                  value={filters.startBlock}
                  onChange={(e) => setFilters(prev => ({ ...prev, startBlock: e.target.value }))}
                  placeholder="Start block number"
                />
              </div>
              <div className={styles.filterItem}>
                <label>End Block:</label>
                <input
                  type="number"
                  value={filters.endBlock}
                  onChange={(e) => setFilters(prev => ({ ...prev, endBlock: e.target.value }))}
                  placeholder="End block number"
                />
              </div>
              <div className={styles.filterItem}>
                <label>Max Results:</label>
                <input
                  type="number"
                  value={filters.maxResults}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxResults: parseInt(e.target.value) }))}
                  min="1"
                  max="10000"
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.queryActions}>
          <button
            onClick={executeQuery}
            disabled={loading}
            className={styles.queryButton}
          >
            {loading ? '🔄 Searching...' : '🔍 Search'}
          </button>
        </div>
      </div>

      {/* Results Controls */}
      {operations.length > 0 && (
        <div className={styles.resultsControls}>
          <div className={styles.searchFilter}>
            <label>Filter Results:</label>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search by transaction ID, account, or JSON content..."
            />
          </div>

          <div className={styles.sortControls}>
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="timestamp">Timestamp</option>
              <option value="block">Block Number</option>
              <option value="account">Account</option>
            </select>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)}>
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          <div className={styles.exportControls}>
            <button onClick={exportToCSV} className={styles.exportButton}>
              📊 Export CSV
            </button>
            <button onClick={exportToJSON} className={styles.exportButton}>
              📄 Export JSON
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {operations.length > 0 && (
        <div className={styles.resultsSummary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Total Operations</div>
            <div className={styles.summaryValue}>{operations.length}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Filtered Results</div>
            <div className={styles.summaryValue}>{filteredOperations.length}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Unique Accounts</div>
            <div className={styles.summaryValue}>
              {new Set(operations.flatMap(op => op.operation_data.required_posting_auths)).size}
            </div>
          </div>
        </div>
      )}

      {/* Operations List */}
      <div className={styles.operationsContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Searching blockchain...</p>
          </div>
        ) : filteredOperations.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h4>No Operations Found</h4>
            <p>No custom_json operations found matching your search criteria.</p>
            <p>Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className={styles.operationsList}>
            {filteredOperations.map((operation, index) => (
              <div key={`${operation.transaction_id}-${index}`} className={styles.operationCard}>
                <div 
                  className={styles.operationHeader}
                  onClick={() => setSelectedOperation(
                    selectedOperation?.transaction_id === operation.transaction_id ? null : operation
                  )}
                >
                  <div className={styles.operationBasicInfo}>
                    <div className={styles.operationIcon}>
                      {getOperationTypeIcon(operation.json_data)}
                    </div>
                    <div className={styles.operationMeta}>
                      <div className={styles.operationTitle}>
                        <span className={styles.operationType}>
                          {operation.json_data?.action || operation.json_data?.type || 'Unknown'}
                        </span>
                        <span className={styles.operationAccount}>
                          {operation.operation_data.required_posting_auths[0] || 'Unknown'}
                        </span>
                      </div>
                      <div className={styles.operationDetails}>
                        <span className={styles.operationTime}>
                          {formatTimestamp(operation.timestamp)}
                        </span>
                        <span className={styles.operationBlock}>
                          Block {operation.block}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.operationTxId}>
                    <span className={styles.txIdLabel}>TX:</span>
                    <span className={styles.txIdValue}>
                      {operation.transaction_id.slice(0, 8)}...
                    </span>
                  </div>
                  
                  <div className={styles.expandIcon}>
                    {selectedOperation?.transaction_id === operation.transaction_id ? '▼' : '▶'}
                  </div>
                </div>

                {selectedOperation?.transaction_id === operation.transaction_id && (
                  <div className={styles.operationExpanded}>
                    <div className={styles.expandedGrid}>
                      <div className={styles.expandedSection}>
                        <h5>Transaction Details</h5>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Full Transaction ID:</span>
                          <span className={styles.detailValue}>{operation.transaction_id}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Block Number:</span>
                          <span className={styles.detailValue}>{operation.block}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Custom JSON ID:</span>
                          <span className={styles.detailValue}>{operation.operation_data.id}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Authorized Accounts:</span>
                          <span className={styles.detailValue}>
                            {operation.operation_data.required_posting_auths.join(', ')}
                          </span>
                        </div>
                      </div>
                      
                      <div className={styles.expandedSection}>
                        <h5>JSON Data</h5>
                        <div className={styles.jsonContainer}>
                          <pre className={styles.jsonContent}>
                            {JSON.stringify(operation.json_data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className={styles.instructions}>
        <h4>How to Use Blockchain Explorer:</h4>
        <ol>
          <li><strong>Choose Query Type:</strong> Select how you want to search for operations</li>
          <li><strong>Set Filters:</strong> Configure your search parameters (account, blocks, dates, etc.)</li>
          <li><strong>Execute Search:</strong> Click "Search" to query the blockchain</li>
          <li><strong>Filter Results:</strong> Use the text filter to narrow down results</li>
          <li><strong>Sort & Export:</strong> Sort by different criteria and export data</li>
          <li><strong>View Details:</strong> Click on any operation to see full transaction details</li>
        </ol>
      </div>
    </div>
  );
};

export default BlockchainExplorer;