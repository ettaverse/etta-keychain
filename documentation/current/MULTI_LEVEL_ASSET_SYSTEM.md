# Multi-Level Asset System Documentation

## Overview

The Multi-Level Asset System enables Web2 to Web3 asset bridging across multiple domains, games, and applications on the STEEM blockchain. This system allows the same universal asset (like "Fire Dragon") to exist with different properties and behaviors across various games while maintaining a unified identity on the blockchain.

## Architecture

### Hierarchical Structure

```
Domain (e.g., Gaming, Music, Collectibles)
├── Game/App (e.g., Splinterlands, CryptoBrewMaster)
│   ├── Asset Type (e.g., Card, Ingredient, Creature)
│   │   ├── Universal Asset (Fire Dragon #001)
│   │   │   ├── Game-Specific Variant A
│   │   │   ├── Game-Specific Variant B
│   │   │   └── Game-Specific Variant C
```

### Example Structure

```
Gaming Domain
├── Splinterlands
│   ├── Cards
│   │   ├── Fire Dragon #001 (Card variant)
│   │   └── Lightning Bolt #002 (Card variant)
│   └── Items
│       └── Legendary Sword #003
├── CryptoBrewMaster
│   ├── Ingredients
│   │   ├── Fire Dragon #001 (Ingredient variant)
│   │   └── Magic Hops #004
│   └── Equipment
│       └── Brewing Cauldron #005
└── SteemMonsters
    ├── Creatures
    │   ├── Fire Dragon #001 (Creature variant)
    │   └── Ice Phoenix #006
    └── Spells
        └── Fireball #007

Music Domain
├── DSound
│   ├── Beats
│   └── Samples
├── SteemMusic
│   ├── Songs
│   └── Albums
└── MusicProducer
    ├── Licenses
    └── Services

Collectibles Domain
├── SteemArt
│   ├── Digital Art
│   └── Photography
├── TradingCards
│   ├── Sports Cards
│   └── Gaming Cards
└── Memorabilia
    ├── Autographs
    └── Historical Items
```

## System Components

### Extension Responsibilities

The Etta Keychain extension handles:

1. **Blockchain Operations**
   - Asset minting transactions
   - Asset transfer operations
   - Ownership verification
   - Custom JSON operations for asset management

2. **Security & Authentication**
   - Private key management
   - Transaction signing
   - User authentication
   - Permission handling

3. **Core Asset Services**
   - Asset creation/minting
   - Asset ownership queries
   - Cross-game asset linking
   - Universal asset ID management

### Test Application Responsibilities

The test application provides:

1. **User Interface**
   - Asset browsing and discovery
   - Domain/game selection
   - Asset trading interface
   - Portfolio management

2. **Asset Discovery & Display**
   - Multi-level asset browsing
   - Game-specific asset rendering
   - Cross-game variant comparison
   - Asset metadata display

3. **Testing & Demonstration**
   - Asset operation testing
   - Cross-game functionality demos
   - API integration examples
   - User workflow testing

## Asset Data Structure

### Universal Asset Schema

```typescript
interface UniversalAsset {
  // Universal Identifiers
  universal_id: string;          // e.g., "fire_dragon_001"
  domain: string;                // e.g., "gaming"
  
  // Core Properties (shared across all variants)
  base_metadata: {
    name: string;
    description: string;
    image_url: string;
    core_attributes: Record<string, any>;
    creation_date: string;
    creator: string;
  };
  
  // Web2 Integration
  web2_links: {
    source_system: string;       // Original Web2 system
    source_id: string;           // Web2 database ID
    sync_status: "synced" | "pending" | "error";
  };
  
  // Game/App Variants
  variants: Record<string, GameVariant>;
  
  // Ownership & Trading
  current_owner: string;
  trading_enabled: boolean;
  transfer_history: TransferRecord[];
}

interface GameVariant {
  game_id: string;               // e.g., "splinterlands"
  asset_type: string;            // e.g., "card", "ingredient", "creature"
  
  // Game-specific properties
  properties: Record<string, any>;
  
  // Game-specific metadata
  metadata: {
    display_name?: string;       // Game-specific name
    description?: string;        // Game-specific description
    image_url?: string;          // Game-specific image
    rarity?: string;
    category?: string;
  };
  
  // Game mechanics
  mechanics: {
    usable_in: string[];         // Game modes where asset can be used
    abilities?: string[];        // Special abilities in this game
    restrictions?: string[];     // Usage restrictions
  };
}
```

### Example: Fire Dragon Asset

```typescript
const fireDragonAsset: UniversalAsset = {
  universal_id: "fire_dragon_001",
  domain: "gaming",
  
  base_metadata: {
    name: "Fire Dragon",
    description: "A legendary fire-breathing dragon",
    image_url: "https://assets.steem.com/dragons/fire_dragon_base.png",
    core_attributes: {
      element: "fire",
      rarity: "legendary",
      power_level: 95
    },
    creation_date: "2024-01-15T10:00:00Z",
    creator: "dragon_creator"
  },
  
  web2_links: {
    source_system: "legacy_game_db",
    source_id: "dragon_12345",
    sync_status: "synced"
  },
  
  variants: {
    "splinterlands": {
      game_id: "splinterlands",
      asset_type: "card",
      properties: {
        mana_cost: 7,
        attack: 8,
        health: 6,
        armor: 2,
        speed: 4
      },
      metadata: {
        display_name: "Fire Dragon Card",
        rarity: "legendary",
        category: "monster"
      },
      mechanics: {
        usable_in: ["ranked_battles", "tournaments"],
        abilities: ["Flying", "Blast", "Scorch"],
        restrictions: ["fire_splinter_only"]
      }
    },
    
    "cryptobrewmaster": {
      game_id: "cryptobrewmaster",
      asset_type: "ingredient",
      properties: {
        brewing_power: 95,
        flavor_profile: "spicy_heat",
        alcohol_boost: 0.3,
        rarity_modifier: 2.5
      },
      metadata: {
        display_name: "Dragon Fire Extract",
        rarity: "mythic",
        category: "special_ingredient"
      },
      mechanics: {
        usable_in: ["beer_brewing", "special_recipes"],
        abilities: ["heat_boost", "flavor_enhance"],
        restrictions: ["max_one_per_recipe"]
      }
    },
    
    "steemmonsters": {
      game_id: "steemmonsters",
      asset_type: "creature",
      properties: {
        attack_power: 100,
        defense: 80,
        speed: 60,
        magic_resistance: 40,
        level: 1
      },
      metadata: {
        display_name: "Ancient Fire Dragon",
        rarity: "epic",
        category: "dragon"
      },
      mechanics: {
        usable_in: ["pvp_battles", "pve_dungeons"],
        abilities: ["Fire_Breath", "Dragon_Roar", "Wing_Attack"],
        restrictions: ["fire_team_only", "level_requirement_20"]
      }
    }
  },
  
  current_owner: "player123",
  trading_enabled: true,
  transfer_history: [
    {
      from: "dragon_creator",
      to: "player123",
      timestamp: "2024-01-15T12:00:00Z",
      transaction_id: "abc123",
      price: { amount: "50.000", currency: "STEEM" }
    }
  ]
};
```

## API Specifications

### Asset Discovery APIs

#### Get Assets by Domain
```typescript
interface GetAssetsByDomainRequest {
  domain: string;
  filters?: {
    rarity?: string[];
    creator?: string;
    date_range?: { from: string; to: string };
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

interface GetAssetsByDomainResponse {
  assets: UniversalAsset[];
  total_count: number;
  page_info: {
    current_page: number;
    total_pages: number;
    has_next: boolean;
  };
}
```

#### Get Assets by Game
```typescript
interface GetAssetsByGameRequest {
  domain: string;
  game_id: string;
  asset_type?: string;
  filters?: {
    rarity?: string[];
    usable_in?: string[];
    owner?: string;
  };
  pagination?: {
    page: number;
    limit: number;
  };
}
```

#### Find Asset Variants
```typescript
interface FindAssetVariantsRequest {
  universal_id: string;
  include_games?: string[];  // Filter specific games
}

interface FindAssetVariantsResponse {
  universal_asset: UniversalAsset;
  available_variants: {
    game_id: string;
    variant: GameVariant;
    compatibility_score: number;  // 0-1 scale
  }[];
  cross_game_opportunities: {
    source_game: string;
    target_game: string;
    conversion_available: boolean;
    conversion_cost?: { amount: string; currency: string };
  }[];
}
```

#### Get User Portfolio
```typescript
interface GetUserPortfolioRequest {
  username: string;
  filters?: {
    domain?: string;
    game_id?: string;
    asset_type?: string;
    rarity?: string[];
  };
  group_by?: "domain" | "game" | "asset_type" | "none";
  pagination?: {
    page: number;
    limit: number;
  };
}

interface GetUserPortfolioResponse {
  assets: UniversalAsset[];
  summary: {
    total_assets: number;
    domains: Record<string, number>;
    games: Record<string, number>;
    total_value?: { amount: string; currency: string };
  };
  grouped_results?: Record<string, UniversalAsset[]>;
}
```

### Asset Operations APIs

#### Mint New Asset
```typescript
interface MintAssetRequest {
  domain: string;
  game_id: string;
  asset_type: string;
  
  base_metadata: {
    name: string;
    description: string;
    image_url: string;
    core_attributes: Record<string, any>;
  };
  
  game_variant: GameVariant;
  
  web2_integration?: {
    source_system: string;
    source_id: string;
  };
  
  minting_options: {
    quantity: number;
    owner: string;
    tradeable: boolean;
    royalty_percentage?: number;
  };
}
```

#### Transfer Asset
```typescript
interface TransferAssetRequest {
  universal_id: string;
  from_user: string;
  to_user: string;
  game_context?: string;  // Which game variant to transfer
  price?: { amount: string; currency: string };
  memo?: string;
}
```

#### Convert Asset Between Games
```typescript
interface ConvertAssetRequest {
  universal_id: string;
  from_game: string;
  to_game: string;
  conversion_options?: Record<string, any>;
  owner: string;
}

interface ConvertAssetResponse {
  success: boolean;
  new_variant: GameVariant;
  conversion_cost?: { amount: string; currency: string };
  restrictions_applied?: string[];
}
```

## Cross-Game Interoperability

### Asset Compatibility Matrix

```typescript
interface CompatibilityMatrix {
  [sourceGame: string]: {
    [targetGame: string]: {
      compatible: boolean;
      conversion_rate: number;      // 0-1 scale
      conversion_cost?: { amount: string; currency: string };
      property_mapping: Record<string, string>;
      restrictions: string[];
    };
  };
}

// Example compatibility
const compatibilityMatrix: CompatibilityMatrix = {
  "splinterlands": {
    "steemmonsters": {
      compatible: true,
      conversion_rate: 0.9,
      conversion_cost: { amount: "1.000", currency: "STEEM" },
      property_mapping: {
        "attack": "attack_power",
        "health": "defense",
        "speed": "speed"
      },
      restrictions: ["level_reset", "ability_remapping"]
    },
    "cryptobrewmaster": {
      compatible: false,
      conversion_rate: 0,
      property_mapping: {},
      restrictions: ["incompatible_mechanics"]
    }
  }
};
```

### Cross-Game Trading

Assets can be traded across games with automatic conversion:

1. **Direct Trading**: Trade Fire Dragon card (Splinterlands) for Lightning Phoenix creature (SteemMonsters)
2. **Universal Marketplace**: List assets with game-specific variants visible
3. **Cross-Game Bundles**: Package related assets from different games
4. **Game Migration**: Move entire asset collection between compatible games

## Blockchain Storage Strategy

### STEEM Custom JSON Structure

Assets are stored using STEEM custom JSON operations:

```json
{
  "id": "asset_registry",
  "json": {
    "operation": "mint_asset",
    "universal_id": "fire_dragon_001",
    "domain": "gaming",
    "asset_data": {
      "base_metadata": {...},
      "variants": {...},
      "web2_links": {...},
      "ownership": {...}
    },
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### Asset Registry Operations

1. **mint_asset**: Create new universal asset
2. **add_variant**: Add game variant to existing asset
3. **transfer_asset**: Change ownership
4. **update_metadata**: Modify asset properties
5. **convert_asset**: Convert between game variants
6. **burn_asset**: Remove asset from circulation

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create asset data structures and interfaces
- [ ] Implement basic asset registry operations
- [ ] Set up blockchain storage mechanisms
- [ ] Create asset discovery APIs

### Phase 2: Core Operations (Week 3-4)
- [ ] Implement asset minting functionality
- [ ] Add asset transfer operations
- [ ] Create asset query and discovery system
- [ ] Build user portfolio management

### Phase 3: Multi-Game Support (Week 5-6)
- [ ] Implement game variant system
- [ ] Add cross-game compatibility matrix
- [ ] Create asset conversion mechanisms
- [ ] Build game-specific asset rendering

### Phase 4: UI Implementation (Week 7-8)
- [ ] Create asset browsing interface
- [ ] Implement domain/game navigation
- [ ] Add asset trading UI
- [ ] Build portfolio management interface

### Phase 5: Integration & Testing (Week 9-10)
- [ ] Integrate with test application
- [ ] Add comprehensive testing
- [ ] Performance optimization
- [ ] Documentation updates

## Testing Strategy

### Unit Tests
- Asset data structure validation
- API endpoint functionality
- Cross-game compatibility logic
- Blockchain operation handling

### Integration Tests
- End-to-end asset creation flow
- Cross-game asset conversion
- User portfolio management
- Asset trading workflows

### Demo Scenarios
- Create Fire Dragon in Splinterlands
- Convert to CryptoBrewMaster ingredient
- Trade across different games
- Display asset in multiple contexts

## Security Considerations

1. **Asset Ownership**: Cryptographic proof of ownership
2. **Transfer Validation**: Multi-signature requirements
3. **Game Integration**: Secure API authentication
4. **Data Integrity**: Blockchain-based audit trail
5. **Cross-Game Security**: Validated conversion rules

## Future Extensions

1. **Asset Lending**: Temporary asset transfers
2. **Fractional Ownership**: Shared asset ownership
3. **Asset Staking**: Lock assets for rewards
4. **Cross-Chain Integration**: Bridge to other blockchains
5. **AI-Powered Recommendations**: Suggest asset conversions

---

This documentation provides the foundation for implementing a comprehensive multi-level asset system that bridges Web2 and Web3, enabling true cross-game asset interoperability on the STEEM blockchain.