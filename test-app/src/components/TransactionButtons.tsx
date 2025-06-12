import React, { useState } from 'react';

interface TransactionButtonsProps {
  username: string;
  onResponse: (operation: string, response: any) => void;
}

const TransactionButtons: React.FC<TransactionButtonsProps> = ({ username, onResponse }) => {
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [voteAuthor, setVoteAuthor] = useState('');
  const [votePermlink, setVotePermlink] = useState('');
  const [voteWeight, setVoteWeight] = useState('100');

  const checkExtension = () => {
    const hasExtension = !!window.steem_keychain;
    onResponse('Extension Check', { 
      available: hasExtension,
      message: hasExtension ? 'Extension detected' : 'Extension not found'
    });
  };

  const testTransfer = () => {
    if (!transferTo || !transferAmount) {
      onResponse('Transfer', { error: 'Please fill in recipient and amount' });
      return;
    }

    if (window.steem_keychain) {
      window.steem_keychain.requestTransfer(
        username,
        transferTo,
        transferAmount,
        'Test transfer from keychain testing app',
        'STEEM',
        (response: any) => {
          const safeResponse = response || { error: 'No response from transfer request' };
          onResponse('Transfer', safeResponse);
        }
      );
    } else {
      onResponse('Transfer', { error: 'Extension not available' });
    }
  };

  const testVote = () => {
    if (!voteAuthor || !votePermlink) {
      onResponse('Vote', { error: 'Please fill in author and permlink' });
      return;
    }

    if (window.steem_keychain) {
      window.steem_keychain.requestVote(
        username,
        votePermlink,
        voteAuthor,
        parseInt(voteWeight) * 100, // Convert to basis points
        (response: any) => {
          const safeResponse = response || { error: 'No response from vote request' };
          onResponse('Vote', safeResponse);
        }
      );
    } else {
      onResponse('Vote', { error: 'Extension not available' });
    }
  };

  const testPost = () => {
    const title = 'Test Post from Keychain';
    const body = 'This is a test post created using the Steem Keychain testing application.';
    const tags = ['test', 'keychain'];
    
    if (window.steem_keychain) {
      window.steem_keychain.requestPost(
        username,
        title,
        body,
        '',  // parent permlink
        tags,
        (response: any) => {
          const safeResponse = response || { error: 'No response from post request' };
          onResponse('Post', safeResponse);
        }
      );
    } else {
      onResponse('Post', { error: 'Extension not available' });
    }
  };

  const testWitnessVote = () => {
    if (window.steem_keychain) {
      window.steem_keychain.requestWitnessVote(
        username,
        'good-karma', // Example witness
        true, // Vote (true) or unvote (false)
        (response: any) => {
          const safeResponse = response || { error: 'No response from witness vote request' };
          onResponse('Witness Vote', safeResponse);
        }
      );
    } else {
      onResponse('Witness Vote', { error: 'Extension not available' });
    }
  };

  const testPowerUp = () => {
    if (window.steem_keychain) {
      window.steem_keychain.requestPowerUp(
        username,
        username, // Power up to self
        '1.000', // Amount
        (response: any) => {
          const safeResponse = response || { error: 'No response from power up request' };
          onResponse('Power Up', safeResponse);
        }
      );
    } else {
      onResponse('Power Up', { error: 'Extension not available' });
    }
  };

  const testCustomJson = () => {
    const customData = {
      app: 'keychain-test',
      action: 'test',
      data: { message: 'Hello from test app' }
    };

    if (window.steem_keychain) {
      window.steem_keychain.requestCustomJson(
        username,
        'keychain_test',
        'Posting',
        JSON.stringify(customData),
        'Test Custom JSON',
        (response: any) => {
          const safeResponse = response || { error: 'No response from custom JSON request' };
          onResponse('Custom JSON', safeResponse);
        }
      );
    } else {
      onResponse('Custom JSON', { error: 'Extension not available' });
    }
  };

  return (
    <div className="transaction-buttons">
      <h3>Transaction Testing</h3>
      
      <div className="button-section">
        <button onClick={checkExtension} className="check-btn">
          Check Extension
        </button>
      </div>

      <div className="button-section">
        <h4>Transfer Test</h4>
        <div className="input-group">
          <input
            type="text"
            placeholder="Recipient username"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
          />
          <input
            type="number"
            step="0.001"
            placeholder="Amount"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
          />
          <button onClick={testTransfer} className="action-btn">
            Test Transfer
          </button>
        </div>
      </div>

      <div className="button-section">
        <h4>Vote Test</h4>
        <div className="input-group">
          <input
            type="text"
            placeholder="Author"
            value={voteAuthor}
            onChange={(e) => setVoteAuthor(e.target.value)}
          />
          <input
            type="text"
            placeholder="Permlink"
            value={votePermlink}
            onChange={(e) => setVotePermlink(e.target.value)}
          />
          <input
            type="number"
            min="1"
            max="100"
            placeholder="Weight %"
            value={voteWeight}
            onChange={(e) => setVoteWeight(e.target.value)}
          />
          <button onClick={testVote} className="action-btn">
            Test Vote
          </button>
        </div>
      </div>

      <div className="button-section">
        <h4>Other Operations</h4>
        <div className="button-grid">
          <button onClick={testPost} className="action-btn">
            Test Post
          </button>
          <button onClick={testWitnessVote} className="action-btn">
            Test Witness Vote
          </button>
          <button onClick={testPowerUp} className="action-btn">
            Test Power Up
          </button>
          <button onClick={testCustomJson} className="action-btn">
            Test Custom JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionButtons;