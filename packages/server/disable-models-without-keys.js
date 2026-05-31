/**
 * Disable models for providers without API keys
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function disableModelsWithoutApiKeys() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Disabling models without API keys ===\n');

    // Find providers without active API keys
    const providersWithoutKeys = await pool.query(`
      SELECT p.id, p.name, p.code, COUNT(m.id) as model_count
      FROM ai_providers p
      LEFT JOIN ai_api_keys ak ON p.id = ak.provider_id AND ak.is_active = true
      JOIN ai_models m ON p.id = m.provider_id
      WHERE ak.id IS NULL AND m.status = 'active'
      GROUP BY p.id, p.name, p.code
      ORDER BY p.name
    `);

    if (providersWithoutKeys.rows.length === 0) {
      console.log('✅ All active models have API keys configured!');
      await pool.end();
      return;
    }

    console.log('Found providers without API keys:');
    providersWithoutKeys.rows.forEach(p => {
      console.log(`  - ${p.name} (${p.code}): ${p.model_count} active models`);
    });

    // Disable models for providers without API keys
    console.log('\nDisabling models...');
    for (const provider of providersWithoutKeys.rows) {
      await pool.query(`
        UPDATE ai_models
        SET status = 'inactive', updated_at = NOW()
        WHERE provider_id = $1 AND status = 'active'
      `, [provider.id]);
      console.log(`  ✅ Disabled ${provider.model_count} models for ${provider.name}`);
    }

    // Show remaining active models
    console.log('\n=== Active models after cleanup ===');
    const activeModels = await pool.query(`
      SELECT p.name as provider_name, p.code as provider_code,
             COUNT(m.id) as model_count
      FROM ai_providers p
      JOIN ai_models m ON p.id = m.provider_id
      WHERE m.status = 'active'
      GROUP BY p.id, p.name, p.code
      ORDER BY p.name
    `);

    activeModels.rows.forEach(row => {
      console.log(`  ✅ ${row.provider_name} (${row.provider_code}): ${row.model_count} models`);
    });

    console.log('\n✅ Done! Restart the client to see the changes.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

disableModelsWithoutApiKeys();
