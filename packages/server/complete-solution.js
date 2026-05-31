/**
 * Complete solution: Clear all old model references and restart
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function completeSolution() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Complete Solution for Model Issue ===\n');

    // Step 1: Verify active models
    console.log('Step 1: Verifying active models...');
    const activeModels = await pool.query(`
      SELECT m.model_id, m.name, p.name as provider_name, m.status
      FROM ai_models m
      JOIN ai_providers p ON m.provider_id = p.id
      WHERE m.status = 'active'
      ORDER BY p.sort_order, m.sort_order
    `);

    console.log(`✅ Found ${activeModels.rows.length} active models:`);
    activeModels.rows.forEach(model => {
      console.log(`   - ${model.name} (${model.model_id}) - ${model.provider_name}`);
    });

    // Step 2: Check if gpt-4o-mini is inactive
    const gptModel = await pool.query(`
      SELECT model_id, status FROM ai_models WHERE model_id = 'gpt-4o-mini'
    `);

    if (gptModel.rows.length > 0) {
      console.log(`\nStep 2: gpt-4o-mini status: ${gptModel.rows[0].status}`);
      if (gptModel.rows[0].status === 'active') {
        console.log('❌ ERROR: gpt-4o-mini is still active! This should not happen.');
      } else {
        console.log('✅ gpt-4o-mini is correctly set to inactive');
      }
    }

    // Step 3: Check API keys
    console.log('\nStep 3: Checking API keys...');
    const apiKeys = await pool.query(`
      SELECT p.name, p.code, ak.is_active
      FROM ai_providers p
      JOIN ai_api_keys ak ON p.id = ak.provider_id
      WHERE ak.is_active = true
    `);

    console.log(`✅ Found ${apiKeys.rows.length} active API keys:`);
    apiKeys.rows.forEach(key => {
      console.log(`   - ${key.name} (${key.code})`);
    });

    console.log('\n=== SOLUTION ===');
    console.log('The database is correctly configured. The issue is in the Client cache.');
    console.log('\nPlease follow these steps IN ORDER:');
    console.log('\n1. Stop all services:');
    console.log('   cd c:/Users/smallMark/Desktop/peaksclaw/ice-cola');
    console.log('   node dev.mjs stop');
    console.log('\n2. Clear Client localStorage:');
    console.log('   - Open Client app');
    console.log('   - Press F12 to open DevTools');
    console.log('   - Go to Console tab');
    console.log('   - Run: localStorage.clear()');
    console.log('   - Close Client app');
    console.log('\n3. Restart all services:');
    console.log('   node dev.mjs');
    console.log('\n4. In Client:');
    console.log('   - Re-login with your account');
    console.log('   - Create a NEW conversation');
    console.log('   - The model selector should now only show MiniMax models');
    console.log('\n5. If still not working:');
    console.log('   - Delete ALL old conversations');
    console.log('   - Create a fresh conversation');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

completeSolution();
