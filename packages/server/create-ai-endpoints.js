/**
 * Create ai_endpoints table
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function createAiEndpoints() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Creating ai_endpoints Table ===\n');

    // Create ai_endpoints table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_endpoints (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        endpoint_name VARCHAR(255) NOT NULL,
        base_url TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ai_endpoints_provider FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Created ai_endpoints table');

    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_endpoints_provider_id ON ai_endpoints(provider_id);
    `);
    console.log('✅ Created index on provider_id');

    // Get MiniMax provider ID
    const miniMaxProvider = await pool.query(`
      SELECT id FROM ai_providers WHERE code = 'minimax'
    `);

    if (miniMaxProvider.rows.length === 0) {
      console.log('❌ MiniMax provider not found!');
      return;
    }

    const providerId = miniMaxProvider.rows[0].id;

    // Insert MiniMax endpoint
    await pool.query(`
      INSERT INTO ai_endpoints (id, provider_id, endpoint_name, base_url, is_active, is_default, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [
      'minimax-default-endpoint',
      providerId,
      'MiniMax Official API',
      'https://api.minimax.chat/v1'
    ]);
    console.log('✅ Added MiniMax endpoint');

    // Verify
    const endpoints = await pool.query(`
      SELECT e.endpoint_name, e.base_url, e.is_active, p.name as provider_name
      FROM ai_endpoints e
      JOIN ai_providers p ON e.provider_id = p.id
      WHERE e.is_active = true
    `);

    console.log(`\n✅ Active endpoints (${endpoints.rows.length}):`);
    endpoints.rows.forEach(ep => {
      console.log(`   - ${ep.provider_name}: ${ep.endpoint_name}`);
      console.log(`     URL: ${ep.base_url}`);
    });

    console.log('\n✅ Done! Please restart the server.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAiEndpoints();
