/**
 * Check conversations and their model selections
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function checkConversations() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Checking Conversations ===\n');

    // Check conversations table structure
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'conversations'
      ORDER BY ordinal_position
    `);

    console.log('Conversations table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check if there are any conversations with model_id
    const conversations = await pool.query(`
      SELECT id, title, model_id, created_at
      FROM conversations
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\nFound ${conversations.rows.length} conversations:`);
    if (conversations.rows.length > 0) {
      conversations.rows.forEach(conv => {
        console.log(`  - ${conv.title || 'Untitled'}`);
        console.log(`    Model ID: ${conv.model_id || 'None'}`);
        console.log(`    Created: ${conv.created_at}`);
      });

      // Check if any conversation is using gpt-4o-mini
      const gptConversations = await pool.query(`
        SELECT id, title, model_id
        FROM conversations
        WHERE model_id LIKE '%gpt-4o-mini%'
      `);

      if (gptConversations.rows.length > 0) {
        console.log(`\n⚠️  Found ${gptConversations.rows.length} conversations using gpt-4o-mini:`);
        gptConversations.rows.forEach(conv => {
          console.log(`  - ${conv.title || 'Untitled'} (ID: ${conv.id})`);
        });
        console.log('\nSolution: Clear these conversations or update their model_id');
      }
    } else {
      console.log('  No conversations found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkConversations();
