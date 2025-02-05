const { SecretVaultWrapper } = require("nillion-sv-wrappers");
const dotenv = require("dotenv");
const fs = require("fs/promises");
const path = require("path");

// Load environment variables
dotenv.config({ path: ".env.local" });

const chatHistorySchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "array",
  items: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        format: "uuid",
        coerce: true,
      },
      user_address: {
        type: "string",
      },
      chat_history: {
        type: "object",
        properties: {
          $share: {
            type: "string",
          },
        },
        required: ["$share"],
      },
      timestamp: {
        type: "string",
        format: "date-time",
        coerce: true,
      },
      title: {
        type: "string",
      },
    },
    required: ["_id", "user_address", "chat_history", "timestamp"],
    additionalProperties: false,
  },
};

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
    console.log("🚀 Starting Nillion setup...");

    // 1. Initialize SecretVault wrapper
    console.log("\n1. Initializing SecretVault wrapper...");
    const org = new SecretVaultWrapper(
      orgConfig.nodes,
      orgConfig.orgCredentials
    );
    await org.init();
    console.log("✅ SecretVault wrapper initialized");

    // 2. Create schema if it doesn't exist
    console.log("\n2. Creating chat history schema...");
    const newSchema = await org.createSchema(
      chatHistorySchema,
      "AI Chat History"
    );
    const schemaId = newSchema[0].result.data;
    console.log("✅ Schema created with ID:", schemaId);

    // 3. Update .env.local with schema ID
    console.log("\n3. Updating .env.local file...");
    const envPath = path.join(process.cwd(), ".env.local");
    let envContent = await fs.readFile(envPath, "utf8");

    if (envContent.includes("NILLION_SCHEMA_ID=")) {
      envContent = envContent.replace(
        /NILLION_SCHEMA_ID=.*/,
        `NILLION_SCHEMA_ID=${schemaId}`
      );
    } else {
      envContent += `\nNILLION_SCHEMA_ID=${schemaId}`;
    }

    await fs.writeFile(envPath, envContent);
    console.log("✅ .env.local updated with schema ID");

    // 4. Test the setup with the new schema ID
    console.log("\n4. Testing the setup...");

    // Create a new wrapper instance with the schema ID
    const collection = new SecretVaultWrapper(
      orgConfig.nodes,
      orgConfig.orgCredentials,
      schemaId
    );
    await collection.init();

    const testData = [
      {
        _id: require("crypto").randomUUID(),
        user_address: "0xTestAddress",
        chat_history: { $allot: "Test chat history" },
        timestamp: new Date().toISOString(),
        title: "Test Chat",
      },
    ];

    console.log("Writing test data...");
    const writeResult = await collection.writeToNodes(testData);
    console.log("✅ Write test successful");

    console.log("Reading test data...");
    const readResult = await collection.readFromNodes({
      user_address: "0xTestAddress",
    });
    console.log("✅ Read test successful");
    console.log("Read result:", readResult);

    console.log("\n🎉 Setup completed successfully!");
    console.log("\nYou can now start your application with:");
    console.log("npm run dev");
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
}

main();
