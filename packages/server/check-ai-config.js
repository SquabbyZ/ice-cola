/**
 * Check AI models and API keys configuration
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function checkAiConfiguration() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Checking AI Configuration ===\n');

    // Check API keys
    console.log('1. Configured API Keys:');
    const apiKeys = await pool.query(`
      SELECT ak.id, ak.provider_id, ap.name as provider_name, ap.code as provider_code,
             ak.key_name, ak.is_active
      FROM ai_api_keys ak
      JOIN ai_providers ap ON ak.provider_id = ap.id
      ORDER BY ak.is_active DESC, ap.name
    `);

    if (apiKeys.rows.length === 0) {
      console.log('   ❌ No API keys configured!');
    } else {
      apiKeys.rows.forEach(key => {
        const status = key.is_active ? '✅ Active' : '❌ Inactive';
        console.log(`   ${status} - ${key.provider_name} (${key.provider_code}) - ${key.key_name}`);
      });
    }

    // Check available models
    console.log('\n2. Available Models (first 10):');
    const models = await pool.query(`
      SELECT m.id, m.name, m.model_id, p.name as provider_name, p.code as provider_code, m.status
      FROM ai_models m
      JOIN ai_providers p ON m.provider_id = p.id
      WHERE m.status = 'active'
      ORDER BY p.sort_order, m.sort_order
      LIMIT 10
    `);

    models.rows.forEach(model => {
      console.log(`   - ${model.name} (${model.model_id}) - Provider: ${model.provider_name}`);
    });

    // Check which models have API keys
    console.log('\n3. Models with configured API keys:');
    const modelsWithKeys = await pool.query(`
      SELECT DISTINCT p.name as provider_name, p.code as provider_code,
             COUNT(m.id) as model_count
      FROM ai_providers p
      JOIN ai_models m ON p.id = m.provider_id
      JOIN ai_api_keys ak ON p.id = ak.provider_id
      WHERE m.status = 'active' AND ak.is_active = true
      GROUP BY p.id, p.name, p.code
      ORDER BY p.name
    `);

    if (modelsWithKeys.rows.length === 0) {
      console.log('   ❌ No models have configured API keys!');
    } else {
      modelsWithKeys.rows.forEach(row => {
        console.log(`   ✅ ${row.provider_name} (${row.provider_code}) - ${row.model_count} models available`);
      });
    }

    // Check default endpoints
    console.log('\n4. Configured Endpoints:');
    const endpoints = await pool.query(`
      SELECT e.id, e.provider_id, p.name as provider_name, p.code as provider_code,
             e.endpoint_name, e.base_url, e.is_active, e.is_default
      FROM ai_endpoints e
      JOIN ai_providers p ON e.provider_id = p.id
      WHERE e.is_active = true
      ORDER BY e.is_default DESC, p.name
    `);

    if (endpoints.rows.length === 0) {
      console.log('   ❌ No endpoints configured!');
    } else {
      endpoints.rows.forEach(ep => {
        const isDefault = ep.is_default ? ' (Default)' : '';
        console.log(`   ✅ ${ep.provider_name} - ${ep.endpoint_name}${isDefault}`);
        console.log(`      URL: ${ep.base_url}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkAiConfiguration();
