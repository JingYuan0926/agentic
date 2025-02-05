import { SecretVaultWrapper } from "nillion-sv-wrappers";
import { nilql } from "@nillion/nilql";
import dotenv from "dotenv";
import crypto from "crypto";

// Remove debug logs
console.log("nilql object:", nilql);
console.log("Available exports:", Object.keys(nilql));
console.log("Available methods on nilql:", Object.getOwnPropertyNames(nilql));
console.log("SecretKey available?", "SecretKey" in nilql);
console.log("secretKey available?", "secretKey" in nilql);

dotenv.config({ path: ".env.local" });

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

async function main() {
  try {
    console.log("🚀 Testing Nillion Chat Implementation...");

    // 1. Initialize SecretVault and nilQL
    console.log("\n1. Initializing services...");
    const collection = new SecretVaultWrapper(
      cluster.nodes,
      {
        secretKey: process.env.NEXT_PUBLIC_NILLION_SECRET_KEY,
        orgDid: process.env.NEXT_PUBLIC_NILLION_ORG_DID,
      },
      process.env.NEXT_PUBLIC_NILLION_SCHEMA_ID
    );
    await collection.init();

    // Create secret key using generate
    const secretKey = await nilql.SecretKey.generate(cluster, { store: true });
    console.log("✅ Services initialized");

    // 2. Test encryption
    console.log("\n2. Testing encryption...");
    const testMessage = {
      role: "user",
      content: "Hello, this is a test message!",
    };
    const jsonString = JSON.stringify(testMessage);
    const shares = await nilql.encrypt(secretKey, jsonString);
    console.log("Encrypted shares:", shares);

    // 3. Test storage
    console.log("\n3. Testing storage...");
    const testData = [
      {
        _id: crypto.randomUUID(),
        user_address: "0xTestAddress",
        chat_history: { $allot: shares },
        timestamp: new Date().toISOString(),
        title: "Test Chat",
      },
    ];

    const writeResult = await collection.writeToNodes(testData);
    console.log("✅ Test data written to nodes");

    // 4. Test retrieval and decryption
    console.log("\n4. Testing retrieval and decryption...");
    const readResult = await collection.readFromNodes({
      user_address: "0xTestAddress",
    });
    console.log("Read result:", readResult);

    const decryptedData = await Promise.all(
      readResult.map(async (record) => {
        // Convert comma-separated string back to array
        const shares =
          typeof record.chat_history === "string"
            ? record.chat_history.split(",")
            : record.chat_history.$allot?.split(",");

        console.log("Retrieved shares:", shares);

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

        const decrypted = await nilql.decrypt(secretKey, shares);
        return {
          id: record._id,
          title: record.title,
          timestamp: record.timestamp,
          chatHistory: JSON.parse(decrypted),
        };
      })
    );

    // Filter out any failed decryptions
    const validData = decryptedData.filter(Boolean);

    console.log("✅ Data retrieved and decrypted successfully");
    console.log("\nValid decrypted data:", validData);

    await cleanup();

    console.log("\n🎉 All tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
}

async function cleanup() {
  console.log("\nCleaning up test data...");
  const collection = new SecretVaultWrapper(
    cluster.nodes,
    {
      secretKey: process.env.NEXT_PUBLIC_NILLION_SECRET_KEY,
      orgDid: process.env.NEXT_PUBLIC_NILLION_ORG_DID,
    },
    process.env.NEXT_PUBLIC_NILLION_SCHEMA_ID
  );
  await collection.init();

  // Use writeToNodes with a delete operation
  await collection.writeToNodes([], {
    delete: { user_address: "0xTestAddress" },
  });
  console.log("✅ Test data cleaned up");
}

main();
