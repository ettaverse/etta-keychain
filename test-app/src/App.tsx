import React, { useState, useEffect } from 'react';
import './App.css';
import LoginForm from './components/LoginForm';
import TransactionButtons from './components/TransactionButtons';
import ResponseDisplay from './components/ResponseDisplay';

interface ResponseItem {
  operation: string;
  response: any;
  timestamp: string;
}

declare global {
  interface Window {
    steem_keychain?: any;
  }
}

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
            <section className="testing-section">
              <TransactionButtons 
                username={currentUser}
                onResponse={handleResponse}
              />
            </section>
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
              <li>Use the transaction buttons to test various keychain operations</li>
              <li>Monitor responses in the display area below</li>
              <li>Check browser console for additional debugging information</li>
            </ol>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
