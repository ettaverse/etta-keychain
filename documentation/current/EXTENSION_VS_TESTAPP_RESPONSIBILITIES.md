# Extension vs Test Application Responsibilities

## Overview

The Multi-Level Asset System is split between two main components:

1. **Etta Keychain Extension**: Handles blockchain operations, security, and core asset management
2. **Test Application**: Provides user interface, asset discovery, and testing functionality

This document defines the clear boundaries and responsibilities for each component.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Test Application                         │
├─────────────────────────────────────────────────────────────────┤
│ • Asset Browsing UI           • Domain/Game Navigation         │
│ • Portfolio Management        • Asset Trading Interface        │
│ • Cross-Game Visualization    • Testing & Demo Workflows       │
│ • Asset Discovery             • Game-Specific Rendering        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ window.steem_keychain API
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    Etta Keychain Extension                     │
├─────────────────────────────────────────────────────────────────┤
│ • Blockchain Operations       • Private Key Management         │
│ • Asset Registry              • Security & Authentication      │
│ • Custom JSON Operations      • Transaction Signing            │
│ • Asset Minting/Transfer      • Cross-Game Asset Linking       │
│ • Ownership Verification      • STEEM API Integration          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      STEEM Blockchain                          │
├─────────────────────────────────────────────────────────────────┤
│ • Asset Registry (Custom JSON)                                 │
│ • Ownership Records                                             │
│ • Transaction History                                           │
│ • Cross-Game Asset Links                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Extension Responsibilities

### 1. Blockchain Operations

The extension handles all direct blockchain interactions:

#### Asset Registry Management
```typescript
// Extension: Asset minting operation
interface MintAssetOperation {
  operation: 'mint_asset';
  universal_id: string;
  domain: string;
  game_id: string;
  asset_data: UniversalAsset;
  owner: string;
  signature: string;
}

// Extension method
async function mintAsset(assetData: MintAssetOperation): Promise<string> {
  // 1. Validate asset data
  // 2. Sign transaction with private key
  // 3. Submit to STEEM blockchain via custom JSON
  // 4. Return transaction ID
}
```

#### Asset Transfer Operations
```typescript
// Extension: Handle asset transfers
async function transferAsset(
  universalId: string,
  fromUser: string,
  toUser: string,
  gameContext?: string
): Promise<TransferResult> {
  // 1. Verify ownership
  // 2. Check transfer permissions
  // 3. Create transfer transaction
  // 4. Update asset registry
  // 5. Return transfer confirmation
}
```

#### Custom JSON Operations
```typescript
// Extension: Asset-related custom JSON operations
const assetOperations = {
  'asset_mint': handleAssetMint,
  'asset_transfer': handleAssetTransfer,
  'asset_convert': handleAssetConvert,
  'asset_update': handleAssetUpdate,
  'asset_burn': handleAssetBurn
};
```

### 2. Security & Authentication

#### Private Key Management
```typescript
// Extension: Secure key handling
interface KeyManagement {
  // Never expose private keys to test app
  signTransaction(tx: Transaction, keyType: KeyType): Promise<string>;
  verifyOwnership(username: string, assetId: string): Promise<boolean>;
  encryptData(data: string, recipient: string): Promise<string>;
}
```

#### Permission System
```typescript
// Extension: Asset operation permissions
interface AssetPermissions {
  canMint(domain: string, gameId: string): boolean;
  canTransfer(assetId: string, toUser: string): boolean;
  canConvert(assetId: string, targetGame: string): boolean;
  canBurn(assetId: string): boolean;
}
```

### 3. Core Asset Services

#### Asset Discovery Engine
```typescript
// Extension: Core asset queries
class AssetDiscoveryService {
  async getAssetsByDomain(domain: string, filters?: AssetFilters): Promise<UniversalAsset[]>;
  async getAssetsByGame(gameId: string, filters?: AssetFilters): Promise<UniversalAsset[]>;
  async getUserAssets(username: string, filters?: AssetFilters): Promise<UniversalAsset[]>;
  async findAssetVariants(universalId: string): Promise<AssetVariant[]>;
  async getAssetHistory(universalId: string): Promise<AssetTransaction[]>;
}
```

#### Cross-Game Compatibility
```typescript
// Extension: Asset conversion logic
class AssetCompatibilityService {
  async checkCompatibility(assetId: string, targetGame: string): Promise<CompatibilityResult>;
  async convertAsset(assetId: string, targetGame: string): Promise<ConversionResult>;
  async getConversionCost(assetId: string, targetGame: string): Promise<ConversionCost>;
}
```

### 4. STEEM API Integration

#### Blockchain Data Access
```typescript
// Extension: STEEM blockchain interface
class SteemAssetAPI {
  async getAssetRegistry(): Promise<AssetRegistry>;
  async queryAssetsByOwner(username: string): Promise<UniversalAsset[]>;
  async getAssetTransactionHistory(assetId: string): Promise<Transaction[]>;
  async validateAssetOwnership(assetId: string, owner: string): Promise<boolean>;
}
```

## Test Application Responsibilities

### 1. User Interface Components

#### Asset Browsing Interface
```typescript
// Test App: Asset browsing components
interface AssetBrowserProps {
  domain?: string;
  gameId?: string;
  assetType?: string;
  filters: AssetFilters;
  onAssetSelect: (asset: UniversalAsset) => void;
}

const AssetBrowser: React.FC<AssetBrowserProps> = ({...}) => {
  // 1. Display asset grid/list
  // 2. Handle filtering and search
  // 3. Show asset previews
  // 4. Navigate asset hierarchy
};
```

#### Domain/Game Navigation
```typescript
// Test App: Navigation components
const DomainSelector: React.FC = () => {
  // Show available domains (Gaming, Music, Collectibles)
};

const GameSelector: React.FC<{domain: string}> = ({domain}) => {
  // Show games within selected domain
};

const AssetTypeSelector: React.FC<{gameId: string}> = ({gameId}) => {
  // Show asset types within selected game
};
```

#### Asset Trading Interface
```typescript
// Test App: Trading components
const AssetTradingPanel: React.FC<{asset: UniversalAsset}> = ({asset}) => {
  // 1. Display asset details
  // 2. Show current price/value
  // 3. Handle buy/sell operations
  // 4. Show trading history
  // 5. Cross-game trading options
};
```

### 2. Asset Discovery & Display

#### Multi-Level Asset Browsing
```typescript
// Test App: Asset discovery interface
const AssetDiscovery: React.FC = () => {
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [currentGame, setCurrentGame] = useState<string>('');
  const [assets, setAssets] = useState<UniversalAsset[]>([]);

  // Navigation flow:
  // Domains → Games → Asset Types → Individual Assets
  
  const handleDomainSelect = async (domain: string) => {
    setCurrentDomain(domain);
    // Call extension API to get games in domain
    const games = await window.steem_keychain.getGamesInDomain(domain);
  };
  
  const handleGameSelect = async (gameId: string) => {
    setCurrentGame(gameId);
    // Call extension API to get assets in game
    const gameAssets = await window.steem_keychain.getAssetsByGame(gameId);
    setAssets(gameAssets);
  };
};
```

#### Game-Specific Asset Rendering
```typescript
// Test App: Game-specific asset display
const AssetRenderer: React.FC<{asset: UniversalAsset, gameContext: string}> = ({asset, gameContext}) => {
  const variant = asset.variants[gameContext];
  
  // Render asset based on game context:
  // - Splinterlands: Card layout with stats
  // - CryptoBrewMaster: Ingredient with brewing properties
  // - SteemMonsters: Creature with battle stats
  
  return (
    <div className={`asset-${gameContext}`}>
      {gameContext === 'splinterlands' && <SplinterlandsCard variant={variant} />}
      {gameContext === 'cryptobrewmaster' && <BrewingIngredient variant={variant} />}
      {gameContext === 'steemmonsters' && <BattleCreature variant={variant} />}
    </div>
  );
};
```

#### Cross-Game Variant Comparison
```typescript
// Test App: Compare asset across games
const AssetVariantComparison: React.FC<{asset: UniversalAsset}> = ({asset}) => {
  return (
    <div className="variant-comparison">
      <h3>{asset.base_metadata.name} Across Games</h3>
      {Object.entries(asset.variants).map(([gameId, variant]) => (
        <div key={gameId} className="variant-card">
          <h4>{variant.metadata.display_name}</h4>
          <AssetRenderer asset={asset} gameContext={gameId} />
          <div className="variant-stats">
            {Object.entries(variant.properties).map(([key, value]) => (
              <span key={key}>{key}: {value}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 3. Testing & Demonstration

#### Asset Operation Testing
```typescript
// Test App: Asset operation test interface
const AssetOperationTester: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const testAssetMinting = async () => {
    try {
      const result = await window.steem_keychain.requestCustomJson(
        'test_user',
        'asset_mint',
        'Posting',
        JSON.stringify({
          operation: 'mint_asset',
          domain: 'gaming',
          game_id: 'splinterlands',
          asset_data: {
            name: 'Test Fire Dragon',
            // ... asset properties
          }
        }),
        'Test Asset Minting'
      );
      
      setTestResults(prev => [...prev, {
        operation: 'mint_asset',
        success: result.success,
        data: result
      }]);
    } catch (error) {
      // Handle error
    }
  };

  const testAssetTransfer = async () => {
    // Test asset transfer between users
  };

  const testCrossGameConversion = async () => {
    // Test converting asset between games
  };

  return (
    <div className="operation-tester">
      <button onClick={testAssetMinting}>Test Asset Minting</button>
      <button onClick={testAssetTransfer}>Test Asset Transfer</button>
      <button onClick={testCrossGameConversion}>Test Cross-Game Conversion</button>
      
      <div className="test-results">
        {testResults.map((result, index) => (
          <div key={index} className={`result ${result.success ? 'success' : 'error'}`}>
            <strong>{result.operation}</strong>: {result.success ? 'PASSED' : 'FAILED'}
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### Portfolio Management Interface
```typescript
// Test App: User portfolio management
const UserPortfolio: React.FC<{username: string}> = ({username}) => {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  
  useEffect(() => {
    loadUserPortfolio();
  }, [username]);

  const loadUserPortfolio = async () => {
    const portfolioData = await window.steem_keychain.getUserPortfolio(username, {
      group_by: 'domain'
    });
    setPortfolio(portfolioData);
  };

  const handleAssetTransfer = async (assetId: string, toUser: string) => {
    // Call extension to transfer asset
    await window.steem_keychain.requestAssetTransfer(assetId, username, toUser);
    // Reload portfolio
    loadUserPortfolio();
  };

  return (
    <div className="user-portfolio">
      <h2>{username}'s Asset Portfolio</h2>
      
      {portfolio?.grouped_results && Object.entries(portfolio.grouped_results).map(([domain, assets]) => (
        <div key={domain} className="domain-section">
          <h3>{domain} Assets</h3>
          <div className="asset-grid">
            {assets.map(asset => (
              <AssetCard 
                key={asset.universal_id} 
                asset={asset}
                onTransfer={handleAssetTransfer}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Communication Interface (window.steem_keychain API)

### Asset-Specific API Methods

The test application communicates with the extension through extended API methods:

```typescript
interface SteemKeychainAssetAPI {
  // Asset Discovery
  getAssetsByDomain(domain: string, callback: (response: any) => void): void;
  getAssetsByGame(gameId: string, callback: (response: any) => void): void;
  getUserAssets(username: string, filters: any, callback: (response: any) => void): void;
  findAssetVariants(universalId: string, callback: (response: any) => void): void;
  
  // Asset Operations
  requestAssetMint(assetData: any, callback: (response: any) => void): void;
  requestAssetTransfer(assetId: string, fromUser: string, toUser: string, callback: (response: any) => void): void;
  requestAssetConvert(assetId: string, targetGame: string, callback: (response: any) => void): void;
  
  // Portfolio Management
  getUserPortfolio(username: string, filters: any, callback: (response: any) => void): void;
  getAssetHistory(assetId: string, callback: (response: any) => void): void;
  
  // Cross-Game Operations
  checkAssetCompatibility(assetId: string, targetGame: string, callback: (response: any) => void): void;
  getConversionCost(assetId: string, targetGame: string, callback: (response: any) => void): void;
}
```

### Message Flow Examples

#### Asset Minting Flow
```
Test App                     Extension                    STEEM Blockchain
    |                           |                              |
    | requestAssetMint()        |                              |
    |-------------------------->|                              |
    |                           | 1. Validate asset data       |
    |                           | 2. Sign transaction          |
    |                           |                              |
    |                           | Custom JSON: asset_mint      |
    |                           |----------------------------->|
    |                           |                              |
    |                           | Transaction confirmed        |
    |                           |<-----------------------------|
    | callback(success)         |                              |
    |<--------------------------|                              |
```

#### Asset Discovery Flow
```
Test App                     Extension                    STEEM Blockchain
    |                           |                              |
    | getAssetsByGame()         |                              |
    |-------------------------->|                              |
    |                           | Query asset registry         |
    |                           |----------------------------->|
    |                           |                              |
    |                           | Asset data                   |
    |                           |<-----------------------------|
    |                           | 1. Filter by game            |
    |                           | 2. Format response           |
    | callback(assets)          |                              |
    |<--------------------------|                              |
```

## Data Flow Architecture

### Asset Data Storage

#### Extension-Side Storage
```typescript
// Extension: Local asset cache
interface AssetCache {
  assets: Map<string, UniversalAsset>;        // Cached asset data
  userPortfolios: Map<string, PortfolioData>; // User asset lists
  gameRegistry: Map<string, GameInfo>;        // Game information
  lastSync: number;                           // Last blockchain sync
}

// Extension: Sync with blockchain
class AssetSyncService {
  async syncAssetRegistry(): Promise<void> {
    // 1. Query STEEM blockchain for asset updates
    // 2. Update local cache
    // 3. Notify test app of changes
  }
}
```

#### Test App-Side Storage
```typescript
// Test App: UI state management
interface AssetUIState {
  currentDomain: string;
  currentGame: string;
  selectedAssets: UniversalAsset[];
  portfolioData: PortfolioData | null;
  tradingActivity: TradingRecord[];
}

// Test App: No sensitive data stored locally
// All asset operations go through extension
```

## Security Boundaries

### What Extension NEVER Exposes
- Private keys or mnemonics
- Direct blockchain API credentials
- Unsigned transaction data
- Internal security configurations

### What Test App NEVER Handles
- Private key operations
- Direct blockchain writes
- Transaction signing
- Security-sensitive validations

### Safe Communication
- All sensitive operations use callback pattern
- Extension validates all requests
- Test app receives only public data
- User must approve all transactions

## Error Handling Strategy

### Extension Error Handling
```typescript
// Extension: Comprehensive error handling
interface AssetOperationError {
  code: 'INSUFFICIENT_FUNDS' | 'INVALID_ASSET' | 'UNAUTHORIZED' | 'NETWORK_ERROR';
  message: string;
  details?: any;
}

async function handleAssetOperation(operation: AssetOperation): Promise<OperationResult> {
  try {
    // Execute operation
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: {
        code: determineErrorCode(error),
        message: error.message,
        details: error.stack
      }
    };
  }
}
```

### Test App Error Display
```typescript
// Test App: User-friendly error display
const ErrorDisplay: React.FC<{error: AssetOperationError}> = ({error}) => {
  const userMessage = {
    'INSUFFICIENT_FUNDS': 'Not enough STEEM to complete this operation',
    'INVALID_ASSET': 'This asset cannot be processed',
    'UNAUTHORIZED': 'You do not have permission for this operation',
    'NETWORK_ERROR': 'Network connection problem - please try again'
  };

  return (
    <div className="error-message">
      <strong>Operation Failed:</strong> {userMessage[error.code]}
      {process.env.NODE_ENV === 'development' && (
        <details>
          <summary>Technical Details</summary>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};
```

## Performance Considerations

### Extension Optimization
- Cache frequently accessed assets
- Batch blockchain queries
- Use background sync for updates
- Implement request queuing

### Test App Optimization
- Virtual scrolling for large asset lists
- Lazy loading of asset images
- Debounced search inputs
- Efficient state management

## Testing Strategy

### Extension Testing
- Unit tests for asset operations
- Mock blockchain responses
- Security validation tests
- Error handling coverage

### Test App Testing
- Component rendering tests
- User interaction tests
- API integration tests
- Error state handling

### Integration Testing
- End-to-end asset workflows
- Cross-component communication
- Error recovery scenarios
- Performance under load

---

This document defines the clear separation of responsibilities between the extension and test application, ensuring security, maintainability, and scalability of the multi-level asset system.