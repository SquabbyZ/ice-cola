/**
 * Complete verification of all AI configuration
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function verifyAllConfiguration() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Complete AI Configuration Verification ===\n');

    // 1. Check model_catalog (used by Client)
    console.log('1. Model Catalog (Client uses this):');
    const catalog = await pool.query(`
      SELECT model_name, display_name, is_active
      FROM model_catalog
      ORDER BY rank ASC
    `);

    catalog.rows.forEach(model => {
      const status = model.is_active ? '✅ Active' : '❌ Inactive';
      console.log(`   ${status} - ${model.display_name} (${model.model_name})`);
    });

    // 2. Check ai_models (used by Admin)
    console.log('\n2. AI Models (Admin uses this):');
    const aiModels = await pool.query(`
      SELECT m.model_id, m.name, m.status, p.name as provider_name
      FROM ai_models m
      JOIN ai_providers p ON m.provider_id = p.id
      WHERE m.status = 'active'
      ORDER BY p.sort_order, m.sort_order
      LIMIT 5
    `);

    console.log(`   Found ${aiModels.rows.length} active models`);
    aiModels.rows.forEach(model => {
      console.log(`   ✅ ${model.name} (${model.model_id}) - ${model.provider_name}`);
    });

    // 3. Check API keys
    console.log('\n3. API Keys:');
    const apiKeys = await pool.query(`
      SELECT p.name, p.code, ak.is_active
      FROM ai_providers p
      JOIN ai_api_keys ak ON p.id = ak.provider_id
      WHERE ak.is_active = true
    `);

    apiKeys.rows.forEach(key => {
      console.log(`   ✅ ${key.name} (${key.code})`);
    });

    // 4. Check endpoints
    console.log('\n4. API Endpoints:');
    const endpoints = await pool.query(`
      SELECT p.name, e.endpoint_name, e.base_url, e.is_active
      FROM ai_endpoints e
      JOIN ai_providers p ON e.provider_id = p.id
      WHERE e.is_active = true
    `);

    endpoints.rows.forEach(ep => {
      console.log(`   ✅ ${ep.name}: ${ep.endpoint_name}`);
      console.log(`      ${ep.base_url}`);
    });

    // 5. Summary
    console.log('\n=== Configuration Summary ===');
    const activeCatalog = catalog.rows.filter(m => m.is_active).length;
    const activeAiModels = aiModels.rows.length;
    const activeKeys = apiKeys.rows.length;
    const activeEndpoints = endpoints.rows.length;

    console.log(`✅ Active models in catalog: ${activeCatalog}`);
    console.log(`✅ Active AI models: ${activeAiModels}`);
    console.log(`✅ Active API keys: ${activeKeys}`);
    console.log(`✅ Active endpoints: ${activeEndpoints}`);

    if (activeCatalog > 0 && activeKeys > 0 && activeEndpoints > 0) {
      console.log('\n✅ Configuration is COMPLETE!');
      console.log('\nNext steps:');
      console.log('1. Make sure Server is running on port 3000');
      console.log('2. Open Client at http://localhost:1420');
      console.log('3. Create a NEW conversation');
      console.log('4. Select a MiniMax model');
      console.log('5. Send a message - it should work now!');
    } else {
      console.log('\n❌ Configuration is INCOMPLETE!');
      if (activeCatalog === 0) console.log('   - No active models in catalog');
      if (activeKeys === 0) console.log('   - No active API keys');
      if (activeEndpoints === 0) console.log('   - No active endpoints');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyAllConfiguration();
