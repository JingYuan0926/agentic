import { SecretVaultWrapper } from "nillion-sv-wrappers";
import { nilql } from "@nillion/nilql";
import { v4 as uuidv4 } from "uuid";

// Create encryption config
const encryptionConfig = {
  operations: {
    store: {
      type: "multiple",
    },
  },
};

// Create cluster config with real node info
const cluster = {
  nodes: [
    {
      url: "https://nildb-zy8u.nillion.network",
      did: "did:nil:testnet:nillion1fnhettvcrsfu8zkd5zms4d820l0ct226c3zy8u",
      operations: ["store"],
    },
    {
      url: "https://nildb-rl5g.nillion.network",
      did: "did:nil:testnet:nillion14x47xx85de0rg9dqunsdxg8jh82nvkax3jrl5g",
      operations: ["store"],
    },
    {
      url: "https://nildb-lpjp.nillion.network",
      did: "did:nil:testnet:nillion167pglv9k7m4gj05rwj520a46tulkff332vlpjp",
      operations: ["store"],
    },
  ],
};

class NillionService {
  constructor() {
    console.log("NillionService constructor called");
    this.collection = null;
    this.secretKey = null;

    // Get environment variables and log their presence
    console.log("Environment variables check:", {
      schemaId: !!process.env.NEXT_PUBLIC_NILLION_SCHEMA_ID,
      secretKey: !!process.env.NEXT_PUBLIC_NILLION_SECRET_KEY,
      orgDid: !!process.env.NEXT_PUBLIC_NILLION_ORG_DID,
    });

    // Get environment variables
    if (!process.env.NEXT_PUBLIC_NILLION_SCHEMA_ID) {
      throw new Error("NEXT_PUBLIC_NILLION_SCHEMA_ID is required");
    }
    if (!process.env.NEXT_PUBLIC_NILLION_SECRET_KEY) {
      throw new Error("NEXT_PUBLIC_NILLION_SECRET_KEY is required");
    }
    if (!process.env.NEXT_PUBLIC_NILLION_ORG_DID) {
      throw new Error("NEXT_PUBLIC_NILLION_ORG_DID is required");
    }

    this.SCHEMA_ID = process.env.NEXT_PUBLIC_NILLION_SCHEMA_ID;
    this.SECRET_KEY = process.env.NEXT_PUBLIC_NILLION_SECRET_KEY;
    this.ORG_DID = process.env.NEXT_PUBLIC_NILLION_ORG_DID;
  }

  async init() {
    console.log("NillionService init called");
    if (!this.collection) {
      console.log("Creating new collection");
      this.collection = new SecretVaultWrapper(
        cluster.nodes,
        {
          secretKey: this.SECRET_KEY,
          orgDid: this.ORG_DID,
        },
        this.SCHEMA_ID
      );

      try {
        console.log("Initializing collection...");
        await this.collection.init();
        console.log("Collection initialized");

        console.log("Generating secret key...");
        this.secretKey = await nilql.SecretKey.generate(cluster, {
          store: true,
        });
        console.log("Secret key generated");
      } catch (error) {
        console.error("Failed to initialize Nillion service:", error);
        throw error;
      }
    } else {
      console.log("Collection already initialized");
    }
  }

  async prepareDataForStorage(data) {
    try {
      const jsonString = JSON.stringify(data);
      const shares = await nilql.encrypt(this.secretKey, jsonString);
      return { $allot: shares }; // Store all shares, not just the first one
    } catch (error) {
      console.error("Error encrypting data:", error);
      throw error;
    }
  }

  async decryptData(shares) {
    try {
      const decrypted = await nilql.decrypt(this.secretKey, shares);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error("Error decrypting data:", error);
      throw error;
    }
  }

  async storeChatHistory(userAddress, chatHistory, title = "") {
    try {
      await this.init();

      const data = [
        {
          _id: uuidv4(),
          user_address: userAddress,
          chat_history: await this.prepareDataForStorage(chatHistory),
          timestamp: new Date().toISOString(),
          title: title || `Chat ${new Date().toLocaleString()}`,
        },
      ];

      const response = await fetch("/api/nillion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "write",
          data,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error storing chat history:", error);
      throw error;
    }
  }

  async getChatHistory(userAddress) {
    console.log("Getting chat history for address:", userAddress);
    try {
      await this.init();
      console.log("Service initialized");

      const response = await fetch("/api/nillion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "read",
          address: userAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const encryptedData = await response.json();
      console.log("Read data:", encryptedData);

      // Check if we got valid data
      if (!encryptedData || !Array.isArray(encryptedData)) {
        console.warn("No data or invalid data returned:", encryptedData);
        return [];
      }

      // Collect shares from all nodes for each record
      const decryptedData = await Promise.all(
        encryptedData.map(async (record) => {
          try {
            if (!record || !record.chat_history) {
              console.warn("Invalid record:", record);
              return null;
            }

            // Convert comma-separated string back to array
            const shares =
              typeof record.chat_history === "string"
                ? record.chat_history.split(",")
                : record.chat_history.$allot?.split(",");

            console.log("Processing shares:", {
              recordId: record._id,
              shares,
            });

            // Validate shares - must match cluster size
            if (
              !shares ||
              !Array.isArray(shares) ||
              shares.length !== cluster.nodes.length
            ) {
              console.log("Skipping record - invalid number of shares:", {
                recordId: record._id,
                sharesCount: shares?.length,
                expectedCount: cluster.nodes.length,
              });
              return null;
            }

            const decrypted = await nilql.decrypt(this.secretKey, shares);
            return {
              id: record._id,
              title: record.title,
              timestamp: record.timestamp,
              chatHistory: JSON.parse(decrypted),
            };
          } catch (error) {
            console.error("Error decrypting record:", error);
            return null;
          }
        })
      );

      // Filter out any failed decryptions
      const validData = decryptedData.filter(Boolean);
      console.log("Valid decrypted data:", validData);
      return validData;
    } catch (error) {
      console.error("Error getting chat history:", error);
      throw error;
    }
  }
}

export default new NillionService();
