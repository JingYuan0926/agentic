import { SecretVaultWrapper } from 'nillion-sv-wrappers';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the config and schema
const nillionConfig = JSON.parse(
  fs.readFileSync(join(__dirname, '..', 'config', 'nillion.json'), 'utf8')
);
const schema = JSON.parse(
  fs.readFileSync(join(__dirname, '..', 'config', 'chatSchema.json'), 'utf8')
);

// First, let's create nillion.json from the existing config
const nillionConfigContent = {
  orgConfig: {
    orgCredentials: {
      secretKey: 'ad462103b2b9f81101a907005a8aa9ec1ff319b05d200dea2dd20e9dac5537ca',
      orgDid: 'did:nil:testnet:nillion1mxquknh937j3gz0kl8sdkwy33krml5f5ya7fdw',
    },
    nodes: [
      {
        url: 'https://nildb-zy8u.nillion.network',
        did: 'did:nil:testnet:nillion1fnhettvcrsfu8zkd5zms4d820l0ct226c3zy8u',
      },
      {
        url: 'https://nildb-rl5g.nillion.network',
        did: 'did:nil:testnet:nillion14x47xx85de0rg9dqunsdxg8jh82nvkax3jrl5g',
      },
      {
        url: 'https://nildb-lpjp.nillion.network',
        did: 'did:nil:testnet:nillion167pglv9k7m4gj05rwj520a46tulkff332vlpjp',
      },
    ],
  }
};

// Write the config file if it doesn't exist
if (!fs.existsSync(join(__dirname, '..', 'config', 'nillion.json'))) {
  fs.writeFileSync(
    join(__dirname, '..', 'config', 'nillion.json'),
    JSON.stringify(nillionConfigContent, null, 2)
  );
}

async function main() {
  try {
    const org = new SecretVaultWrapper(
      nillionConfig.orgConfig.nodes,
      nillionConfig.orgConfig.orgCredentials
    );
    await org.init();

    const collectionName = 'Chat Messages';
    const newSchema = await org.createSchema(schema, collectionName);
    console.log('✅ New Collection Schema created:', newSchema);
    console.log('Schema ID:', newSchema[0].result.data);

    // Write the schema ID to a file for later use
    fs.writeFileSync(
      join(__dirname, '..', 'config', 'schemaId.json'),
      JSON.stringify({ schemaId: newSchema[0].result.data }, null, 2)
    );

  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

main(); 