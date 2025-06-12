import React, { useState } from 'react';

interface LoginFormProps {
  onLogin: (username: string) => void;
  onResponse: (operation: string, response: any) => void;
  isLoggedIn: boolean;
  currentUser?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onResponse, isLoggedIn, currentUser }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleKeychainLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setIsLoading(true);

    if (!window.steem_keychain) {
      onResponse('Login', { 
        error: 'Steem Keychain extension not found. Please install the extension first.' 
      });
      setIsLoading(false);
      return;
    }

    // Use requestHandshake for authentication
    window.steem_keychain.requestHandshake((response: any) => {
      // Handle undefined or null response
      const safeResponse = response || { error: 'No response from extension' };
      onResponse('Handshake', safeResponse);
      
      if (safeResponse && safeResponse.success) {
        // Check if username is in the accounts list from handshake
        if (safeResponse.data && safeResponse.data.accounts) {
          const accounts = safeResponse.data.accounts;
          if (accounts.includes(username)) {
            onResponse('Account Verification', { 
              success: true, 
              message: `Account ${username} found in keychain`,
              accounts: accounts 
            });
            onLogin(username);
          } else {
            onResponse('Account Verification', { 
              success: false, 
              error: `Account ${username} not found in keychain. Available accounts: ${accounts.join(', ')}` 
            });
          }
        } else {
          onResponse('Account Verification', { 
            success: false, 
            error: 'No accounts data returned from handshake' 
          });
        }
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });
  };

  const handleManualAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    if (!window.steem_keychain) {
      onResponse('Login', { 
        error: 'Extension not available' 
      });
      return;
    }

    // Request signing a message to verify account ownership
    window.steem_keychain.requestSignBuffer(
      username,
      'Login verification for keychain testing app',
      'Posting',
      (response: any) => {
        const safeResponse = response || { error: 'No response from sign buffer request' };
        onResponse('Manual Login', safeResponse);
        
        if (safeResponse && safeResponse.success) {
          onLogin(username);
        }
      }
    );
  };

  if (isLoggedIn) {
    return (
      <div className="login-status">
        <h3>✅ Authenticated as: {currentUser}</h3>
        <p>Keychain extension ready for testing</p>
        <button 
          onClick={() => window.location.reload()} 
          className="logout-btn"
        >
          Reset Session
        </button>
      </div>
    );
  }

  return (
    <div className="login-form">
      <h2>Keychain Authentication Test</h2>
      <p>Test real authentication with the Steem Keychain extension</p>
      
      <form onSubmit={handleKeychainLogin}>
        <div className="form-group">
          <label htmlFor="username">Steem Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your Steem username"
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="button-group">
          <button 
            type="submit" 
            className="login-btn" 
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Authenticate with Keychain'}
          </button>
          
          <button 
            type="button" 
            onClick={handleManualAuth}
            className="secondary-btn"
            disabled={isLoading}
          >
            Sign Message Auth
          </button>
        </div>
      </form>
      
      <div className="auth-info">
        <h4>Authentication Methods:</h4>
        <ul>
          <li><strong>Authenticate with Keychain</strong>: Uses handshake + key verification</li>
          <li><strong>Sign Message Auth</strong>: Requests message signing for verification</li>
        </ul>
      </div>
    </div>
  );
};

export default LoginForm;