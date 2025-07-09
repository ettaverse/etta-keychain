import React, { useState, useEffect } from 'react';
import './App.css';
import LoginForm from './components/LoginForm';
import TransactionButtons from './components/TransactionButtons';
import ResponseDisplay from './components/ResponseDisplay';
import AssetBrowser from './components/assets/AssetBrowser';

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
              <section className="asset-section">
                <AssetBrowser 
                  username={currentUser}
                  onResponse={handleResponse}
                  onAssetSelect={(assets) => {
                    console.log('Selected assets for minting:', assets);
                  }}
                />
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
              <li><strong>⚙️ Transaction Testing:</strong> Use the transaction buttons to test various keychain operations</li>
              <li>Monitor responses in the display area below</li>
              <li>Check browser console for additional debugging information</li>
            </ol>
            
            <div className="feature-highlight">
              <h4>🚀 New: Web2-to-Web3 Asset Browser</h4>
              <p>The Asset Browser shows your Web2 assets (domains from 4ID.com, items from 4IR.network) that can be minted to the STEEM blockchain. This enables:</p>
              <ul>
                <li>✅ Preserving Web2 functionality while adding Web3 ownership proof</li>
                <li>✅ Cross-game asset conversion capabilities</li>
                <li>✅ Immutable ownership records on STEEM blockchain</li>
                <li>✅ Unified portfolio management across platforms</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
