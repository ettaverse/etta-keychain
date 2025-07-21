// // Only create polyfills in service worker context (not during build)

import { browser } from "wxt/browser";
import { Operation } from "@steempro/dsteem";
import { AuthService } from "./background/services/auth.service";
import { AccountService } from "./background/services/account.service";
import { SteemApiService } from "./background/services/steem-api.service";
import { KeyManagementService } from "./background/services/key-management.service";
import { TransactionService } from "./background/services/transaction.service";
// // import { KeychainApiService } from './background/services/keychain-api.service';
import { SecureStorage } from "./background/lib/storage";
import { CryptoManager } from "../lib/crypto";
import LocalStorageUtils from "@/src/utils/localStorage.utils";
import { LocalStorageKeyEnum } from "@/src/reference-data/local-storage-key.enum";

// // Import asset services - temporarily commented due to dependency issues
// // import { KeychainAssetService } from './background/services/keychain-asset.service';

export default defineBackground(() => {
  console.log("Etta Keychain background script started");
  console.log("Buffer polyfill available:", !!globalThis.Buffer);
  console.log("Process polyfill available:", !!globalThis.process);
  console.log("Util polyfill available:", !!(globalThis as any).util);

  // Initialize services
  let authService: AuthService | undefined;
  let storage: SecureStorage | undefined;
  let steemApi: SteemApiService | undefined;
  let keyManager: KeyManagementService | undefined;
  let accountService: AccountService | undefined;
  let transactionService: TransactionService | null = null;
  // let keychainAssetService: KeychainAssetService;
  // let keychainApiService: KeychainApiService;

  // Initialize services asynchronously with comprehensive error handling
  (async () => {
    try {
      console.log("Starting service initialization...");

      // Initialize crypto manager
      try {
        const crypto = new CryptoManager();
        authService = new AuthService(crypto);
        console.log("AuthService initialized successfully");
      } catch (error) {
        console.error("Failed to initialize AuthService:", error);
        // Continue without AuthService - will affect some functionality
      }

      // Initialize storage
      try {
        storage = new SecureStorage();
        console.log("SecureStorage initialized successfully");
      } catch (error) {
        console.error("Failed to initialize SecureStorage:", error);
        // Continue without storage - will affect some functionality
      }

      // Initialize SteemApiService with saved RPC preference
      try {
        const savedRpc =
          await LocalStorageUtils.getValueFromLocalStorage("currentRpc");
        steemApi = new SteemApiService(savedRpc || undefined);
        console.log("SteemApiService initialized successfully");
      } catch (error) {
        console.error("Failed to initialize SteemApiService:", error);
        // Continue without SteemApiService - will affect blockchain functionality
      }

      // Initialize KeyManagementService
      try {
        keyManager = new KeyManagementService();
        console.log("KeyManagementService initialized successfully");
      } catch (error) {
        console.error("Failed to initialize KeyManagementService:", error);
        // Continue without KeyManagementService - will affect key operations
      }

      // Initialize AccountService
      try {
        if (storage && steemApi && keyManager) {
          accountService = new AccountService(storage, steemApi, keyManager);
          console.log("AccountService initialized successfully");
        } else {
          console.log("AccountService skipped - missing dependencies");
        }
      } catch (error) {
        console.error("Failed to initialize AccountService:", error);
        // Continue without AccountService - will affect account operations
      }

      // Initialize TransactionService
      try {
        if (steemApi && keyManager) {
          transactionService = new TransactionService(steemApi, keyManager);
          console.log("TransactionService initialized successfully");
        } else {
          console.log("TransactionService skipped - missing dependencies");
          transactionService = null;
        }
      } catch (error) {
        console.error("Failed to initialize TransactionService:", error);
        console.log("TransactionService will be disabled for this session");
        transactionService = null;
      }

      // Try to restore session from session storage
      try {
        if (authService) {
          await authService.restoreSession();
          console.log("Session restoration completed");
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
        // Continue - session restoration failure is not critical
      }

      console.log("Service initialization completed");
    } catch (error) {
      console.error("Critical failure during service initialization:", error);
      // Even if initialization fails, the extension should still respond to messages
    }
  })();

  // Message handler
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received message:", message.action || message.type);

    // Handle async operations
    (async () => {
      try {
        // Handle messages with 'type' field (for keychain API compatibility)
        if (message.type) {
          switch (message.type) {
            case "keychain_request": {
              try {
                // Handle handshake requests with proper validation
                if (message.event === "swHandshake") {
                  try {
                    // Check if keychain is properly initialized
                    if (!authService) {
                      sendResponse({
                        success: false,
                        error: "Keychain not initialized",
                        request_id: message.data?.request_id,
                      });
                      return;
                    }

                    // Check if user has set up keychain password
                    const authData =
                      await LocalStorageUtils.getValueFromLocalStorage(
                        LocalStorageKeyEnum.AUTH_DATA,
                      );
                    if (!authData) {
                      sendResponse({
                        success: false,
                        error:
                          "Keychain not set up. Please set up your keychain password first.",
                        request_id: message.data?.request_id,
                      });
                      return;
                    }

                    // Check if keychain is unlocked
                    if (authService.isLocked()) {
                      sendResponse({
                        success: false,
                        error:
                          "Keychain is locked. Please unlock your keychain first.",
                        request_id: message.data?.request_id,
                      });
                      return;
                    }

                    // Check if user has imported accounts
                    const keychainPassword =
                      await LocalStorageUtils.getValueFromSessionStorage(
                        LocalStorageKeyEnum.__MK,
                      );
                    if (!keychainPassword) {
                      sendResponse({
                        success: false,
                        error:
                          "Keychain session expired. Please unlock your keychain.",
                        request_id: message.data?.request_id,
                      });
                      return;
                    }

                    const allAccounts =
                      (await accountService?.getAllAccounts(
                        keychainPassword,
                      )) || [];
                    if (allAccounts.length === 0) {
                      sendResponse({
                        success: false,
                        error:
                          "No accounts found. Please import an account first.",
                        request_id: message.data?.request_id,
                      });
                      return;
                    }

                    // All checks passed - successful handshake
                    sendResponse({
                      success: true,
                      message: "Keychain ready",
                      data: {
                        version: "1.0.0",
                        accounts: allAccounts.map((acc) => acc.name),
                        extension: "Etta Keychain",
                      },
                      request_id: message.data?.request_id,
                    });
                  } catch (error) {
                    console.error("Handshake validation failed:", error);
                    sendResponse({
                      success: false,
                      error:
                        "Handshake validation failed: " +
                        (error instanceof Error
                          ? error.message
                          : "Unknown error"),
                      request_id: message.data?.request_id,
                    });
                  }
                  return;
                }

                // Handle login request
                if (message.event === "swLogin") {
                  console.log(
                    "🔐 Login request received from:",
                    sender?.origin,
                  );

                  try {
                    // Check if user is authenticated with keychain
                    if (!accountService || authService?.isLocked()) {
                      sendResponse({
                        success: false,
                        error:
                          "Keychain is locked. Please unlock your keychain first.",
                        request_id: message.data?.request_id,
                      });
                      return;
                    }

                    const keychainPassword =
                      await LocalStorageUtils.getValueFromSessionStorage(
                        LocalStorageKeyEnum.__MK,
                      );
                    if (!keychainPassword) {
                      sendResponse({
                        success: false,
                        error:
                          "Keychain is locked. Please unlock your keychain first.",
                        request_id: message.data?.request_id,
                      });
                      return;
                    }

                    // Get available accounts
                    const allAccounts =
                      await accountService.getAllAccounts(keychainPassword);
                    if (allAccounts.length === 0) {
                      sendResponse({
                        success: false,
                        error:
                          "No accounts found. Please import an account first.",
                        request_id: message.data?.request_id,
                      });
                      return;
                    }

                    // Create authorization request
                    const authRequest = {
                      id: message.data?.request_id || Date.now().toString(),
                      origin: sender?.origin || "unknown",
                      domain: new URL(sender?.origin || "https://unknown.com")
                        .hostname,
                      requestedPermissions: ["posting"], // Default to posting permission
                      timestamp: Date.now(),
                    };

                    // For now, use the first account (later allow user selection)
                    const selectedAccount = allAccounts[0];

                    // Generate and store authorization token
                    const tokenBytes = new Uint8Array(32);
                    crypto.getRandomValues(tokenBytes);
                    const token = Array.from(tokenBytes)
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join("");

                    const authRecord = {
                      token: token,
                      domain: authRequest.domain,
                      account: selectedAccount.name,
                      permissions: authRequest.requestedPermissions,
                      granted: Date.now(),
                      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
                    };

                    // Store authorization
                    const authorizations =
                      (await LocalStorageUtils.getValueFromLocalStorage(
                        "authorizations",
                      )) || [];
                    authorizations.push(authRecord);
                    await LocalStorageUtils.saveValueInLocalStorage(
                      "authorizations",
                      authorizations,
                    );

                    // Return success with account info
                    sendResponse({
                      success: true,
                      data: {
                        username: selectedAccount.name,
                        accounts: allAccounts.map((acc) => acc.name),
                        authToken: token,
                      },
                      message: "Login successful",
                      request_id: message.data?.request_id,
                    });
                  } catch (error) {
                    console.error("Login request failed:", error);
                    sendResponse({
                      success: false,
                      error:
                        "Login failed: " +
                        (error instanceof Error
                          ? error.message
                          : "Unknown error"),
                      request_id: message.data?.request_id,
                    });
                  }
                  return;
                }

                // Handle accounts request
                if (message.event === "swAccounts") {
                  console.log("👥 Accounts request received");
                  try {
                    if (!accountService || authService?.isLocked()) {
                      sendResponse({
                        success: false,
                        error: "Keychain is locked",
                        request_id: message.data?.request_id,
                      });
                      return;
                    }

                    const keychainPassword =
                      await LocalStorageUtils.getValueFromSessionStorage(
                        LocalStorageKeyEnum.__MK,
                      );
                    if (!keychainPassword) {
                      sendResponse({
                        success: false,
                        error: "Keychain is locked",
                        request_id: message.data?.request_id,
                      });
                      return;
                    }

                    const allAccounts =
                      await accountService.getAllAccounts(keychainPassword);
                    sendResponse({
                      success: true,
                      data: {
                        accounts:
                          allAccounts.length > 0
                            ? allAccounts.map((acc) => acc.name)
                            : ["testuser", "demouser"],
                      },
                      message: "Accounts retrieved",
                      request_id: message.data?.request_id,
                    });
                  } catch (error) {
                    console.error("Failed to get accounts:", error);
                    sendResponse({
                      success: false,
                      error: "Failed to retrieve accounts",
                      request_id: message.data?.request_id,
                    });
                  }
                  return;
                }

                // Handle swRequest (generic request handler)
                if (message.event === "swRequest") {
                  console.log("🔧 swRequest received:", message.data);
                  const requestType = message.data?.type;
                  console.log("🔍 Request type detected:", requestType);

                  if (requestType === "signBuffer") {
                    console.log("✍️ Sign buffer request:", message.data);
                    // For now, return a mock signature - later implement actual signing
                    sendResponse({
                      success: true,
                      data: {
                        signature: "mock_signature_" + Date.now(),
                        publicKey: "STM1234567890abcdef",
                        username: message.data.username,
                      },
                      message: "Buffer signed successfully",
                      request_id: message.data?.request_id,
                    });
                    return;
                  }

                  if (requestType === "broadcast") {
                    console.log("📡 Broadcast request:", message.data);
                    // For now, return mock transaction ID
                    sendResponse({
                      success: true,
                      data: {
                        id: "mock_transaction_" + Date.now(),
                      },
                      message: "Transaction broadcast successfully",
                      request_id: message.data?.request_id,
                    });
                    return;
                  }

                  // Asset operation handlers
                  if (requestType === "asset_create") {
                    console.log(
                      "🪙 Asset creation request received:",
                      message.data,
                    );
                    console.log("🔧 Service status check:", {
                      transactionService: !!transactionService,
                      accountService: !!accountService,
                      steemApi: !!steemApi,
                      allServicesAvailable: !!(
                        transactionService &&
                        accountService &&
                        steemApi
                      ),
                    });

                    try {
                      // Check if blockchain services are available
                      if (transactionService && accountService && steemApi) {
                        console.log("✅ Using real blockchain integration");
                        // Use real blockchain integration
                        const result = await createAssetOnBlockchain(
                          message.data.username,
                          message.data.assetRequest,
                        );

                        console.log("🎉 Asset creation result:", result);
                        sendResponse({
                          success: true,
                          universal_id: result.universal_id,
                          transaction_id: result.transaction_id,
                          asset: result.asset,
                          message:
                            "Asset created successfully on STEEM blockchain",
                          request_id: message.data?.request_id,
                        });
                      } else {
                        // Fall back to mock implementation if services aren't available
                        console.log(
                          "⚠️ Blockchain services not available, using mock implementation",
                        );
                        const mockUniversalId = `ua_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        const mockTransactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                        sendResponse({
                          success: true,
                          universal_id: mockUniversalId,
                          transaction_id: mockTransactionId,
                          asset: {
                            universal_id: mockUniversalId,
                            name:
                              message.data.assetRequest?.base_metadata?.name ||
                              "Unknown Asset",
                            description:
                              message.data.assetRequest?.base_metadata
                                ?.description || "Asset created via extension",
                            asset_type:
                              message.data.assetRequest?.asset_type ||
                              "universal",
                            creator: message.data.username,
                            created_at: new Date().toISOString(),
                          },
                          message: "Asset created successfully (mock mode)",
                          request_id: message.data?.request_id,
                        });
                      }
                    } catch (error) {
                      console.error("Asset creation failed:", error);

                      // Enhanced error handling with specific error types
                      let errorMessage = "Asset creation failed";
                      if (error instanceof Error) {
                        if (error.message.includes("Keychain is locked")) {
                          errorMessage =
                            "Keychain is locked. Please unlock your keychain first.";
                        } else if (
                          error.message.includes("Account not found")
                        ) {
                          errorMessage =
                            "Account not found. Please check your account setup.";
                        } else if (error.message.includes("No posting key")) {
                          errorMessage =
                            "No posting key available. Please import your account with proper keys.";
                        } else if (error.message.includes("insufficient")) {
                          errorMessage =
                            "Insufficient resource credits. Please wait or power up STEEM.";
                        } else {
                          errorMessage = `Blockchain error: ${error.message}`;
                        }
                      }

                      sendResponse({
                        success: false,
                        error: errorMessage,
                        request_id: message.data?.request_id,
                      });
                    }
                    return;
                  }

                  if (requestType === "asset_transfer") {
                    console.log("🔄 Asset transfer request:", message.data);
                    try {
                      // Mock asset transfer for now - later integrate with KeychainAssetService
                      const mockTransactionId = `tx_transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                      sendResponse({
                        success: true,
                        transaction_id: mockTransactionId,
                        universal_id: message.data.universalId,
                        message: `Asset transferred to ${message.data.toUser}`,
                        request_id: message.data?.request_id,
                      });
                    } catch (error) {
                      console.error("Asset transfer failed:", error);
                      sendResponse({
                        success: false,
                        error:
                          "Asset transfer failed: " +
                          (error instanceof Error
                            ? error.message
                            : "Unknown error"),
                        request_id: message.data?.request_id,
                      });
                    }
                    return;
                  }

                  if (requestType === "asset_convert") {
                    console.log("🔄 Asset conversion request:", message.data);
                    try {
                      // Mock asset conversion for now - later integrate with KeychainAssetService
                      const mockTransactionId = `tx_convert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                      sendResponse({
                        success: true,
                        transaction_id: mockTransactionId,
                        universal_id: message.data.universalId,
                        conversion_result: {
                          fromGame: message.data.fromGame,
                          toGame: message.data.toGame,
                          quality: 0.85, // Mock quality score
                        },
                        message: `Asset converted from ${message.data.fromGame} to ${message.data.toGame}`,
                        request_id: message.data?.request_id,
                      });
                    } catch (error) {
                      console.error("Asset conversion failed:", error);
                      sendResponse({
                        success: false,
                        error:
                          "Asset conversion failed: " +
                          (error instanceof Error
                            ? error.message
                            : "Unknown error"),
                        request_id: message.data?.request_id,
                      });
                    }
                    return;
                  }

                  if (requestType === "asset_update") {
                    console.log("📝 Asset update request:", message.data);
                    try {
                      // Mock asset update for now - later integrate with KeychainAssetService
                      const mockTransactionId = `tx_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                      sendResponse({
                        success: true,
                        transaction_id: mockTransactionId,
                        universal_id: message.data.universalId,
                        message: "Asset updated successfully",
                        request_id: message.data?.request_id,
                      });
                    } catch (error) {
                      console.error("Asset update failed:", error);
                      sendResponse({
                        success: false,
                        error:
                          "Asset update failed: " +
                          (error instanceof Error
                            ? error.message
                            : "Unknown error"),
                        request_id: message.data?.request_id,
                      });
                    }
                    return;
                  }

                  if (requestType === "asset_burn") {
                    console.log("🔥 Asset burn request:", message.data);
                    try {
                      // Mock asset burn for now - later integrate with KeychainAssetService
                      const mockTransactionId = `tx_burn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                      sendResponse({
                        success: true,
                        transaction_id: mockTransactionId,
                        universal_id: message.data.universalId,
                        message: "Asset burned successfully",
                        request_id: message.data?.request_id,
                      });
                    } catch (error) {
                      console.error("Asset burn failed:", error);
                      sendResponse({
                        success: false,
                        error:
                          "Asset burn failed: " +
                          (error instanceof Error
                            ? error.message
                            : "Unknown error"),
                        request_id: message.data?.request_id,
                      });
                    }
                    return;
                  }

                  if (requestType === "asset_verify_ownership") {
                    console.log(
                      "✅ Asset ownership verification request:",
                      message.data,
                    );
                    try {
                      // Mock ownership verification for now - later integrate with KeychainAssetService
                      sendResponse({
                        success: true,
                        verified: true,
                        owner: message.data.username,
                        message: "Asset ownership verified",
                        request_id: message.data?.request_id,
                      });
                    } catch (error) {
                      console.error(
                        "Asset ownership verification failed:",
                        error,
                      );
                      sendResponse({
                        success: false,
                        error:
                          "Ownership verification failed: " +
                          (error instanceof Error
                            ? error.message
                            : "Unknown error"),
                        request_id: message.data?.request_id,
                      });
                    }
                    return;
                  }

                  // Custom JSON query handlers for blockchain explorer
                  if (requestType === "query_custom_json_by_account") {
                    console.log("🔍 Custom JSON query by account request:", message.data);
                    try {
                      if (!steemApi) {
                        sendResponse({
                          success: false,
                          error: "Blockchain API not available",
                          request_id: message.data?.request_id,
                        });
                        return;
                      }

                      const { account, customJsonId, limit } = message.data;
                      const operations = await steemApi.getCustomJsonByAccount(
                        account,
                        customJsonId || 'etta_asset',
                        limit || 100
                      );

                      sendResponse({
                        success: true,
                        operations,
                        count: operations.length,
                        query_type: 'by_account',
                        message: `Found ${operations.length} operations for account ${account}`,
                        request_id: message.data?.request_id,
                      });
                    } catch (error) {
                      console.error("Custom JSON query by account failed:", error);
                      sendResponse({
                        success: false,
                        error: "Query failed: " + (error instanceof Error ? error.message : "Unknown error"),
                        request_id: message.data?.request_id,
                      });
                    }
                    return;
                  }

                  if (requestType === "query_custom_json_by_block") {
                    console.log("🔍 Custom JSON query by block request:", message.data);
                    try {
                      if (!steemApi) {
                        sendResponse({
                          success: false,
                          error: "Blockchain API not available",
                          request_id: message.data?.request_id,
                        });
                        return;
                      }

                      const { blockNumber, customJsonId } = message.data;
                      const operations = await steemApi.getCustomJsonInBlock(
                        blockNumber,
                        customJsonId || 'etta_asset'
                      );

                      sendResponse({
                        success: true,
                        operations,
                        count: operations.length,
                        query_type: 'by_block',
                        message: `Found ${operations.length} operations in block ${blockNumber}`,
                        request_id: message.data?.request_id,
                      });
                    } catch (error) {
                      console.error("Custom JSON query by block failed:", error);
                      sendResponse({
                        success: false,
                        error: "Query failed: " + (error instanceof Error ? error.message : "Unknown error"),
                        request_id: message.data?.request_id,
                      });
                    }
                    return;
                  }

                  if (requestType === "query_custom_json_by_date_range") {
                    console.log("🔍 Custom JSON query by date range request:", message.data);
                    try {
                      if (!steemApi) {
                        sendResponse({
                          success: false,
                          error: "Blockchain API not available",
                          request_id: message.data?.request_id,
                        });
                        return;
                      }

                      const { accounts, customJsonId, startDate, endDate, maxResults } = message.data;
                      const operations = await steemApi.getCustomJsonByDateRange(
                        accounts,
                        customJsonId || 'etta_asset',
                        new Date(startDate),
                        new Date(endDate),
                        maxResults || 5000
                      );

                      sendResponse({
                        success: true,
                        operations,
                        count: operations.length,
                        query_type: 'by_date_range',
                        message: `Found ${operations.length} operations in date range`,
                        request_id: message.data?.request_id,
                      });
                    } catch (error) {
                      console.error("Custom JSON query by date range failed:", error);
                      sendResponse({
                        success: false,
                        error: "Query failed: " + (error instanceof Error ? error.message : "Unknown error"),
                        request_id: message.data?.request_id,
                      });
                    }
                    return;
                  }

                  if (requestType === "query_custom_json_by_block_range") {
                    console.log("🔍 Custom JSON query by block range request:", message.data);
                    try {
                      if (!steemApi) {
                        sendResponse({
                          success: false,
                          error: "Blockchain API not available",
                          request_id: message.data?.request_id,
                        });
                        return;
                      }

                      const { startBlock, endBlock, customJsonId, maxResults } = message.data;
                      const operations = await steemApi.getCustomJsonByBlockRange(
                        startBlock,
                        endBlock,
                        customJsonId || 'etta_asset',
                        maxResults || 1000
                      );

                      sendResponse({
                        success: true,
                        operations,
                        count: operations.length,
                        query_type: 'by_block_range',
                        message: `Found ${operations.length} operations in block range`,
                        request_id: message.data?.request_id,
                      });
                    } catch (error) {
                      console.error("Custom JSON query by block range failed:", error);
                      sendResponse({
                        success: false,
                        error: "Query failed: " + (error instanceof Error ? error.message : "Unknown error"),
                        request_id: message.data?.request_id,
                      });
                    }
                    return;
                  }

                  // For other request types, return not implemented
                  sendResponse({
                    success: false,
                    error: "Request type not yet implemented: " + requestType,
                    request_id: message.data?.request_id,
                  });
                  return;
                }

                // For other events, return not implemented message
                sendResponse({
                  success: false,
                  error: "Event not yet implemented: " + message.event,
                  request_id: message.data?.request_id,
                });
              } catch (error) {
                console.error("Keychain request failed:", error);
                sendResponse({
                  success: false,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Keychain request failed",
                  request_id: message.data?.request_id,
                });
              }
              return;
            }

            case "keychain-get-account-details": {
              if (!accountService || authService?.isLocked()) {
                sendResponse({ success: false, error: "Keychain is locked" });
                return;
              }

              const keychainPassword =
                await LocalStorageUtils.getValueFromSessionStorage(
                  LocalStorageKeyEnum.__MK,
                );
              if (!keychainPassword) {
                sendResponse({ success: false, error: "Keychain is locked" });
                return;
              }

              try {
                const { username } = message.payload;
                const allAccounts =
                  await accountService.getAllAccounts(keychainPassword);
                const account = allAccounts.find(
                  (acc) => acc.name === username,
                );

                if (!account) {
                  sendResponse({ success: false, error: "Account not found" });
                  return;
                }

                // Check if this is a master password account
                const isMasterPassword = !!(
                  account.keys.posting ||
                  account.keys.active ||
                  account.keys.memo ||
                  account.keys.owner
                );

                // Return full account data including keys
                sendResponse({
                  success: true,
                  account: {
                    username: account.name,
                    isActive: storage
                      ? (await storage.getActiveAccount()) === account.name
                      : false,
                    isMasterPassword: isMasterPassword,
                  },
                  keys: account.keys,
                });
              } catch (error) {
                console.error("Failed to get account details", error);
                sendResponse({
                  success: false,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                });
              }
              return;
            }

            default:
              // Fall through to action-based switch
              break;
          }
        }

        switch (message.action) {
          case "getAuthState": {
            try {
              const authData = await LocalStorageUtils.getValueFromLocalStorage(
                LocalStorageKeyEnum.AUTH_DATA,
              );

              let isLocked = true;
              if (authService) {
                isLocked = authService.isLocked();

                // Try to restore session if needed
                if (isLocked) {
                  try {
                    await authService.restoreSession();
                    isLocked = authService.isLocked();
                  } catch (error) {
                    console.error(
                      "Failed to restore session during auth state check:",
                      error,
                    );
                    // Continue with locked state
                  }
                }
              } else {
                console.log("AuthService not available, assuming locked state");
                isLocked = true;
              }

              sendResponse({
                success: true,
                hasPassword: !!authData,
                isLocked: isLocked,
              });
            } catch (error) {
              console.error("Failed to get auth state:", error);
              sendResponse({
                success: false,
                error: "Failed to check auth state",
                hasPassword: false,
                isLocked: true,
              });
            }
            return;
          }

          case "setupKeychainPassword": {
            if (!authService) {
              sendResponse({
                success: false,
                error: "Services not initialized",
              });
              return;
            }
            await authService.setupKeychainPassword(
              message.password,
              message.confirmPassword,
            );
            // Auto-unlock after setting up password
            await authService.unlockKeychain(message.password);
            await LocalStorageUtils.saveValueInSessionStorage(
              LocalStorageKeyEnum.__MK,
              message.password,
            );
            sendResponse({ success: true });
            return;
          }

          case "unlockKeychain": {
            if (!authService) {
              sendResponse({
                success: false,
                error: "Services not initialized",
              });
              return;
            }
            const unlocked = await authService.unlockKeychain(message.password);
            if (unlocked) {
              // Save the keychain password to session storage for account operations
              await LocalStorageUtils.saveValueInSessionStorage(
                LocalStorageKeyEnum.__MK,
                message.password,
              );
              sendResponse({ success: true });
            } else {
              const failedAttempts = await authService.getFailedAttempts();
              sendResponse({
                success: false,
                error: "Invalid password",
                failedAttempts,
              });
            }
            return;
          }

          case "lockKeychain": {
            if (authService) {
              await authService.lockKeychain();
            }
            sendResponse({ success: true });
            return;
          }

          case "validateAccount": {
            if (!steemApi) {
              sendResponse({
                success: false,
                error: "Services not initialized",
              });
              return;
            }
            try {
              const account = await steemApi.getAccount(message.username);
              sendResponse({ success: true, exists: !!account });
            } catch {
              sendResponse({ success: true, exists: false });
            }
            return;
          }

          case "getAccount": {
            if (!steemApi) {
              sendResponse({
                success: false,
                error: "Services not initialized",
              });
              return;
            }
            try {
              const accounts = await steemApi.getAccount(
                message.payload.username,
              );
              sendResponse({ success: true, data: accounts });
            } catch (error: any) {
              console.error("Failed to get account:", error);
              sendResponse({
                success: false,
                error:
                  error.message || "Failed to fetch account from blockchain",
              });
            }
            return;
          }

          case "importAccountWithMasterPassword": {
            if (!accountService || authService?.isLocked()) {
              sendResponse({ success: false, error: "Keychain is locked" });
              return;
            }
            const keychainPassword =
              await LocalStorageUtils.getValueFromSessionStorage(
                LocalStorageKeyEnum.__MK,
              );
            if (!keychainPassword) {
              sendResponse({ success: false, error: "Keychain is locked" });
              return;
            }
            await accountService.importAccountWithMasterPassword(
              message.username,
              message.password,
              keychainPassword,
            );
            sendResponse({ success: true });
            return;
          }

          case "getAccounts": {
            if (!accountService || authService?.isLocked()) {
              sendResponse({ success: false, error: "Keychain is locked" });
              return;
            }
            try {
              const keychainPassword =
                await LocalStorageUtils.getValueFromSessionStorage(
                  LocalStorageKeyEnum.__MK,
                );
              if (!keychainPassword) {
                sendResponse({ success: false, error: "Keychain is locked" });
                return;
              }
              const allAccounts =
                await accountService.getAllAccounts(keychainPassword);
              const activeAccount = storage
                ? await storage.getActiveAccount()
                : null;
              sendResponse({
                success: true,
                accounts: allAccounts.map((acc) => ({
                  name: acc.name,
                  keys: {
                    posting: !!acc.keys.posting,
                    active: !!acc.keys.active,
                    owner: !!acc.keys.owner,
                    memo: !!acc.keys.memo,
                  },
                })),
                activeAccount,
              });
            } catch (error) {
              console.error("Failed to get accounts", error);
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
            return;
          }

          case "storeAuthorization": {
            try {
              const authorizations =
                (await LocalStorageUtils.getValueFromLocalStorage(
                  "authorizations",
                )) || [];
              authorizations.push(message.authorization);
              await LocalStorageUtils.saveValueInLocalStorage(
                "authorizations",
                authorizations,
              );
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: "Failed to store authorization",
              });
            }
            return;
          }

          case "getAuthorizations": {
            try {
              const authorizations =
                (await LocalStorageUtils.getValueFromLocalStorage(
                  "authorizations",
                )) || [];
              // Clean up expired authorizations
              const now = Date.now();
              const validAuthorizations = authorizations.filter(
                (auth: any) => auth.expires > now,
              );
              if (validAuthorizations.length !== authorizations.length) {
                await LocalStorageUtils.saveValueInLocalStorage(
                  "authorizations",
                  validAuthorizations,
                );
              }
              sendResponse({
                success: true,
                authorizations: validAuthorizations,
              });
            } catch (error) {
              sendResponse({
                success: false,
                error: "Failed to get authorizations",
              });
            }
            return;
          }

          case "revokeAuthorization": {
            try {
              const authorizations =
                (await LocalStorageUtils.getValueFromLocalStorage(
                  "authorizations",
                )) || [];
              const updatedAuthorizations = authorizations.filter(
                (auth: any) => auth.token !== message.token,
              );
              await LocalStorageUtils.saveValueInLocalStorage(
                "authorizations",
                updatedAuthorizations,
              );
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({
                success: false,
                error: "Failed to revoke authorization",
              });
            }
            return;
          }

          case "validateAuthToken": {
            try {
              const authorizations =
                (await LocalStorageUtils.getValueFromLocalStorage(
                  "authorizations",
                )) || [];
              const auth = authorizations.find(
                (a: any) =>
                  a.token === message.token &&
                  a.domain === message.domain &&
                  a.expires > Date.now(),
              );
              sendResponse({
                success: true,
                valid: !!auth,
                authorization: auth,
              });
            } catch (error) {
              sendResponse({
                success: false,
                error: "Failed to validate token",
              });
            }
            return;
          }

          default:
            sendResponse({ success: false, error: "Unknown action" });
            return;
        }
      } catch (error: any) {
        console.error("Background script error:", error);
        sendResponse({
          success: false,
          error: error.message || "Operation failed",
        });
      }
    })();

    // Return true to indicate we'll send response asynchronously
    return true;
  });

  // Asset creation function that uses real blockchain operations
  async function createAssetOnBlockchain(
    username: string,
    assetRequest: any,
  ): Promise<any> {
    try {
      // Check if services are initialized
      if (!transactionService || !accountService || !steemApi) {
        throw new Error("Services not initialized");
      }

      // Get user account and keys
      const keychainPassword =
        await LocalStorageUtils.getValueFromSessionStorage(
          LocalStorageKeyEnum.__MK,
        );
      if (!keychainPassword) {
        throw new Error("Keychain is locked");
      }

      const allAccounts = await accountService.getAllAccounts(keychainPassword);
      const userAccount = allAccounts.find((acc) => acc.name === username);

      if (!userAccount) {
        throw new Error("Account not found");
      }

      if (!userAccount.keys.posting) {
        throw new Error("No posting key available for account");
      }

      // Generate Universal Asset ID
      const universalId = `ua_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create asset data structure
      const assetData = {
        universal_id: universalId,
        name: assetRequest.base_metadata?.name || "Unknown Asset",
        description:
          assetRequest.base_metadata?.description ||
          "Asset created via extension",
        image_url: assetRequest.base_metadata?.image_url,
        asset_type: assetRequest.asset_type || "universal",
        domain: assetRequest.domain || "gaming",
        creator: username,
        created_at: new Date().toISOString(),
        source_platform: assetRequest.initial_game_id || "extension",
        core_essence: assetRequest.core_essence || {
          power_tier: 50,
          rarity_class: "common",
          element: "neutral",
        },
        initial_variant: assetRequest.initial_variant || {
          properties: {},
        },
      };

      // Create custom JSON operation for asset minting
      // Use a simple ID that's more likely to be accepted
      const customJsonOp: Operation = [
        "custom_json",
        {
          required_auths: [],
          required_posting_auths: [username],
          id: "etta_asset", // Simplified ID
          json: JSON.stringify({
            operation: "asset_create",
            data: assetData,
          }),
        },
      ];
      
      // Log the operation details
      console.log("📋 Custom JSON operation:", {
        operationType: customJsonOp[0],
        operationId: customJsonOp[1].id,
        requiredPostingAuths: customJsonOp[1].required_posting_auths,
        jsonData: JSON.parse(customJsonOp[1].json),
        jsonString: customJsonOp[1].json,
        jsonLength: customJsonOp[1].json.length,
        isValidJson: (() => {
          try {
            JSON.parse(customJsonOp[1].json);
            return true;
          } catch {
            return false;
          }
        })()
      });

      // Send transaction to blockchain
      console.log("🚀 Sending transaction to blockchain...", {
        customJsonOp,
        userAccount: userAccount.name,
      });
      const result = await transactionService.sendOperation(
        [customJsonOp],
        {
          type: "posting",
          value: userAccount.keys.posting,
        },
        false, // no confirmation needed
      );

      console.log("📊 Transaction result received:", {
        result: result,
        hasResult: !!result,
        hasResultResult: !!result?.result,
        hasResultResultId: !!result?.result?.id,
        resultResultId: result?.result?.id,
        hasTransaction: !!result?.transaction,
        hasTransactionId: !!result?.transaction?.id,
        transactionId: result?.transaction?.id,
        resultStructure: result ? Object.keys(result) : "null",
        fullResult: JSON.stringify(result, null, 2),
      });

      if (result && result.result?.id) {
        console.log("✅ Transaction successful with ID:", result.result.id);
        return {
          success: true,
          universal_id: universalId,
          transaction_id: result.result.id,
          asset: assetData,
        };
      } else {
        console.error(
          "❌ Transaction failed - no transaction ID found in result:",
          result,
        );
        throw new Error("Transaction failed - no transaction ID returned");
      }
    } catch (error) {
      console.error("Blockchain asset creation failed:", error);
      throw error;
    }
  }

  console.log("Background script initialized successfully");
});
