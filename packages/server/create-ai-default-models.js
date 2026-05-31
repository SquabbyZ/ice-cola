/**
 * Create ai_default_models table
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function createAiDefaultModels() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Creating ai_default_models Table ===\n');

    // Create ai_default_models table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_default_models (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        model_id VARCHAR(255) NOT NULL,
        config_id VARCHAR(255),
        use_case VARCHAR(100),
        is_system_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ai_default_models_provider FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE,
        CONSTRAINT fk_ai_default_models_model FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Created ai_default_models table');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_default_models_provider ON ai_default_models(provider_id);
      CREATE INDEX IF NOT EXISTS idx_ai_default_models_use_case ON ai_default_models(use_case);
    `);
    console.log('✅ Created indexes');

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAiDefaultModels();
