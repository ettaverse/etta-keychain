import React, { useState } from 'react';
import styles from './PortfolioFilters.module.css';

interface FilterOptions {
  domain: string;
  game: string;
  rarity: string;
  minting_status: string;
  tradeable: boolean | null;
  transferable: boolean | null;
  price_range: {
    min: string;
    max: string;
    currency: string;
  };
  date_range: {
    from: string;
    to: string;
  };
  tags: string[];
  sort_by: 'name' | 'date' | 'value' | 'rarity';
  sort_order: 'asc' | 'desc';
  search_query: string;
}

interface PortfolioFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
  onSavePreset: (name: string, filters: FilterOptions) => void;
  onLoadPreset: (filters: FilterOptions) => void;
  availableDomains: string[];
  availableGames: string[];
  availableRarities: string[];
  savedPresets: Array<{ name: string; filters: FilterOptions }>;
}

const PortfolioFilters: React.FC<PortfolioFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  onSavePreset,
  onLoadPreset,
  availableDomains,
  availableGames,
  availableRarities,
  savedPresets
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [presetName, setPresetName] = useState('');
  const [showPresetDialog, setShowPresetDialog] = useState(false);

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  const handlePriceRangeChange = (field: 'min' | 'max' | 'currency', value: string) => {
    onFiltersChange({
      ...filters,
      price_range: {
        ...filters.price_range,
        [field]: value
      }
    });
  };

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    onFiltersChange({
      ...filters,
      date_range: {
        ...filters.date_range,
        [field]: value
      }
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !filters.tags.includes(newTag.trim())) {
      onFiltersChange({
        ...filters,
        tags: [...filters.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onFiltersChange({
      ...filters,
      tags: filters.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim(), filters);
      setPresetName('');
      setShowPresetDialog(false);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.domain !== 'all') count++;
    if (filters.game !== 'all') count++;
    if (filters.rarity !== 'all') count++;
    if (filters.minting_status !== 'all') count++;
    if (filters.tradeable !== null) count++;
    if (filters.transferable !== null) count++;
    if (filters.price_range.min || filters.price_range.max) count++;
    if (filters.date_range.from || filters.date_range.to) count++;
    if (filters.tags.length > 0) count++;
    if (filters.search_query) count++;
    return count;
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

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={styles.filtersContainer}>
      {/* Filter Header */}
      <div className={styles.filtersHeader}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.expandButton}
        >
          🔍 Filters
          {activeFiltersCount > 0 && (
            <span className={styles.activeFiltersCount}>{activeFiltersCount}</span>
          )}
          <span className={isExpanded ? styles.chevronUp : styles.chevronDown}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </button>

        <div className={styles.headerActions}>
          <button
            onClick={() => setShowPresetDialog(true)}
            className={styles.presetButton}
          >
            💾 Save Preset
          </button>
          <button
            onClick={onClearFilters}
            className={styles.clearButton}
            disabled={activeFiltersCount === 0}
          >
            ✕ Clear All
          </button>
        </div>
      </div>

      {/* Quick Search */}
      <div className={styles.quickSearch}>
        <input
          type="text"
          placeholder="Search assets..."
          value={filters.search_query}
          onChange={(e) => handleFilterChange('search_query', e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.sortControls}>
          <select
            value={filters.sort_by}
            onChange={(e) => handleFilterChange('sort_by', e.target.value)}
            className={styles.sortSelect}
          >
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Date</option>
            <option value="value">Sort by Value</option>
            <option value="rarity">Sort by Rarity</option>
          </select>
          <button
            onClick={() => handleFilterChange('sort_order', filters.sort_order === 'asc' ? 'desc' : 'asc')}
            className={styles.sortOrderButton}
          >
            {filters.sort_order === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className={styles.expandedFilters}>
          {/* Basic Filters */}
          <div className={styles.filterSection}>
            <h4 className={styles.sectionTitle}>Basic Filters</h4>
            <div className={styles.filterGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Domain</label>
                <select
                  value={filters.domain}
                  onChange={(e) => handleFilterChange('domain', e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Domains</option>
                  {availableDomains.map(domain => (
                    <option key={domain} value={domain}>
                      {getDomainIcon(domain)} {domain}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Game</label>
                <select
                  value={filters.game}
                  onChange={(e) => handleFilterChange('game', e.target.value)}
                  className={styles.filterSelect}
                  disabled={filters.domain === 'all'}
                >
                  <option value="all">All Games</option>
                  {availableGames.map(game => (
                    <option key={game} value={game}>
                      {game}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Rarity</label>
                <select
                  value={filters.rarity}
                  onChange={(e) => handleFilterChange('rarity', e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Rarities</option>
                  {availableRarities.map(rarity => (
                    <option key={rarity} value={rarity}>
                      <span style={{ color: getRarityColor(rarity) }}>
                        {rarity}
                      </span>
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Minting Status</label>
                <select
                  value={filters.minting_status}
                  onChange={(e) => handleFilterChange('minting_status', e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Statuses</option>
                  <option value="minted">Minted</option>
                  <option value="unminted">Unminted</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Properties Filters */}
          <div className={styles.filterSection}>
            <h4 className={styles.sectionTitle}>Properties</h4>
            <div className={styles.propertiesGrid}>
              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Tradeable</label>
                <div className={styles.toggleButtons}>
                  <button
                    onClick={() => handleFilterChange('tradeable', null)}
                    className={filters.tradeable === null ? styles.toggleActive : styles.toggleButton}
                  >
                    Any
                  </button>
                  <button
                    onClick={() => handleFilterChange('tradeable', true)}
                    className={filters.tradeable === true ? styles.toggleActive : styles.toggleButton}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleFilterChange('tradeable', false)}
                    className={filters.tradeable === false ? styles.toggleActive : styles.toggleButton}
                  >
                    No
                  </button>
                </div>
              </div>

              <div className={styles.propertyGroup}>
                <label className={styles.propertyLabel}>Transferable</label>
                <div className={styles.toggleButtons}>
                  <button
                    onClick={() => handleFilterChange('transferable', null)}
                    className={filters.transferable === null ? styles.toggleActive : styles.toggleButton}
                  >
                    Any
                  </button>
                  <button
                    onClick={() => handleFilterChange('transferable', true)}
                    className={filters.transferable === true ? styles.toggleActive : styles.toggleButton}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleFilterChange('transferable', false)}
                    className={filters.transferable === false ? styles.toggleActive : styles.toggleButton}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className={styles.filterSection}>
            <h4 className={styles.sectionTitle}>Price Range</h4>
            <div className={styles.priceRangeGrid}>
              <div className={styles.priceInput}>
                <label className={styles.priceLabel}>Min Price</label>
                <input
                  type="number"
                  placeholder="0.000"
                  value={filters.price_range.min}
                  onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                  className={styles.priceField}
                  step="0.001"
                  min="0"
                />
              </div>
              <div className={styles.priceInput}>
                <label className={styles.priceLabel}>Max Price</label>
                <input
                  type="number"
                  placeholder="999.999"
                  value={filters.price_range.max}
                  onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                  className={styles.priceField}
                  step="0.001"
                  min="0"
                />
              </div>
              <div className={styles.priceInput}>
                <label className={styles.priceLabel}>Currency</label>
                <select
                  value={filters.price_range.currency}
                  onChange={(e) => handlePriceRangeChange('currency', e.target.value)}
                  className={styles.currencySelect}
                >
                  <option value="STEEM">STEEM</option>
                  <option value="SBD">SBD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className={styles.filterSection}>
            <h4 className={styles.sectionTitle}>Date Range</h4>
            <div className={styles.dateRangeGrid}>
              <div className={styles.dateInput}>
                <label className={styles.dateLabel}>From</label>
                <input
                  type="date"
                  value={filters.date_range.from}
                  onChange={(e) => handleDateRangeChange('from', e.target.value)}
                  className={styles.dateField}
                />
              </div>
              <div className={styles.dateInput}>
                <label className={styles.dateLabel}>To</label>
                <input
                  type="date"
                  value={filters.date_range.to}
                  onChange={(e) => handleDateRangeChange('to', e.target.value)}
                  className={styles.dateField}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className={styles.filterSection}>
            <h4 className={styles.sectionTitle}>Tags</h4>
            <div className={styles.tagsSection}>
              <div className={styles.tagInput}>
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className={styles.tagField}
                />
                <button
                  onClick={handleAddTag}
                  className={styles.addTagButton}
                >
                  Add
                </button>
              </div>
              {filters.tags.length > 0 && (
                <div className={styles.tagsList}>
                  {filters.tags.map(tag => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className={styles.removeTagButton}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Saved Presets */}
          {savedPresets.length > 0 && (
            <div className={styles.filterSection}>
              <h4 className={styles.sectionTitle}>Saved Presets</h4>
              <div className={styles.presetsList}>
                {savedPresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => onLoadPreset(preset.filters)}
                    className={styles.presetItem}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Preset Dialog */}
      {showPresetDialog && (
        <div className={styles.presetDialog}>
          <div className={styles.dialogContent}>
            <h4>Save Filter Preset</h4>
            <input
              type="text"
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className={styles.presetNameInput}
            />
            <div className={styles.dialogActions}>
              <button onClick={handleSavePreset} className={styles.saveButton}>
                Save
              </button>
              <button
                onClick={() => setShowPresetDialog(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioFilters;