import React, { useState, useEffect } from 'react';
import { PasswordSetup } from './components/PasswordSetup';
import { UnlockScreen } from './components/UnlockScreen';
import { AccountList } from './components/AccountList';
import { AccountImportForm } from './components/AccountImportForm';
import { AccountConnection } from './pages/AccountConnection';
import { Button } from '@/components/ui/button';
import { browser } from 'wxt/browser';

type AppState = 'loading' | 'setup' | 'locked' | 'unlocked' | 'import' | 'connection';

function App() {
  const [state, setState] = useState<AppState>('loading');
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getAuthState'
      });

      if (!response.hasPassword) {
        setState('setup');
      } else if (response.isLocked) {
        setState('locked');
      } else {
        setState('unlocked');
      }
      setHasPassword(response.hasPassword);
    } catch (err) {
      console.error('Failed to check auth state:', err);
      setState('setup');
    }
  };

  const handlePasswordSet = () => {
    setState('locked');
    setHasPassword(true);
  };

  const handleUnlock = () => {
    setState('unlocked');
  };

  const handleLock = async () => {
    await browser.runtime.sendMessage({ action: 'lockKeychain' });
    setState('locked');
  };

  const handleImportClick = () => {
    setState('connection');
  };

  const handleImportSuccess = () => {
    setState('unlocked');
  };

  const handleBackFromImport = () => {
    setState('unlocked');
  };

  const handleImportFromConnection = (username: string) => {
    setState('import');
    // We'll pass the username to the import form later
  };

  if (state === 'loading') {
    return (
      <div className="min-h-[400px] w-[350px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (state === 'setup') {
    return (
      <div className="min-h-[400px] w-[350px] p-6">
        <PasswordSetup onPasswordSet={handlePasswordSet} />
      </div>
    );
  }

  if (state === 'locked') {
    return <UnlockScreen onUnlock={handleUnlock} />;
  }

  if (state === 'connection') {
    return (
      <div className="min-h-[400px] w-[350px]">
        <AccountConnection 
          onBack={handleBackFromImport}
          onImportAccount={handleImportFromConnection}
        />
      </div>
    );
  }

  if (state === 'import') {
    return (
      <div className="min-h-[400px] w-[350px] p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => setState('connection')}>
            ← Back to Account Lookup
          </Button>
        </div>
        <AccountImportForm onImportSuccess={handleImportSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-[400px] w-[350px] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Etta Keychain</h1>
        <Button variant="ghost" size="sm" onClick={handleLock}>
          Lock 🔒
        </Button>
      </div>
      <AccountList onAddAccount={handleImportClick} />
    </div>
  );
}

export default App;
