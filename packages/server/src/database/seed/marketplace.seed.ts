import { DatabaseService } from '../database.service';
import { MCP_SERVERS_SEED } from './mcp-servers.seed';
import { EXPERTS_SEED } from './experts.seed';
import { SKILLS_SEED } from './skills.seed';
import { EXTENSIONS_SEED } from './extensions.seed';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function inferCategory(tags: string[]): string {
  const tagStr = tags.join(' ').toLowerCase();
  if (tagStr.includes('database') || tagStr.includes('sql')) return 'data';
  if (tagStr.includes('git') || tagStr.includes('devops') || tagStr.includes('docker')) return 'development';
  if (tagStr.includes('slack') || tagStr.includes('email') || tagStr.includes('calendar')) return 'communication';
  if (tagStr.includes('excel') || tagStr.includes('notion') || tagStr.includes('jira')) return 'productivity';
  return 'tool';
}

function getIcon(name: string): string {
  const map: Record<string, string> = {
    github: '🐙', gitlab: '🦊', slack: '💬', discord: '🎮', jira: '📋',
    notion: '📝', figma: '🎨', stripe: '💳', shopify: '🛒', postgres: '🐘',
    mysql: '🐬', mongodb: '🍃', redis: '🔴', sqlite: '🗃️', aws: '☁️',
    azure: '⛅', docker: '🐳', kubernetes: '☸️', youtube: '📺', gmail: '📧',
    calendar: '📅', google: '🔍', excel: '📊', playwright: '🎭', browser: '🌐',
    filesystem: '📁', memory: '🧠', ollama: '🦙', deepseek: '🔮', supabase: '🔥',
    firebase: '🔥', tavily: '🔍', brave: '🦁', sentry: '🎯', vercel: '▲',
    grafana: '📈', neo4j: '🔗', spotify: '🎵', reddit: '🤖', salesforce: '☁️',
    zapier: '⚡', whatsapp: '📱', bitbucket: '🔀', confluence: '📖', x: '🐦',
    atlassian: '🔧', duckdb: '🦆', home: '🏠', unity: '🎮',
    certifier: '🏅', webclaw: '🕷️', stash: '📦', clootrack: '📊', adsagent: '📢',
    n8n: '🔄', searchcode: '🔍', socrati: '🔎', posthog: '🦔', web3auth: '🔐',
  };
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(map)) {
    if (lower.includes(key)) return emoji;
  }
  return '🔌';
}

function getColor(name: string, classification: string): string {
  if (classification === 'official') return '#3b82f6';
  if (classification === 'reference') return '#8b5cf6';
  const colors = ['#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

export async function seedMarketplaceData(db: DatabaseService): Promise<void> {
  console.log('Seeding MCP servers...');
  let mcpCount = 0;
  for (const server of MCP_SERVERS_SEED) {
    const id = generateUUID();
    const category = inferCategory(server.tags);
    const icon = getIcon(server.name);
    const color = getColor(server.name, server.classification);
    const rating = Math.min(5, Math.max(1, 3 + Math.log10(server.weeklyVisitors + 1) / 4));
    try {
      await db.query(
        `INSERT INTO mcp_servers (id, name, description, version, author, category, icon, color, tags, homepage, repository, enabled, config_schema, instructions, ratings, installs, team_id, created_at, updated_at)
         VALUES ($1, $2, $3, '1.0.0', $4, $5, $6, $7, $8, $9, NULL, true, NULL, $10, $11, $12, NULL, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [id, server.name, server.description, server.owner, category, icon, color, server.tags, server.homepage || null, `Visit ${server.homepage || 'https://www.pulsemcp.com'} for setup instructions.`, rating.toFixed(2), server.weeklyVisitors]
      );
      mcpCount++;
    } catch (e: any) {
      // Skip duplicates silently
    }
  }
  console.log(`Seeded ${mcpCount} MCP servers`);

  console.log('Seeding experts...');
  let expertCount = 0;
  for (const expert of EXPERTS_SEED) {
    const id = generateUUID();
    try {
      await db.query(
        `INSERT INTO experts (id, "teamId", name, description, "systemPrompt", icon, color, category, rating, is_default, call_count, enabled, "createdAt", "updatedAt")
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, false, 0, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [id, expert.name, expert.description, expert.systemPrompt, expert.icon, expert.color, expert.category, expert.rating.toFixed(2)]
      );
      expertCount++;
    } catch (e: any) {
      // Skip duplicates silently
    }
  }
  console.log(`Seeded ${expertCount} experts`);

  console.log('Seeding skills...');
  let skillCount = 0;
  for (const skill of SKILLS_SEED) {
    const id = generateUUID();
    try {
      await db.query(
        `INSERT INTO skills (id, name, description, version, icon, category, tags, content, config_schema, config, status, team_id, author_id, marketplace_id, ratings, installs, created_at, updated_at)
         VALUES ($1, $2, $3, '1.0.0', $4, $5, $6, $7, NULL, NULL, 'marketplace', NULL, NULL, $8, $9, $10, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [id, skill.name, skill.description, skill.icon, skill.category, skill.tags, skill.content, skill.id, skill.rating.toFixed(2), skill.installs]
      );
      skillCount++;
    } catch (e: any) {
      // Skip duplicates silently
    }
  }
  console.log(`Seeded ${skillCount} skills`);

  console.log('Seeding extensions...');
  let extCount = 0;
  for (const ext of EXTENSIONS_SEED) {
    const id = generateUUID();
    try {
      await db.query(
        `INSERT INTO extensions (id, name, description, version, author, category, icon, color, rating, downloads, homepage, repository, "teamId", enabled, tags, instructions, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, true, $13, $14, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [id, ext.name, ext.description, ext.version, ext.author, ext.category, ext.icon, ext.color, ext.rating.toFixed(2), ext.downloads, ext.homepage || null, ext.repository || null, ext.tags, ext.instructions || null]
      );
      extCount++;
    } catch (e: any) {
      // Skip duplicates silently
    }
  }
  console.log(`Seeded ${extCount} extensions`);

  console.log(`Marketplace seeding complete: ${mcpCount} MCP servers, ${expertCount} experts, ${skillCount} skills, ${extCount} extensions`);
}
