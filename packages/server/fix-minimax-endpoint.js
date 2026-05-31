/**
 * Fix MiniMax API endpoint
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function fixMinimaxEndpoint() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Fixing MiniMax API Endpoint ===\n');

    // Update MiniMax endpoint to correct base URL
    const result = await pool.query(`
      UPDATE ai_endpoints
      SET base_url = 'https://api.minimax.chat/v1',
          updated_at = NOW()
      WHERE endpoint_name = 'MiniMax Official API'
      RETURNING *
    `);

    if (result.rows.length > 0) {
      console.log('✅ Updated MiniMax endpoint:');
      console.log(`   Base URL: ${result.rows[0].base_url}`);
    } else {
      console.log('❌ MiniMax endpoint not found');
    }

    console.log('\n📝 Note: MiniMax API base URL is https://api.minimax.chat/v1');
    console.log('   The actual endpoint will be: https://api.minimax.chat/v1/text/chatcompletion_v2');
    console.log('   This is handled by the server code when making requests.');

    console.log('\n✅ Done! Please restart the server.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixMinimaxEndpoint();
