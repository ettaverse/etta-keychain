import React, { useState, useEffect } from 'react';
import './App.css';
import LoginForm from './components/LoginForm';
import TransactionButtons from './components/TransactionButtons';
import ResponseDisplay from './components/ResponseDisplay';
import AssetBrowser from './components/assets/AssetBrowser';
import PortfolioDashboard from './components/portfolio/PortfolioDashboard';
import AssetMintTester from './components/operations/AssetMintTester';
import AssetTransferTester from './components/operations/AssetTransferTester';

interface ResponseItem {
  operation: string;
  response: any;
  timestamp: string;
}

// Remove duplicate global declaration - it's already in the main project

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [activeTab, setActiveTab] = useState<'browser' | 'portfolio' | 'mint' | 'transfer'>('browser');
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [selectedPortfolioAssets, setSelectedPortfolioAssets] = useState<any[]>([]);

  useEffect(() => {
    // Check if extension is available
    const checkExtension = () => {
      setExtensionDetected(!!window.steem_keychain);
    };

    checkExtension();
    
    // Check periodically in case extension loads after the page
    const interval = setInterval(checkExtension, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (username: string) => {
    // Real keychain authentication successful
    setIsLoggedIn(true);
    setCurrentUser(username);
    
    // Add login success response
    const loginResponse = {
      operation: 'Authentication Success',
      response: { 
        success: true, 
        message: 'Successfully authenticated with Steem Keychain',
        username: username 
      },
      timestamp: new Date().toLocaleTimeString()
    };
    
    setResponses(prev => [loginResponse, ...prev]);
  };

  const handleResponse = (operation: string, response: any) => {
    const responseItem: ResponseItem = {
      operation,
      response,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setResponses(prev => [responseItem, ...prev]);
  };

  const clearResponses = () => {
    setResponses([]);
  };

  // Asset selection handlers
  const handleAssetSelect = (assets: any[]) => {
    setSelectedAssets(assets);
    handleResponse('Asset Selection', {
      message: `Selected ${assets.length} assets for operations`,
      assets: assets.map(a => a.name || a.base_metadata?.name)
    });
  };

  // Portfolio handlers
  const handlePortfolioAssetSelect = (asset: any) => {
    setSelectedPortfolioAssets([asset]);
    setActiveTab('transfer');
    handleResponse('Portfolio Asset Selected', {
      message: 'Asset selected from portfolio for transfer',
      asset: asset.base_metadata?.name || asset.name
    });
  };

  const handleBatchPortfolioSelect = (assets: any[]) => {
    setSelectedPortfolioAssets(assets);
    handleResponse('Portfolio Batch Selection', {
      message: `Selected ${assets.length} assets from portfolio`,
      assets: assets.map(a => a.base_metadata?.name || a.name)
    });
  };

  const handleMintAssets = (assets: any[]) => {
    setSelectedAssets(assets);
    setActiveTab('mint');
    handleResponse('Portfolio Mint Request', {
      message: `Redirecting to mint ${assets.length} assets`,
      assets: assets.map(a => a.base_metadata?.name || a.name)
    });
  };

  const handleTransferAsset = (asset: any) => {
    setSelectedPortfolioAssets([asset]);
    setActiveTab('transfer');
    handleResponse('Portfolio Transfer Request', {
      message: 'Redirecting to transfer asset',
      asset: asset.base_metadata?.name || asset.name
    });
  };

  const handleViewAssetDetails = (asset: any) => {
    handleResponse('Asset Details View', {
      message: 'Viewing asset details',
      asset: asset.base_metadata?.name || asset.name,
      details: asset
    });
  };

  const handlePortfolioRefresh = () => {
    handleResponse('Portfolio Refresh', {
      message: 'Refreshing portfolio data...'
    });
  };

  // Operations completion handlers
  const handleMintComplete = (results: any[]) => {
    handleResponse('Mint Operations Complete', {
      message: `Completed minting ${results.length} assets`,
      results: results
    });
    // Optionally switch back to portfolio to see results
    setTimeout(() => setActiveTab('portfolio'), 2000);
  };

  const handleTransferComplete = (results: any[]) => {
    handleResponse('Transfer Operations Complete', {
      message: `Completed transferring ${results.length} assets`,
      results: results
    });
    // Optionally switch back to portfolio
    setTimeout(() => setActiveTab('portfolio'), 2000);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔐 Steem Keychain Testing App</h1>
        <div className="extension-status">
          {extensionDetected ? (
            <span className="status-ok">✅ Extension Detected</span>
          ) : (
            <span className="status-error">❌ Extension Not Found</span>
          )}
        </div>
      </header>

      <main className="App-main">
        <div className="container">
          <section className="login-section">
            <LoginForm 
              onLogin={handleLogin}
              onResponse={handleResponse}
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
            />
          </section>

          {isLoggedIn && (
            <>
              {/* Navigation Tabs */}
              <section className="navigation-tabs">
                <div className="tab-container">
                  <button 
                    className={`tab-button ${activeTab === 'browser' ? 'active' : ''}`}
                    onClick={() => setActiveTab('browser')}
                  >
                    🔍 Asset Browser
                  </button>
                  <button 
                    className={`tab-button ${activeTab === 'portfolio' ? 'active' : ''}`}
                    onClick={() => setActiveTab('portfolio')}
                  >
                    📊 Portfolio
                  </button>
                  <button 
                    className={`tab-button ${activeTab === 'mint' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mint')}
                  >
                    🪙 Mint Tester
                  </button>
                  <button 
                    className={`tab-button ${activeTab === 'transfer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transfer')}
                  >
                    📤 Transfer Tester
                  </button>
                </div>
              </section>

              {/* Tab Content */}
              <section className="tab-content">
                {activeTab === 'browser' && (
                  <AssetBrowser 
                    username={currentUser}
                    onResponse={handleResponse}
                    onAssetSelect={handleAssetSelect}
                  />
                )}

                {activeTab === 'portfolio' && (
                  <PortfolioDashboard
                    username={currentUser}
                    onAssetSelect={handlePortfolioAssetSelect}
                    onBatchSelect={handleBatchPortfolioSelect}
                    onMintAssets={handleMintAssets}
                    onTransferAsset={handleTransferAsset}
                    onViewAssetDetails={handleViewAssetDetails}
                    onRefresh={handlePortfolioRefresh}
                  />
                )}

                {activeTab === 'mint' && (
                  <AssetMintTester
                    selectedAssets={selectedAssets}
                    username={currentUser}
                    onResponse={handleResponse}
                    onMintComplete={handleMintComplete}
                  />
                )}

                {activeTab === 'transfer' && (
                  <AssetTransferTester
                    selectedAssets={selectedPortfolioAssets}
                    username={currentUser}
                    onResponse={handleResponse}
                    onTransferComplete={handleTransferComplete}
                  />
                )}
              </section>
              
              <section className="testing-section">
                <TransactionButtons 
                  username={currentUser}
                  onResponse={handleResponse}
                />
              </section>
            </>
          )}

          <section className="response-section">
            <ResponseDisplay 
              responses={responses}
              onClear={clearResponses}
            />
          </section>

          <section className="instructions">
            <h3>Instructions</h3>
            <ol>
              <li>Make sure the Etta Keychain extension is installed and loaded</li>
              <li>Enter a username and password to simulate login</li>
              <li><strong>🔍 Asset Browser:</strong> Discover and select Web2 assets ready for blockchain minting</li>
              <li><strong>📊 Portfolio:</strong> View your complete asset portfolio with filtering and management tools</li>
              <li><strong>🪙 Mint Tester:</strong> Test minting operations on selected assets via extension</li>
              <li><strong>📤 Transfer Tester:</strong> Test asset transfers (gift, sale, trade, conversion) via extension</li>
              <li><strong>⚙️ Transaction Testing:</strong> Use the transaction buttons to test various keychain operations</li>
              <li>Monitor responses in the display area below</li>
              <li>Check browser console for additional debugging information</li>
            </ol>
            
            <div className="feature-highlight">
              <h4>🚀 Comprehensive Testing Suite</h4>
              <p>This testing app provides a full workflow for Web2-to-Web3 asset management:</p>
              <ul>
                <li>✅ <strong>Asset Discovery:</strong> Browse Web2 assets from various platforms</li>
                <li>✅ <strong>Portfolio Management:</strong> View, filter, and manage all your assets</li>
                <li>✅ <strong>Minting Operations:</strong> Test converting Web2 assets to blockchain tokens</li>
                <li>✅ <strong>Transfer Operations:</strong> Test all types of asset transfers and sales</li>
                <li>✅ <strong>Cross-Platform Integration:</strong> Unified experience across gaming and domain platforms</li>
                <li>✅ <strong>Extension Testing:</strong> Validate browser extension communication and security</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
