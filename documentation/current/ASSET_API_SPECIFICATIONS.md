# Asset API Specifications

## Overview

This document defines the complete API specification for the Multi-Level Asset System, including all endpoints, request/response formats, error handling, and usage examples.

## API Architecture

### Base Interface Extension

The existing `SteemKeychain` interface is extended with asset-specific methods:

```typescript
interface SteemKeychainAssetAPI extends SteemKeychain {
  // Asset Discovery APIs
  getAssetsByDomain(domain: string, filters: AssetFilters, callback: (response: ApiResponse<UniversalAsset[]>) => void): void;
  getAssetsByGame(gameId: string, filters: AssetFilters, callback: (response: ApiResponse<UniversalAsset[]>) => void): void;
  getUserAssets(username: string, filters: UserAssetFilters, callback: (response: ApiResponse<PortfolioResponse>) => void): void;
  findAssetVariants(universalId: string, callback: (response: ApiResponse<AssetVariantResponse>) => void): void;
  searchAssets(query: AssetSearchQuery, callback: (response: ApiResponse<AssetSearchResponse>) => void): void;
  
  // Asset Operations APIs
  requestAssetMint(mintRequest: AssetMintRequest, callback: (response: ApiResponse<AssetMintResponse>) => void): void;
  requestAssetTransfer(transferRequest: AssetTransferRequest, callback: (response: ApiResponse<AssetTransferResponse>) => void): void;
  requestAssetConvert(convertRequest: AssetConvertRequest, callback: (response: ApiResponse<AssetConvertResponse>) => void): void;
  requestAssetBurn(burnRequest: AssetBurnRequest, callback: (response: ApiResponse<AssetBurnResponse>) => void): void;
  
  // Asset Information APIs
  getAssetDetails(universalId: string, callback: (response: ApiResponse<UniversalAsset>) => void): void;
  getAssetHistory(universalId: string, callback: (response: ApiResponse<AssetTransaction[]>) => void): void;
  getAssetOwnership(universalId: string, callback: (response: ApiResponse<OwnershipInfo>) => void): void;
  
  // Cross-Game APIs
  checkAssetCompatibility(universalId: string, targetGame: string, callback: (response: ApiResponse<CompatibilityResult>) => void): void;
  getConversionOptions(universalId: string, callback: (response: ApiResponse<ConversionOption[]>) => void): void;
  
  // Marketplace APIs
  listAssetForSale(listingRequest: AssetListingRequest, callback: (response: ApiResponse<AssetListingResponse>) => void): void;
  buyAsset(purchaseRequest: AssetPurchaseRequest, callback: (response: ApiResponse<AssetPurchaseResponse>) => void): void;
  cancelAssetListing(universalId: string, callback: (response: ApiResponse<CancelListingResponse>) => void): void;
  
  // Portfolio Management APIs
  getUserPortfolio(username: string, filters: PortfolioFilters, callback: (response: ApiResponse<PortfolioResponse>) => void): void;
  getPortfolioSummary(username: string, callback: (response: ApiResponse<PortfolioSummary>) => void): void;
  
  // Registry APIs
  getGameRegistry(callback: (response: ApiResponse<GameRegistry>) => void): void;
  getDomainRegistry(callback: (response: ApiResponse<DomainRegistry>) => void): void;
}
```

## Core Data Types

### Universal Asset Structure

```typescript
interface UniversalAsset {
  // Core Identity
  universal_id: string;
  domain: string;
  creation_timestamp: string;
  creator: string;
  current_owner: string;
  
  // Metadata
  base_metadata: {
    name: string;
    description: string;
    image_url: string;
    external_url?: string;
    animation_url?: string;
    core_attributes: Record<string, any>;
    tags: string[];
  };
  
  // Web2 Integration
  web2_integration?: {
    source_system: string;
    source_id: string;
    sync_status: 'synced' | 'pending' | 'error' | 'disabled';
    last_sync: string;
    sync_metadata?: Record<string, any>;
  };
  
  // Game Variants
  variants: Record<string, GameVariant>;
  
  // Asset Properties
  properties: {
    tradeable: boolean;
    transferable: boolean;
    burnable: boolean;
    mintable: boolean;
    supply: {
      total: number;
      circulating: number;
      burned: number;
    };
    rarity: {
      tier: string;
      score: number;
      rank?: number;
    };
  };
  
  // Financial Information
  economic_data?: {
    mint_price?: { amount: string; currency: string };
    current_value?: { amount: string; currency: string };
    last_sale?: { amount: string; currency: string; timestamp: string };
    royalty_percentage?: number;
    royalty_recipient?: string;
  };
  
  // Blockchain Data
  blockchain_info: {
    transaction_id: string;
    block_number: number;
    confirmation_count: number;
    network: string;
  };
  
  // Transfer History
  transfer_history: AssetTransaction[];
}

interface GameVariant {
  game_id: string;
  asset_type: string;
  
  // Game-specific Properties
  properties: Record<string, any>;
  
  // Display Information
  display: {
    name?: string;
    description?: string;
    image_url?: string;
    animation_url?: string;
    model_url?: string;
  };
  
  // Game Mechanics
  mechanics: {
    usable_in: string[];
    abilities?: string[];
    restrictions?: string[];
    cooldown?: number;
    durability?: number;
  };
  
  // Compatibility
  compatibility: {
    min_game_version: string;
    max_game_version?: string;
    required_features?: string[];
    incompatible_with?: string[];
  };
  
  // Status
  status: {
    active: boolean;
    deprecated: boolean;
    migration_target?: string;
  };
}
```

### Filter and Query Types

```typescript
interface AssetFilters {
  // Basic Filters
  rarity?: string[];
  creator?: string;
  owner?: string;
  tags?: string[];
  
  // Date Filters
  created_after?: string;
  created_before?: string;
  
  // Economic Filters
  min_price?: { amount: string; currency: string };
  max_price?: { amount: string; currency: string };
  
  // Status Filters
  tradeable?: boolean;
  for_sale?: boolean;
  
  // Sorting
  sort_by?: 'created_date' | 'price' | 'rarity' | 'name' | 'last_activity';
  sort_order?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
}

interface UserAssetFilters extends AssetFilters {
  // User-specific filters
  include_variants?: string[];  // Specific game variants to include
  exclude_variants?: string[];  // Game variants to exclude
  group_by?: 'domain' | 'game' | 'asset_type' | 'rarity' | 'none';
}

interface AssetSearchQuery {
  // Search Terms
  text?: string;
  exact_match?: boolean;
  
  // Scope
  domains?: string[];
  games?: string[];
  asset_types?: string[];
  
  // Filters
  filters?: AssetFilters;
  
  // Advanced
  similarity_threshold?: number;  // For fuzzy matching
  include_variants?: boolean;
}
```

## API Response Format

### Standard Response Structure

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    request_id: string;
    timestamp: string;
    processing_time_ms: number;
    rate_limit?: {
      remaining: number;
      reset_time: string;
    };
  };
}

interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
  trace_id?: string;
}

enum ErrorCode {
  // General Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Asset Errors
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  ASSET_NOT_OWNED = 'ASSET_NOT_OWNED',
  ASSET_NOT_TRADEABLE = 'ASSET_NOT_TRADEABLE',
  ASSET_ALREADY_EXISTS = 'ASSET_ALREADY_EXISTS',
  
  // Game Errors
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  GAME_NOT_SUPPORTED = 'GAME_NOT_SUPPORTED',
  VARIANT_NOT_COMPATIBLE = 'VARIANT_NOT_COMPATIBLE',
  
  // Financial Errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_PRICE = 'INVALID_PRICE',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // Blockchain Errors
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR'
}
```

## Asset Discovery APIs

### 1. Get Assets by Domain

```typescript
// Request
getAssetsByDomain(domain: string, filters: AssetFilters, callback: (response: ApiResponse<UniversalAsset[]>) => void): void;

// Example Usage
window.steem_keychain.getAssetsByDomain('gaming', {
  rarity: ['legendary', 'epic'],
  sort_by: 'created_date',
  sort_order: 'desc',
  limit: 20
}, (response) => {
  if (response.success) {
    console.log('Gaming assets:', response.data);
  } else {
    console.error('Error:', response.error);
  }
});

// Response Format
interface DomainAssetsResponse {
  assets: UniversalAsset[];
  total_count: number;
  page_info: {
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  domain_info: {
    name: string;
    description: string;
    total_assets: number;
    active_games: number;
  };
}
```

### 2. Get Assets by Game

```typescript
// Request
getAssetsByGame(gameId: string, filters: AssetFilters, callback: (response: ApiResponse<GameAssetsResponse>) => void): void;

// Example Usage
window.steem_keychain.getAssetsByGame('splinterlands', {
  asset_type: 'card',
  rarity: ['legendary'],
  tradeable: true,
  page: 1,
  limit: 50
}, (response) => {
  if (response.success) {
    console.log('Splinterlands cards:', response.data.assets);
  }
});

// Response Format
interface GameAssetsResponse {
  assets: UniversalAsset[];
  total_count: number;
  page_info: PageInfo;
  game_info: {
    id: string;
    name: string;
    domain: string;
    description: string;
    asset_types: string[];
    total_assets: number;
  };
}
```

### 3. Find Asset Variants

```typescript
// Request
findAssetVariants(universalId: string, callback: (response: ApiResponse<AssetVariantResponse>) => void): void;

// Example Usage
window.steem_keychain.findAssetVariants('fire_dragon_001', (response) => {
  if (response.success) {
    console.log('Available variants:', response.data.variants);
    console.log('Conversion options:', response.data.conversion_options);
  }
});

// Response Format
interface AssetVariantResponse {
  universal_asset: UniversalAsset;
  variants: {
    game_id: string;
    variant: GameVariant;
    compatibility_score: number;
    conversion_available: boolean;
    conversion_cost?: { amount: string; currency: string };
  }[];
  conversion_options: {
    from_game: string;
    to_game: string;
    success_rate: number;
    estimated_cost: { amount: string; currency: string };
    estimated_time: number; // seconds
  }[];
}
```

### 4. Search Assets

```typescript
// Request
searchAssets(query: AssetSearchQuery, callback: (response: ApiResponse<AssetSearchResponse>) => void): void;

// Example Usage
window.steem_keychain.searchAssets({
  text: 'fire dragon',
  domains: ['gaming'],
  filters: {
    rarity: ['legendary', 'epic'],
    tradeable: true
  },
  include_variants: true
}, (response) => {
  if (response.success) {
    console.log('Search results:', response.data.results);
  }
});

// Response Format
interface AssetSearchResponse {
  results: {
    asset: UniversalAsset;
    relevance_score: number;
    matching_fields: string[];
  }[];
  total_count: number;
  search_time_ms: number;
  suggestions?: string[];
}
```

## Asset Operations APIs

### 1. Asset Minting

```typescript
// Request
interface AssetMintRequest {
  domain: string;
  game_id: string;
  asset_type: string;
  
  base_metadata: {
    name: string;
    description: string;
    image_url: string;
    core_attributes: Record<string, any>;
    tags?: string[];
  };
  
  game_variant: {
    properties: Record<string, any>;
    mechanics?: {
      usable_in: string[];
      abilities?: string[];
    };
  };
  
  minting_options: {
    quantity: number;
    owner: string;
    tradeable: boolean;
    transferable: boolean;
    royalty_percentage?: number;
    royalty_recipient?: string;
  };
  
  web2_integration?: {
    source_system: string;
    source_id: string;
    sync_metadata?: Record<string, any>;
  };
}

// Example Usage
window.steem_keychain.requestAssetMint({
  domain: 'gaming',
  game_id: 'splinterlands',
  asset_type: 'card',
  
  base_metadata: {
    name: 'Lightning Phoenix',
    description: 'A rare lightning-elemental phoenix',
    image_url: 'https://assets.example.com/phoenix.png',
    core_attributes: {
      element: 'lightning',
      rarity: 'epic',
      power_level: 85
    },
    tags: ['phoenix', 'lightning', 'flying']
  },
  
  game_variant: {
    properties: {
      mana_cost: 6,
      attack: 7,
      health: 5,
      speed: 6
    },
    mechanics: {
      usable_in: ['ranked_battles', 'tournaments'],
      abilities: ['Flying', 'Lightning_Strike']
    }
  },
  
  minting_options: {
    quantity: 1,
    owner: 'player123',
    tradeable: true,
    transferable: true,
    royalty_percentage: 5,
    royalty_recipient: 'artist456'
  }
}, (response) => {
  if (response.success) {
    console.log('Asset minted:', response.data.universal_id);
  }
});

// Response Format
interface AssetMintResponse {
  universal_id: string;
  transaction_id: string;
  mint_timestamp: string;
  gas_used?: { amount: string; currency: string };
  estimated_confirmation_time: number; // seconds
}
```

### 2. Asset Transfer

```typescript
// Request
interface AssetTransferRequest {
  universal_id: string;
  from_user: string;
  to_user: string;
  game_context?: string;  // Which game variant to transfer
  transfer_type: 'gift' | 'sale' | 'trade';
  price?: { amount: string; currency: string };
  memo?: string;
  expires_at?: string;
}

// Example Usage
window.steem_keychain.requestAssetTransfer({
  universal_id: 'fire_dragon_001',
  from_user: 'seller123',
  to_user: 'buyer456',
  game_context: 'splinterlands',
  transfer_type: 'sale',
  price: { amount: '25.000', currency: 'STEEM' },
  memo: 'Enjoy your new dragon!'
}, (response) => {
  if (response.success) {
    console.log('Transfer completed:', response.data.transaction_id);
  }
});

// Response Format
interface AssetTransferResponse {
  transaction_id: string;
  transfer_timestamp: string;
  new_owner: string;
  transfer_fee?: { amount: string; currency: string };
  royalty_paid?: { amount: string; currency: string; recipient: string };
}
```

### 3. Asset Conversion (Cross-Game)

```typescript
// Request
interface AssetConvertRequest {
  universal_id: string;
  from_game: string;
  to_game: string;
  owner: string;
  conversion_options?: Record<string, any>;
  accept_partial_conversion?: boolean;
}

// Example Usage
window.steem_keychain.requestAssetConvert({
  universal_id: 'fire_dragon_001',
  from_game: 'splinterlands',
  to_game: 'steemmonsters',
  owner: 'player123',
  accept_partial_conversion: true
}, (response) => {
  if (response.success) {
    console.log('Conversion successful:', response.data);
  }
});

// Response Format
interface AssetConvertResponse {
  conversion_id: string;
  transaction_id: string;
  original_variant: GameVariant;
  new_variant: GameVariant;
  conversion_cost: { amount: string; currency: string };
  properties_lost?: string[];
  properties_gained?: string[];
  conversion_timestamp: string;
}
```

## Portfolio Management APIs

### 1. Get User Portfolio

```typescript
// Request
getUserPortfolio(username: string, filters: PortfolioFilters, callback: (response: ApiResponse<PortfolioResponse>) => void): void;

interface PortfolioFilters {
  domains?: string[];
  games?: string[];
  asset_types?: string[];
  group_by?: 'domain' | 'game' | 'asset_type' | 'rarity' | 'none';
  include_market_data?: boolean;
  include_history?: boolean;
}

// Example Usage
window.steem_keychain.getUserPortfolio('player123', {
  domains: ['gaming'],
  group_by: 'game',
  include_market_data: true
}, (response) => {
  if (response.success) {
    console.log('Portfolio:', response.data);
  }
});

// Response Format
interface PortfolioResponse {
  assets: UniversalAsset[];
  total_count: number;
  grouped_results?: Record<string, UniversalAsset[]>;
  
  summary: {
    total_assets: number;
    domains: Record<string, number>;
    games: Record<string, number>;
    asset_types: Record<string, number>;
    rarity_distribution: Record<string, number>;
  };
  
  market_data?: {
    total_value: { amount: string; currency: string };
    value_by_domain: Record<string, { amount: string; currency: string }>;
    top_assets: {
      asset: UniversalAsset;
      estimated_value: { amount: string; currency: string };
    }[];
  };
  
  activity_summary?: {
    recent_acquisitions: number;
    recent_sales: number;
    total_transactions: number;
    last_activity: string;
  };
}
```

### 2. Get Portfolio Summary

```typescript
// Request
getPortfolioSummary(username: string, callback: (response: ApiResponse<PortfolioSummary>) => void): void;

// Response Format
interface PortfolioSummary {
  owner: string;
  total_assets: number;
  
  breakdown: {
    by_domain: Record<string, {
      count: number;
      value?: { amount: string; currency: string };
    }>;
    by_rarity: Record<string, number>;
    by_status: {
      tradeable: number;
      listed_for_sale: number;
      locked: number;
    };
  };
  
  recent_activity: {
    acquisitions_30d: number;
    sales_30d: number;
    trades_30d: number;
  };
  
  top_collections: {
    game_id: string;
    asset_count: number;
    estimated_value?: { amount: string; currency: string };
  }[];
}
```

## Marketplace APIs

### 1. List Asset for Sale

```typescript
// Request
interface AssetListingRequest {
  universal_id: string;
  seller: string;
  price: { amount: string; currency: string };
  game_context?: string;
  listing_type: 'fixed_price' | 'auction' | 'best_offer';
  expires_at?: string;
  min_bid?: { amount: string; currency: string };
  auto_accept_price?: { amount: string; currency: string };
  description?: string;
}

// Example Usage
window.steem_keychain.listAssetForSale({
  universal_id: 'fire_dragon_001',
  seller: 'seller123',
  price: { amount: '50.000', currency: 'STEEM' },
  game_context: 'splinterlands',
  listing_type: 'fixed_price',
  expires_at: '2024-02-15T00:00:00Z',
  description: 'Rare fire dragon card in perfect condition'
}, (response) => {
  if (response.success) {
    console.log('Asset listed:', response.data.listing_id);
  }
});

// Response Format
interface AssetListingResponse {
  listing_id: string;
  transaction_id: string;
  listing_fee: { amount: string; currency: string };
  expires_at: string;
  marketplace_url: string;
}
```

### 2. Buy Asset

```typescript
// Request
interface AssetPurchaseRequest {
  listing_id?: string;
  universal_id?: string;
  buyer: string;
  offered_price: { amount: string; currency: string };
  payment_method: 'STEEM' | 'SBD' | 'HIVE';
  immediate_transfer: boolean;
}

// Response Format
interface AssetPurchaseResponse {
  purchase_id: string;
  transaction_id: string;
  final_price: { amount: string; currency: string };
  fees_paid: { amount: string; currency: string };
  royalty_paid?: { amount: string; currency: string; recipient: string };
  new_owner: string;
  transfer_timestamp: string;
}
```

## Error Handling Examples

### Common Error Scenarios

```typescript
// Asset not found
{
  success: false,
  error: {
    code: 'ASSET_NOT_FOUND',
    message: 'Asset with ID fire_dragon_999 does not exist',
    details: {
      universal_id: 'fire_dragon_999',
      searched_in: ['gaming', 'collectibles']
    }
  }
}

// Insufficient funds
{
  success: false,
  error: {
    code: 'INSUFFICIENT_FUNDS',
    message: 'Not enough STEEM to complete transaction',
    details: {
      required: { amount: '25.000', currency: 'STEEM' },
      available: { amount: '10.500', currency: 'STEEM' },
      shortfall: { amount: '14.500', currency: 'STEEM' }
    }
  }
}

// Game compatibility error
{
  success: false,
  error: {
    code: 'VARIANT_NOT_COMPATIBLE',
    message: 'Cannot convert asset between incompatible games',
    details: {
      from_game: 'splinterlands',
      to_game: 'cryptobrewmaster',
      compatibility_score: 0,
      reason: 'Incompatible asset mechanics'
    }
  }
}
```

## Rate Limiting

### Rate Limit Structure

```typescript
interface RateLimit {
  // Per-method limits
  method_limits: {
    [method: string]: {
      requests_per_minute: number;
      burst_allowance: number;
    };
  };
  
  // User-based limits
  user_limits: {
    authenticated: {
      requests_per_minute: number;
      daily_limit: number;
    };
    unauthenticated: {
      requests_per_minute: number;
      daily_limit: number;
    };
  };
}

// Example rate limits
const rateLimits: RateLimit = {
  method_limits: {
    'getAssetsByDomain': { requests_per_minute: 30, burst_allowance: 10 },
    'getUserPortfolio': { requests_per_minute: 20, burst_allowance: 5 },
    'requestAssetMint': { requests_per_minute: 5, burst_allowance: 2 },
    'requestAssetTransfer': { requests_per_minute: 10, burst_allowance: 3 }
  },
  user_limits: {
    authenticated: { requests_per_minute: 100, daily_limit: 10000 },
    unauthenticated: { requests_per_minute: 20, daily_limit: 1000 }
  }
};
```

## Testing Examples

### Complete Asset Workflow Test

```typescript
// Test script for complete asset workflow
async function testCompleteAssetWorkflow() {
  console.log('Starting complete asset workflow test...');
  
  // 1. Mint a new asset
  console.log('Step 1: Minting asset...');
  await new Promise<void>((resolve, reject) => {
    window.steem_keychain.requestAssetMint({
      domain: 'gaming',
      game_id: 'test_game',
      asset_type: 'test_item',
      base_metadata: {
        name: 'Test Sword',
        description: 'A test sword for API testing',
        image_url: 'https://example.com/test_sword.png',
        core_attributes: { damage: 50, durability: 100 }
      },
      game_variant: {
        properties: { weapon_type: 'sword', rarity: 'common' }
      },
      minting_options: {
        quantity: 1,
        owner: 'test_user',
        tradeable: true,
        transferable: true
      }
    }, (response) => {
      if (response.success) {
        console.log('✓ Asset minted:', response.data.universal_id);
        window.testAssetId = response.data.universal_id;
        resolve();
      } else {
        console.error('✗ Minting failed:', response.error);
        reject(response.error);
      }
    });
  });
  
  // 2. Verify asset creation
  console.log('Step 2: Verifying asset...');
  await new Promise<void>((resolve, reject) => {
    window.steem_keychain.getAssetDetails(window.testAssetId, (response) => {
      if (response.success) {
        console.log('✓ Asset verified:', response.data.base_metadata.name);
        resolve();
      } else {
        console.error('✗ Verification failed:', response.error);
        reject(response.error);
      }
    });
  });
  
  // 3. List in portfolio
  console.log('Step 3: Checking portfolio...');
  await new Promise<void>((resolve, reject) => {
    window.steem_keychain.getUserPortfolio('test_user', {
      domains: ['gaming']
    }, (response) => {
      if (response.success) {
        const hasAsset = response.data.assets.some(
          asset => asset.universal_id === window.testAssetId
        );
        if (hasAsset) {
          console.log('✓ Asset found in portfolio');
          resolve();
        } else {
          console.error('✗ Asset not found in portfolio');
          reject(new Error('Asset not in portfolio'));
        }
      } else {
        console.error('✗ Portfolio check failed:', response.error);
        reject(response.error);
      }
    });
  });
  
  // 4. Transfer asset
  console.log('Step 4: Transferring asset...');
  await new Promise<void>((resolve, reject) => {
    window.steem_keychain.requestAssetTransfer({
      universal_id: window.testAssetId,
      from_user: 'test_user',
      to_user: 'test_user_2',
      transfer_type: 'gift',
      memo: 'Test transfer'
    }, (response) => {
      if (response.success) {
        console.log('✓ Asset transferred:', response.data.transaction_id);
        resolve();
      } else {
        console.error('✗ Transfer failed:', response.error);
        reject(response.error);
      }
    });
  });
  
  console.log('Complete asset workflow test finished successfully!');
}

// Run the test
testCompleteAssetWorkflow().catch(console.error);
```

## Integration Guidelines

### Best Practices

1. **Always handle errors gracefully**
   ```typescript
   window.steem_keychain.getAssetsByDomain('gaming', {}, (response) => {
     if (response.success) {
       // Handle success
       displayAssets(response.data);
     } else {
       // Handle error
       showErrorMessage(response.error.message);
       
       // Log technical details for debugging
       if (process.env.NODE_ENV === 'development') {
         console.error('API Error:', response.error);
       }
     }
   });
   ```

2. **Implement proper loading states**
   ```typescript
   const [loading, setLoading] = useState(false);
   const [assets, setAssets] = useState<UniversalAsset[]>([]);
   
   const loadAssets = () => {
     setLoading(true);
     window.steem_keychain.getAssetsByDomain('gaming', {}, (response) => {
       setLoading(false);
       if (response.success) {
         setAssets(response.data);
       }
     });
   };
   ```

3. **Use pagination for large datasets**
   ```typescript
   const loadAssetsPage = (page: number) => {
     window.steem_keychain.getAssetsByDomain('gaming', {
       page: page,
       limit: 20
     }, handleResponse);
   };
   ```

4. **Cache frequently accessed data**
   ```typescript
   const assetCache = new Map<string, UniversalAsset>();
   
   const getAssetWithCache = (universalId: string) => {
     if (assetCache.has(universalId)) {
       return Promise.resolve(assetCache.get(universalId));
     }
     
     return new Promise((resolve, reject) => {
       window.steem_keychain.getAssetDetails(universalId, (response) => {
         if (response.success) {
           assetCache.set(universalId, response.data);
           resolve(response.data);
         } else {
           reject(response.error);
         }
       });
     });
   };
   ```

This comprehensive API specification provides the foundation for implementing and using the Multi-Level Asset System across domains, games, and applications.