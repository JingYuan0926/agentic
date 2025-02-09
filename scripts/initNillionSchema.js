import { SecretVaultWrapper } from 'nillion-sv-wrappers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read config files
const config = JSON.parse(readFileSync(join(__dirname, '../nillionConfig/nillion.json'), 'utf8'));
const schema = JSON.parse(readFileSync(join(__dirname, '../nillionConfig/chatSchema.json'), 'utf8'));

async function main() {
  try {
    const org = new SecretVaultWrapper(
      config.orgConfig.nodes,
      config.orgConfig.orgCredentials
    );
    await org.init();

    // Delete existing schema if it exists
    try {
      const schemas = await org.listSchemas();
      for (const schema of schemas) {
        await org.deleteSchema(schema.id);
        console.log(`📚 Deleted schema: ${schema.id}`);
      }
    } catch (error) {
      console.log('No existing schemas to delete');
    }

    // Create new schema
    const newSchema = await org.createSchema(schema, 'AI Chat History');
    console.log('📚 New Schema:', newSchema);

    // Save the schema ID
    const fs = await import('fs/promises');
    await fs.writeFile(
      join(__dirname, '../nillionConfig/schemaId.json'),
      JSON.stringify({ schemaId: newSchema[0].result.data }, null, 2)
    );
    console.log('📝 Schema ID saved to config');
  } catch (error) {
    console.error('❌ Failed to initialize schema:', error.message);
    process.exit(1);
  }
}

main(); 