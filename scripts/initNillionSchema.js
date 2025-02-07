import { SecretVaultWrapper } from 'nillion-sv-wrappers';
import config from '../nillionConfig/nillion.json' assert { type: 'json' };
import schema from '../nillionConfig/chatSchema.json' assert { type: 'json' };

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
    const newSchema = await org.createSchema(schema, 'Chat History');
    console.log('📚 New Schema:', newSchema);

    // Save the schema ID
    const fs = await import('fs');
    await fs.promises.writeFile(
      './nillionConfig/schemaId.json',
      JSON.stringify({ schemaId: newSchema[0].result.data }, null, 2)
    );
    console.log('📝 Schema ID saved to config');
  } catch (error) {
    console.error('❌ Failed to initialize schema:', error.message);
    process.exit(1);
  }
}

main(); 