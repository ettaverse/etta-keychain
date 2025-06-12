import React from 'react';

interface ResponseDisplayProps {
  responses: Array<{
    operation: string;
    response: any;
    timestamp: string;
  }>;
  onClear: () => void;
}

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ responses, onClear }) => {
  const formatResponse = (response: any) => {
    if (response === undefined || response === null) {
      return 'undefined response';
    }
    try {
      return JSON.stringify(response, null, 2);
    } catch (error) {
      return `Error formatting response: ${String(response)}`;
    }
  };

  const getStatusClass = (response: any) => {
    if (!response || typeof response !== 'object') return 'neutral';
    if (response.error || response.success === false) return 'error';
    if (response.success === true) return 'success';
    return 'neutral';
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Simple feedback - could be enhanced with a toast notification
      const button = document.activeElement as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const copyAllResponses = () => {
    const allResponsesText = responses.map(item => 
      `=== ${item.operation} (${item.timestamp}) ===\n${formatResponse(item.response)}\n`
    ).join('\n');
    
    copyToClipboard(allResponsesText);
  };

  const copyIndividualResponse = (item: any) => {
    const responseText = `${item.operation} (${item.timestamp}):\n${formatResponse(item.response)}`;
    copyToClipboard(responseText);
  };

  return (
    <div className="response-display">
      <div className="response-header">
        <h3>Extension Responses</h3>
        <div className="header-buttons">
          <button onClick={copyAllResponses} className="copy-all-btn" disabled={responses.length === 0}>
            Copy All Responses
          </button>
          <button onClick={onClear} className="clear-btn">
            Clear Responses
          </button>
        </div>
      </div>
      
      <div className="responses-list">
        {responses.length === 0 ? (
          <p className="no-responses">No responses yet. Try testing some operations above.</p>
        ) : (
          responses.map((item, index) => (
            <div key={index} className={`response-item ${getStatusClass(item.response)}`}>
              <div className="response-meta">
                <div className="response-title">
                  <strong>{item.operation}</strong>
                  <span className="timestamp">{item.timestamp}</span>
                </div>
                <button 
                  onClick={() => copyIndividualResponse(item)} 
                  className="copy-btn"
                  title="Copy this response"
                >
                  📋 Copy
                </button>
              </div>
              <pre className="response-content">
                {formatResponse(item.response)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ResponseDisplay;