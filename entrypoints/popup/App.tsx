import React, { useState, useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { PasswordSetup } from './components/PasswordSetup';
import { UnlockScreen } from './components/UnlockScreen';
import { AccountList } from './components/AccountList';
import { AccountImportForm } from './components/AccountImportForm';
import { AccountConnection } from './pages/AccountConnection';
import { AccountDetails } from './pages/AccountDetails';
import { AuthorizationManager } from './components/AuthorizationManager';
import { Button } from '@/components/ui/button';
import { browser } from 'wxt/browser';

type AuthState = 'loading' | 'setup' | 'locked' | 'unlocked';

function AccountsPage({ onLock }: { onLock: () => void }) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-[500px] w-[380px] bg-background">
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Etta Keychain</h1>
            <p className="text-sm text-muted-foreground">Secure STEEM wallet</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/authorizations')} className="text-xs">
              Auth
            </Button>
            <Button variant="outline" size="sm" onClick={onLock} className="text-xs">
              Lock
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4">
        <AccountList onAddAccount={() => navigate('/connection')} />
      </div>
    </div>
  );
}

function ConnectionPage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-[400px] w-[350px]">
      <AccountConnection 
        onBack={() => navigate('/accounts')}
        onImportAccount={() => navigate('/import')}
      />
    </div>
  );
}

function ImportPage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-[400px] w-[350px] p-6">
      <AccountImportForm onImportSuccess={() => navigate('/accounts')} />
    </div>
  );
}

function AuthorizationsPage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-[500px] w-[380px] bg-background">
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/accounts')}>
            ← Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Site Authorizations</h1>
            <p className="text-xs text-muted-foreground">Manage authorized websites</p>
          </div>
        </div>
      </div>
      <div className="p-4">
        <AuthorizationManager />
      </div>
    </div>
  );
}

function AppContent() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      console.log('Popup checking auth state...');
      const response = await browser.runtime.sendMessage({
        action: 'getAuthState'
      });

      console.log('Auth state response:', response);

      if (!response.hasPassword) {
        console.log('No password set, showing setup');
        setAuthState('setup');
      } else if (response.isLocked) {
        console.log('Keychain is locked, showing unlock screen');
        setAuthState('locked');
      } else {
        console.log('Keychain is unlocked, showing main UI');
        setAuthState('unlocked');
      }
      setHasPassword(response.hasPassword);
    } catch (err) {
      console.error('Failed to check auth state:', err);
      setAuthState('setup');
    }
  };

  const handlePasswordSet = () => {
    setAuthState('locked');
    setHasPassword(true);
  };

  const handleUnlock = () => {
    setAuthState('unlocked');
  };

  const handleLock = async () => {
    await browser.runtime.sendMessage({ action: 'lockKeychain' });
    setAuthState('locked');
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-[400px] w-[350px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (authState === 'setup') {
    return (
      <div className="min-h-[400px] w-[350px] p-6">
        <PasswordSetup onPasswordSet={handlePasswordSet} />
      </div>
    );
  }

  if (authState === 'locked') {
    return <UnlockScreen onUnlock={handleUnlock} />;
  }

  // Unlocked state - show router content
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/accounts" replace />} />
      <Route path="/accounts" element={<AccountsPage onLock={handleLock} />} />
      <Route path="/connection" element={<ConnectionPage />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/authorizations" element={<AuthorizationsPage />} />
      <Route path="/account/:username" element={
        <div className="min-h-[400px] w-[350px]">
          <AccountDetails />
        </div>
      } />
    </Routes>
  );
}

function App() {
  return (
    <MemoryRouter>
      <AppContent />
    </MemoryRouter>
  );
}

export default App;