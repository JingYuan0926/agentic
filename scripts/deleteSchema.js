import { SecretVaultWrapper } from 'nillion-sv-wrappers';
import config from '../nillionConfig/nillion.json' assert { type: 'json' };
import schemaConfig from '../nillionConfig/schemaId.json' assert { type: 'json' };

async function main() {
  try {
    const org = new SecretVaultWrapper(
      config.orgConfig.nodes,
      config.orgConfig.orgCredentials
    );
    await org.init();

    // Delete the existing schema
    await org.deleteSchema(schemaConfig.schemaId);
    console.log('📚 Schema deleted successfully');
  } catch (error) {
    console.error('❌ Failed to delete schema:', error.message);
    process.exit(1);
  }
}

main(); 