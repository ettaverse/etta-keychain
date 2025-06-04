import { browser } from 'wxt/browser';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    // Listen for messages from the injected script (running in MAIN world)
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'keychain_request_from_page') {
        // Forward to background script
        browser.runtime.sendMessage({
          type: 'keychain_request',
          event: event.data.event,
          data: event.data.data
        }).then((response) => {
          // Forward response back to page
          const messageType = event.data.event === 'swHandshake' 
            ? 'keychain_handshake_to_page' 
            : 'keychain_response_to_page';
            
          window.postMessage({
            type: messageType,
            response: response
          }, '*');
        }).catch((error) => {
          console.error('Failed to send message to background:', error);
          window.postMessage({
            type: 'keychain_response_to_page',
            response: {
              success: false,
              error: 'Communication error',
              message: 'Failed to communicate with extension background',
              request_id: event.data.data?.request_id
            }
          }, '*');
        });
      }
    });

    console.log('Etta Keychain content script initialized');
  },
});
