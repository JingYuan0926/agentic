import { SecretVaultWrapper } from "nillion-sv-wrappers";
import { chatHistorySchema } from "../schema/chatHistory.js";
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
    const org = new SecretVaultWrapper(
      orgConfig.nodes,
      orgConfig.orgCredentials
    );
    await org.init();

    // Create schema
    const newSchema = await org.createSchema(
      chatHistorySchema,
      "AI Chat History"
    );
    console.log("✅ New Schema created:", newSchema);
    console.log("Schema ID:", newSchema[0].result.data);

    // Add the Schema ID to your .env.local file
    console.log("\nAdd this to your .env.local file:");
    console.log(`NILLION_SCHEMA_ID=${newSchema[0].result.data}`);
  } catch (error) {
    console.error("❌ Failed to create schema:", error.message);
    process.exit(1);
  }
}

main();
