/**
 * Check active models and find gpt-4o-mini
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function checkActiveModels() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Checking Active Models ===\n');

    // Check if gpt-4o-mini is still active
    const gptModel = await pool.query(`
      SELECT m.id, m.name, m.model_id, m.status, p.name as provider_name, p.code as provider_code
      FROM ai_models m
      JOIN ai_providers p ON m.provider_id = p.id
      WHERE m.model_id = 'gpt-4o-mini'
    `);

    if (gptModel.rows.length > 0) {
      console.log('Found gpt-4o-mini model:');
      gptModel.rows.forEach(model => {
        console.log(`  - ${model.name} (${model.model_id})`);
        console.log(`    Provider: ${model.provider_name} (${model.provider_code})`);
        console.log(`    Status: ${model.status}`);
      });
    } else {
      console.log('gpt-4o-mini model not found in database');
    }

    // Check all active models
    console.log('\n=== All Active Models ===');
    const activeModels = await pool.query(`
      SELECT m.id, m.name, m.model_id, p.name as provider_name, p.code as provider_code
      FROM ai_models m
      JOIN ai_providers p ON m.provider_id = p.id
      WHERE m.status = 'active'
      ORDER BY p.sort_order, m.sort_order
    `);

    if (activeModels.rows.length === 0) {
      console.log('❌ No active models found!');
    } else {
      console.log(`Found ${activeModels.rows.length} active models:`);
      activeModels.rows.forEach(model => {
        console.log(`  - ${model.name} (${model.model_id}) - ${model.provider_name}`);
      });
    }

    // Check which providers have API keys
    console.log('\n=== Providers with API Keys ===');
    const providersWithKeys = await pool.query(`
      SELECT p.name, p.code, ak.key_name, ak.is_active
      FROM ai_providers p
      JOIN ai_api_keys ak ON p.id = ak.provider_id
      WHERE ak.is_active = true
      ORDER BY p.name
    `);

    if (providersWithKeys.rows.length === 0) {
      console.log('❌ No active API keys found!');
    } else {
      providersWithKeys.rows.forEach(row => {
        console.log(`  ✅ ${row.name} (${row.code}) - ${row.key_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkActiveModels();
