import { SecretVaultWrapper } from "nillion-sv-wrappers";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const orgConfig = {
  orgCredentials: {
    secretKey: process.env.NILLION_SECRET_KEY,
    orgDid: process.env.NILLION_ORG_DID,
  },
  nodes: [
    {
      url: "https://nildb-zy8u.nillion.network",
      did: "did:nil:testnet:nillion1fnhettvcrsfu8zkd5zms4d820l0ct226c3zy8u",
    },
    {
      url: "https://nildb-rl5g.nillion.network",
      did: "did:nil:testnet:nillion14x47xx85de0rg9dqunsdxg8jh82nvkax3jrl5g",
    },
    {
      url: "https://nildb-lpjp.nillion.network",
      did: "did:nil:testnet:nillion167pglv9k7m4gj05rwj520a46tulkff332vlpjp",
    },
  ],
};

async function main() {
  try {
    console.log("Initializing SecretVault wrapper...");
    const collection = new SecretVaultWrapper(
      orgConfig.nodes,
      orgConfig.orgCredentials,
      process.env.NILLION_SCHEMA_ID
    );
    await collection.init();

    // Test data
    const testData = [
      {
        user_address: "0xTestAddress",
        chat_history: { $allot: "Test chat history" },
        timestamp: new Date().toISOString(),
        title: "Test Chat",
      },
    ];

    console.log("Writing test data...");
    const result = await collection.writeToNodes(testData);
    console.log("Write result:", result);

    console.log("Reading data back...");
    const readResult = await collection.readFromNodes({
      user_address: "0xTestAddress",
    });
    console.log("Read result:", readResult);

    console.log("✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main();
