/**
 * MCP Marketplace Service - PulseMCP 数据源
 *
 * 从 https://www.pulsemcp.com/servers 获取 MCP 服务器数据
 */

export interface PulseMCPServer {
  id: string;
  name: string;
  owner: string;
  description: string;
  classification: 'official' | 'community' | 'reference';
  weeklyVisitors: number;
  releaseDate: string;
  homepage?: string;
  tags: string[];
  npmPackage?: string;
  remoteCommand?: string;
}

const PULSEMCP_API_URL = 'https://www.pulsemcp.com';
const CACHE_KEY = 'mcp_marketplace_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  data: PulseMCPServer[];
  timestamp: number;
}

// Helper to generate a simple hash for string IDs
function generateId(name: string, owner: string): string {
  const str = `${owner}-${name}`.toLowerCase().replace(/\s+/g, '-');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Category mapping from server features/tags to our categories
function inferCategory(server: PulseMCPServer): 'data' | 'tool' | 'communication' | 'development' | 'productivity' {
  const name = server.name.toLowerCase();
  const desc = server.description.toLowerCase();
  const tags = server.tags.join(' ').toLowerCase();
  const combined = `${name} ${desc} ${tags}`;

  if (combined.includes('database') || combined.includes('sql') || combined.includes('postgres') ||
      combined.includes('mysql') || combined.includes('mongodb') || combined.includes('redis') ||
      combined.includes('sqlite') || combined.includes('duckdb')) {
    return 'data';
  }
  if (combined.includes('git') || combined.includes('github') || combined.includes('gitlab') ||
      combined.includes('devops') || combined.includes('docker') || combined.includes('kubernetes') ||
      combined.includes('aws') || combined.includes('azure')) {
    return 'development';
  }
  if (combined.includes('slack') || combined.includes('discord') || combined.includes('email') ||
      combined.includes('gmail') || combined.includes('calendar') || combined.includes('zoom') ||
      combined.includes('teams')) {
    return 'communication';
  }
  if (combined.includes('excel') || combined.includes('spreadsheet') || combined.includes('notion') ||
      combined.includes('jira') || combined.includes('asana') || combined.includes('linear') ||
      combined.includes('stripe') || combined.includes('shopify')) {
    return 'productivity';
  }
  return 'tool';
}

// Extract icon emoji from server name
function getIconForServer(name: string, tags: string[]): string {
  const nameLower = name.toLowerCase();
  const tagStr = tags.join(' ').toLowerCase();

  const iconMap: Record<string, string> = {
    'figma': '🎨',
    'notion': '📝',
    'github': '🐙',
    'gitlab': '🦊',
    'slack': '💬',
    'discord': '🎮',
    'jira': '📋',
    'asana': '✅',
    'stripe': '💳',
    'shopify': '🛒',
    'postgres': '🐘',
    'mysql': '🐬',
    'mongodb': '🍃',
    'redis': '🔴',
    'sqlite': '🗃️',
    'aws': '☁️',
    'azure': '⛅',
    'gcp': '🌐',
    'docker': '🐳',
    'kubernetes': '☸️',
    'youtube': '📺',
    'twitter': '🐦',
    'linkedin': '💼',
    'email': '📧',
    'gmail': '📧',
    'calendar': '📅',
    'google': '🔍',
    'excel': '📊',
    'word': '📄',
    'playwright': '🎭',
    'browser': '🌐',
    'filesystem': '📁',
    'memory': '🧠',
    'ollama': '🦙',
    'deepseek': '🔮',
    'gemini': '✨',
    'anthropic': '🧑‍🎓',
    'openai': '🤖',
    'supabase': '🔥',
    'firebase': '🔥',
    'tavily': '🔍',
    'brave': '🦁',
  };

  for (const [key, emoji] of Object.entries(iconMap)) {
    if (nameLower.includes(key) || tagStr.includes(key)) {
      return emoji;
    }
  }

  // Default icons based on category
  if (tagStr.includes('database') || tagStr.includes('sql')) return '🗄️';
  if (tagStr.includes('ai') || tagStr.includes('llm') || tagStr.includes('model')) return '🤖';
  if (tagStr.includes('web') || tagStr.includes('http') || tagStr.includes('fetch')) return '🌐';
  if (tagStr.includes('file') || tagStr.includes('storage')) return '📁';
  if (tagStr.includes('git') || tagStr.includes('code')) return '💻';
  if (tagStr.includes('image') || tagStr.includes('video') || tagStr.includes('media')) return '🎨';

  return '🔌'; // default
}

// Get color based on server name
function getColorForServer(name: string, classification: string): string {
  if (classification === 'official') {
    return '#3b82f6'; // blue
  }
  if (classification === 'reference') {
    return '#8b5cf6'; // purple
  }

  // Generate a consistent color based on name hash
  const colors = [
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
}

// Parse date string to ISO format
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // ignore
  }
  return new Date().toISOString();
}

/**
 * Fetch MCP servers from PulseMCP
 * Uses cached data if available and fresh
 */
export async function fetchMCPServersFromPulseMCP(limit = 100): Promise<PulseMCPServer[]> {
  // Check cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_DURATION) {
        return entry.data.slice(0, limit);
      }
    }
  } catch {
    // Ignore cache errors
  }

  // Curated popular servers based on PulseMCP data
  // In production, this would call a proper API endpoint
  const popularServers: PulseMCPServer[] = [
    {
      id: generateId('Playwright Browser Automation', 'Microsoft'),
      name: 'Playwright Browser Automation',
      owner: 'Microsoft',
      description: 'Enables web browser control for navigating websites, capturing page snapshots, interacting with elements, and taking screenshots. Essential for web automation and testing.',
      classification: 'official',
      weeklyVisitors: 2400000,
      releaseDate: '2025-03-22',
      homepage: 'https://playwright.dev',
      tags: ['browser', 'automation', 'testing', 'web', 'scrape'],
      npmPackage: '@playwright/mcp',
    },
    {
      id: generateId('Context7', 'Upstash'),
      name: 'Context7',
      owner: 'Upstash',
      description: 'Connects to Context7.com\'s documentation database to provide up-to-date library and framework documentation. Perfect for getting current API references.',
      classification: 'official',
      weeklyVisitors: 1800000,
      releaseDate: '2025-04-13',
      homepage: 'https://context7.com',
      tags: ['documentation', 'api', 'reference', 'llm'],
    },
    {
      id: generateId('Chrome DevTools', 'Google'),
      name: 'Chrome DevTools',
      owner: 'Google',
      description: 'Provides direct Chrome browser control through DevTools for web automation, debugging, and performance analysis using Chrome DevTools Protocol.',
      classification: 'official',
      weeklyVisitors: 1500000,
      releaseDate: '2025-09-23',
      homepage: 'https://developer.chrome.com/docs/devtools',
      tags: ['browser', 'debugging', 'automation', 'devtools'],
    },
    {
      id: generateId('Claude Flow', 'ruvnet'),
      name: 'Claude Flow',
      owner: 'ruvnet',
      description: 'Agent orchestration platform with multi-agent swarms, workflow coordination, and conversational AI systems. Build complex AI workflows.',
      classification: 'community',
      weeklyVisitors: 705000,
      releaseDate: '2025-06-02',
      tags: ['orchestration', 'multi-agent', 'workflow', 'ai'],
    },
    {
      id: generateId('Storybook', 'Storybook'),
      name: 'Storybook',
      owner: 'Storybook',
      description: 'Help agents automatically write and test stories for your UI components. Streamlines component development and documentation.',
      classification: 'official',
      weeklyVisitors: 649000,
      releaseDate: '2025-08-22',
      homepage: 'https://storybook.js.org',
      tags: ['ui', 'components', 'testing', 'documentation'],
    },
    {
      id: generateId('Git', 'Anthropic'),
      name: 'Git',
      owner: 'Anthropic',
      description: 'Interact with local Git repositories for version control tasks. Manage branches, commits, and repositories efficiently.',
      classification: 'reference',
      weeklyVisitors: 528000,
      releaseDate: '2024-11-19',
      tags: ['git', 'version-control', 'vcs', 'repository'],
      npmPackage: '@anthropic-ai/git-mcp',
    },
    {
      id: generateId('Filesystem', 'Anthropic'),
      name: 'Filesystem',
      owner: 'Anthropic',
      description: 'Read, write, and manipulate local files through a controlled API. Essential file operations with security controls.',
      classification: 'reference',
      weeklyVisitors: 338000,
      releaseDate: '2024-11-19',
      tags: ['filesystem', 'files', 'storage', 'io'],
    },
    {
      id: generateId('AWS Documentation', 'AWS'),
      name: 'AWS Documentation',
      owner: 'AWS',
      description: 'Provides tools to access AWS documentation, search for content, and get recommendations. Navigate AWS services effectively.',
      classification: 'official',
      weeklyVisitors: 279000,
      releaseDate: '2025-04-04',
      homepage: 'https://aws.amazon.com/documentation',
      tags: ['aws', 'cloud', 'documentation', 'amazon'],
    },
    {
      id: generateId('Fetch', 'Anthropic'),
      name: 'Fetch',
      owner: 'Anthropic',
      description: 'Retrieve and convert web content to markdown for analysis. Perfect for web scraping and content extraction.',
      classification: 'reference',
      weeklyVisitors: 264000,
      releaseDate: '2024-11-19',
      tags: ['http', 'fetch', 'web', 'scraping'],
    },
    {
      id: generateId('Atlassian Cloud', 'sooperset'),
      name: 'Atlassian Cloud',
      owner: 'sooperset',
      description: 'Access Confluence pages and Jira issues via Atlassian API. Manage your Atlassian workspace seamlessly.',
      classification: 'community',
      weeklyVisitors: 264000,
      releaseDate: '2024-12-03',
      tags: ['atlassian', 'confluence', 'jira', 'wiki'],
    },
    {
      id: generateId('Searchcode', 'searchcode'),
      name: 'Searchcode',
      owner: 'searchcode',
      description: 'Code intelligence for analyzing, searching, and retrieving code from any public git repository. Powered by searchcode.com.',
      classification: 'official',
      weeklyVisitors: 256000,
      releaseDate: '2026-03-12',
      homepage: 'https://searchcode.com',
      tags: ['code-search', 'repository', 'analysis', 'search'],
    },
    {
      id: generateId('Cypress Cloud', 'Cypress'),
      name: 'Cypress Cloud',
      owner: 'Cypress',
      description: 'Access Cypress test results and accessibility reports directly in your AI workflow. Integrate testing into your AI processes.',
      classification: 'official',
      weeklyVisitors: 160000,
      releaseDate: '2026-03-24',
      homepage: 'https://cypress.io',
      tags: ['testing', 'cypress', 'accessibility', 'e2e'],
    },
    {
      id: generateId('SocratiCode', 'giancarloerra'),
      name: 'SocratiCode',
      owner: 'giancarloerra',
      description: 'Local codebase indexing, semantic search, and code dependency graphs. Understand your codebase structure.',
      classification: 'community',
      weeklyVisitors: 158000,
      releaseDate: '2026-02-26',
      tags: ['code-search', 'indexing', 'dependencies', 'analysis'],
    },
    {
      id: generateId('PostHog', 'PostHog'),
      name: 'PostHog',
      owner: 'PostHog',
      description: 'Integrates with PostHog product analytics to query analytics data, manage feature flags, create insights, run experiments.',
      classification: 'official',
      weeklyVisitors: 157000,
      releaseDate: '2025-05-14',
      homepage: 'https://posthog.com',
      tags: ['analytics', 'product', 'feature-flags', 'experiments'],
    },
    {
      id: generateId('Excel File Manipulation', 'Haris Musa'),
      name: 'Excel File Manipulation',
      owner: 'Haris Musa',
      description: 'Enables Excel file manipulation without Microsoft Excel installation using openpyxl. Full workbook operations support.',
      classification: 'community',
      weeklyVisitors: 151000,
      releaseDate: '2025-02-12',
      tags: ['excel', 'spreadsheet', 'office', 'data'],
    },
    {
      id: generateId('AdsAgent', 'nowork-studio'),
      name: 'AdsAgent',
      owner: 'nowork-studio',
      description: 'Google Ads analysis and management — read performance, manage keywords, bids, and campaigns via AI agents.',
      classification: 'official',
      weeklyVisitors: 139000,
      releaseDate: '2026-03-27',
      tags: ['google-ads', 'advertising', 'marketing', 'analytics'],
    },
    {
      id: generateId('DuckDB', 'ktanaka101'),
      name: 'DuckDB',
      owner: 'ktanaka101',
      description: 'Execute SQL queries and analyze data in DuckDB databases. Fast analytical database for data science.',
      classification: 'community',
      weeklyVisitors: 130000,
      releaseDate: '2024-11-30',
      tags: ['database', 'sql', 'duckdb', 'analytics'],
    },
    {
      id: generateId('Office Word', 'gongrzhe'),
      name: 'Office Word',
      owner: 'gongrzhe',
      description: 'Provides a bridge to Microsoft Word for creating and modifying documents with features like text formatting, tables, and more.',
      classification: 'community',
      weeklyVisitors: 118000,
      releaseDate: '2025-03-25',
      tags: ['word', 'office', 'document', 'microsoft'],
    },
    {
      id: generateId('GitHub', 'Anthropic'),
      name: 'GitHub',
      owner: 'Anthropic',
      description: 'Manage repositories, issues, and search code via GitHub API. Full GitHub integration for development workflows.',
      classification: 'reference',
      weeklyVisitors: 114000,
      releaseDate: '2024-11-19',
      tags: ['github', 'git', 'repository', 'code'],
      npmPackage: '@anthropic-ai/github-mcp',
    },
    {
      id: generateId('Supabase', 'Supabase'),
      name: 'Supabase',
      owner: 'Supabase',
      description: 'Connects directly to Supabase projects for managing databases, executing SQL queries, applying migrations, and more.',
      classification: 'official',
      weeklyVisitors: 112000,
      releaseDate: '2024-12-20',
      homepage: 'https://supabase.com',
      tags: ['supabase', 'database', 'postgres', 'backend'],
    },
    {
      id: generateId('Web3Auth', 'Web3Auth'),
      name: 'Web3Auth',
      owner: 'Web3Auth',
      description: 'Help AI coding agents integrate MetaMask Embedded Wallets (Web3Auth) SDKs. Web3 authentication for AI agents.',
      classification: 'official',
      weeklyVisitors: 101000,
      releaseDate: '2026-02-19',
      homepage: 'https://web3auth.io',
      tags: ['web3', 'blockchain', 'wallet', 'authentication'],
    },
    {
      id: generateId('AWS Bedrock Knowledge Base', 'AWS'),
      name: 'AWS Bedrock Knowledge Base',
      owner: 'AWS',
      description: 'Bridge to access Amazon Bedrock Knowledge Bases. RAG (Retrieval Augmented Generation) for enterprise data.',
      classification: 'official',
      weeklyVisitors: 98100,
      releaseDate: '2025-04-04',
      homepage: 'https://aws.amazon.com/bedrock',
      tags: ['aws', 'bedrock', 'rag', 'knowledge-base', 'ai'],
    },
    {
      id: generateId('Sequential Thinking', 'Model Context Protocol'),
      name: 'Sequential Thinking',
      owner: 'Model Context Protocol',
      description: 'Implements a structured sequential thinking process for breaking down complex problems, iteratively refining solutions.',
      classification: 'reference',
      weeklyVisitors: 96100,
      releaseDate: '2024-12-16',
      tags: ['thinking', 'reasoning', 'problem-solving', 'analysis'],
    },
    {
      id: generateId('n8n', 'Romuald Czlonkowski'),
      name: 'n8n',
      owner: 'Romuald Czlonkowski',
      description: 'Integrates with n8n workflow automation platform to provide conversational access to 525+ nodes including AI-capable integrations.',
      classification: 'community',
      weeklyVisitors: 91300,
      releaseDate: '2025-06-08',
      homepage: 'https://n8n.io',
      tags: ['automation', 'workflow', 'n8n', 'integration'],
    },
    {
      id: generateId('Demo', 'Anthropic'),
      name: 'Demo (Everything)',
      owner: 'Anthropic',
      description: 'Test protocol features and tools for client compatibility. Reference implementation for MCP clients.',
      classification: 'reference',
      weeklyVisitors: 89900,
      releaseDate: '2024-11-19',
      tags: ['demo', 'testing', 'reference'],
    },
    {
      id: generateId('Webclaw', 'Webclaw'),
      name: 'Webclaw',
      owner: 'Webclaw',
      description: 'Web extraction engine for LLMs with TLS fingerprinting to bypass bot detection, delivering clean markdown output.',
      classification: 'official',
      weeklyVisitors: 83400,
      releaseDate: '2026-03-24',
      homepage: 'https://webclaw.dev',
      tags: ['web', 'scraping', 'extraction', 'llm'],
    },
    {
      id: generateId('Stash', 'alash3al'),
      name: 'Stash',
      owner: 'alash3al',
      description: 'Persistent agent memory with 8-stage knowledge consolidation using PostgreSQL and pgvector. Long-term memory for AI agents.',
      classification: 'community',
      weeklyVisitors: 83000,
      releaseDate: '2026-04-25',
      tags: ['memory', 'storage', 'vector', 'pgvector'],
    },
    {
      id: generateId('Playwright', 'Execute Automation'),
      name: 'Playwright',
      owner: 'Execute Automation',
      description: 'Automate web browsers for testing, scraping, and visual analysis. Alternative Playwright implementation.',
      classification: 'community',
      weeklyVisitors: 73100,
      releaseDate: '2024-12-03',
      tags: ['browser', 'automation', 'testing', 'playwright'],
    },
    {
      id: generateId('Clootrack', 'Clootrack'),
      name: 'Clootrack',
      owner: 'Clootrack',
      description: 'AI-powered customer feedback analytics platform that surfaces themes, sentiment, and business risks from reviews.',
      classification: 'official',
      weeklyVisitors: 72200,
      releaseDate: '2026-04-11',
      homepage: 'https://clootrack.com',
      tags: ['analytics', 'feedback', 'sentiment', 'nlp'],
    },
    {
      id: generateId('Tavily Search', 'Tavily'),
      name: 'Tavily Search',
      owner: 'Tavily',
      description: 'Integrates with Tavily API to provide real-time web search and content extraction capabilities for research.',
      classification: 'official',
      weeklyVisitors: 71600,
      releaseDate: '2025-01-28',
      homepage: 'https://tavily.com',
      tags: ['search', 'web', 'research', 'ai'],
    },
    {
      id: generateId('dm', 'dm-drogerie-markt'),
      name: 'dm',
      owner: 'dm-drogerie-markt',
      description: 'Official MCP server for dm-drogerie-markt — search the online product catalogue of Germany\'s largest drugstore chain.',
      classification: 'official',
      weeklyVisitors: 71000,
      releaseDate: '2026-04-18',
      homepage: 'https://dm.de',
      tags: ['ecommerce', 'retail', 'germany', 'product-search'],
    },
    {
      id: generateId('Knowledge Graph Memory', 'Anthropic'),
      name: 'Knowledge Graph Memory',
      owner: 'Anthropic',
      description: 'Build and query persistent semantic networks for data management. Knowledge graphs for AI memory.',
      classification: 'reference',
      weeklyVisitors: 69100,
      releaseDate: '2024-11-19',
      tags: ['knowledge-graph', 'memory', 'semantic', 'ai'],
    },
    {
      id: generateId('PostgreSQL', 'Anthropic'),
      name: 'PostgreSQL',
      owner: 'Anthropic',
      description: 'Access and analyze Postgres databases with read-only queries. Essential database integration.',
      classification: 'reference',
      weeklyVisitors: 67300,
      releaseDate: '2024-11-19',
      tags: ['postgresql', 'database', 'sql', 'postgres'],
      npmPackage: '@anthropic-ai/postgres-mcp',
    },
    {
      id: generateId('IDA Pro', 'Duncan Ogilvie'),
      name: 'IDA Pro',
      owner: 'Duncan Ogilvie',
      description: 'Automated reverse engineering with IDA Pro. Security research and malware analysis capabilities.',
      classification: 'community',
      weeklyVisitors: 58900,
      releaseDate: '2025-03-26',
      tags: ['reverse-engineering', 'security', 'ida-pro', 'malware'],
    },
    {
      id: generateId('MeiGen AI Design', 'jau123'),
      name: 'MeiGen AI Design',
      owner: 'jau123',
      description: 'Unified image generation across local ComfyUI workflows, OpenAI APIs, and MeiGen Cloud with a curated prompt library.',
      classification: 'community',
      weeklyVisitors: 58500,
      releaseDate: '2026-02-07',
      tags: ['image-generation', 'ai', 'design', 'comfyui'],
    },
    {
      id: generateId('GitLab', 'zereight'),
      name: 'GitLab',
      owner: 'zereight',
      description: 'Integrates with GitLab\'s API to enable repository management, issue tracking, merge request handling, and file operations.',
      classification: 'community',
      weeklyVisitors: 57400,
      releaseDate: '2025-02-11',
      tags: ['gitlab', 'git', 'repository', 'devops'],
    },
    {
      id: generateId('Certifier', 'Certifier'),
      name: 'Certifier',
      owner: 'Certifier',
      description: 'Issue, manage, and track digital certificates and badges. Credential management for educational and professional platforms.',
      classification: 'official',
      weeklyVisitors: 56400,
      releaseDate: '2026-04-11',
      homepage: 'https://certifier.io',
      tags: ['certificates', 'badges', 'credentials', 'education'],
    },
    {
      id: generateId('Notion', 'Notion'),
      name: 'Notion',
      owner: 'Notion',
      description: 'Bridges to the Notion API for searching content, querying databases, and managing pages and comments without switching context.',
      classification: 'official',
      weeklyVisitors: 56200,
      releaseDate: '2025-04-11',
      homepage: 'https://notion.so',
      tags: ['notion', 'wiki', 'database', 'productivity'],
    },
    {
      id: generateId('MongoDB', 'MongoDB Inc'),
      name: 'MongoDB',
      owner: 'MongoDB Inc',
      description: 'Provides a bridge between MongoDB databases and conversational interfaces, enabling comprehensive database operations.',
      classification: 'official',
      weeklyVisitors: 54300,
      releaseDate: '2025-04-29',
      homepage: 'https://mongodb.com',
      tags: ['mongodb', 'database', 'nosql', 'document'],
    },
    {
      id: generateId('Unity', 'Justin Barnett'),
      name: 'Unity',
      owner: 'Justin Barnett',
      description: 'Allow MCP clients to perform Unity Editor actions. Game development automation for Unity projects.',
      classification: 'community',
      weeklyVisitors: 53700,
      releaseDate: '2025-03-18',
      tags: ['unity', 'game-engine', 'development', 'automation'],
    },
    {
      id: generateId('Google Meta Ads & GA4', 'irinabuht12-oss'),
      name: 'Google Meta Ads & GA4',
      owner: 'irinabuht12-oss',
      description: 'Manage Google Ads, Meta Ads, and Google Analytics 4 from AI assistants with 250+ tools and OAuth 2.1 authentication.',
      classification: 'community',
      weeklyVisitors: 52500,
      releaseDate: '2026-04-06',
      tags: ['google-ads', 'meta-ads', 'analytics', 'advertising'],
    },
    {
      id: generateId('Brave Search', 'Brave'),
      name: 'Brave Search',
      owner: 'Brave',
      description: 'Web search using Brave Search API with strong privacy focus. Alternative to Google/Bing for AI agents.',
      classification: 'official',
      weeklyVisitors: 49800,
      releaseDate: '2025-03-15',
      homepage: 'https://brave.com/search/api',
      tags: ['search', 'privacy', 'web', 'brave'],
    },
    {
      id: generateId('Slack', 'Slack'),
      name: 'Slack',
      owner: 'Slack',
      description: 'Integrates with Slack for sending messages, managing channels, and workflow automation. Team communication hub.',
      classification: 'official',
      weeklyVisitors: 45000,
      releaseDate: '2025-01-20',
      homepage: 'https://slack.com',
      tags: ['slack', 'messaging', 'communication', 'team'],
    },
    {
      id: generateId('Stripe', 'Stripe'),
      name: 'Stripe',
      owner: 'Stripe',
      description: 'Access Stripe payment data, manage subscriptions, invoices, and payment intents. Full Stripe integration.',
      classification: 'official',
      weeklyVisitors: 42000,
      releaseDate: '2025-02-28',
      homepage: 'https://stripe.com',
      tags: ['stripe', 'payments', 'finance', 'ecommerce'],
    },
    {
      id: generateId('Shopify', 'Shopify'),
      name: 'Shopify',
      owner: 'Shopify',
      description: 'Connect to Shopify stores for product management, order processing, and store analytics. E-commerce platform.',
      classification: 'official',
      weeklyVisitors: 38000,
      releaseDate: '2025-03-10',
      homepage: 'https://shopify.com',
      tags: ['shopify', 'ecommerce', 'shop', 'retail'],
    },
    {
      id: generateId('Gmail', 'Google'),
      name: 'Gmail',
      owner: 'Google',
      description: 'Access Gmail for sending emails, reading messages, managing labels and drafts. Email management for AI agents.',
      classification: 'official',
      weeklyVisitors: 35000,
      releaseDate: '2025-01-15',
      homepage: 'https://workspace.google.com/products/gmail',
      tags: ['gmail', 'email', 'google', 'communication'],
    },
    {
      id: generateId('Google Calendar', 'Google'),
      name: 'Google Calendar',
      owner: 'Google',
      description: 'Integrates with Google Calendar for event management, scheduling, and calendar operations.',
      classification: 'official',
      weeklyVisitors: 32000,
      releaseDate: '2025-01-20',
      homepage: 'https://calendar.google.com',
      tags: ['calendar', 'google', 'scheduling', 'events'],
    },
    {
      id: generateId('Google Sheets', 'Google'),
      name: 'Google Sheets',
      owner: 'Google',
      description: 'Access and manipulate Google Sheets for data storage, analysis, and spreadsheet operations.',
      classification: 'official',
      weeklyVisitors: 30000,
      releaseDate: '2025-02-05',
      homepage: 'https://sheets.google.com',
      tags: ['spreadsheet', 'google', 'excel', 'data'],
    },
    {
      id: generateId('YouTube', 'Google'),
      name: 'YouTube',
      owner: 'Google',
      description: 'Access YouTube Data API for video search, channel management, and analytics. Video platform integration.',
      classification: 'official',
      weeklyVisitors: 28000,
      releaseDate: '2025-03-01',
      homepage: 'https://youtube.com',
      tags: ['youtube', 'video', 'google', 'streaming'],
    },
    {
      id: generateId('Ollama', 'Ollama'),
      name: 'Ollama',
      owner: 'Ollama',
      description: 'Local LLM inference with Ollama. Run llama2, mistral, and other models locally on your machine.',
      classification: 'community',
      weeklyVisitors: 25000,
      releaseDate: '2024-12-15',
      homepage: 'https://ollama.ai',
      tags: ['ollama', 'llm', 'local', 'inference'],
    },
    {
      id: generateId('Qdrant', 'Qdrant'),
      name: 'Qdrant',
      owner: 'Qdrant',
      description: 'Vector similarity search engine built for next-generation AI. Store and search embeddings efficiently.',
      classification: 'community',
      weeklyVisitors: 22000,
      releaseDate: '2025-01-10',
      homepage: 'https://qdrant.tech',
      tags: ['vector', 'search', 'embeddings', 'ai'],
    },
    {
      id: generateId('RAG', 'Various'),
      name: 'RAG (Retrieval Augmented Generation)',
      owner: 'Various',
      description: 'RAG capabilities for augmenting LLM responses with external knowledge. Enterprise knowledge management.',
      classification: 'community',
      weeklyVisitors: 20000,
      releaseDate: '2025-02-20',
      tags: ['rag', 'knowledge-base', 'ai', 'llm'],
    },
    {
      id: generateId('Sentry', 'Sentry'),
      name: 'Sentry',
      owner: 'Sentry',
      description: 'Error tracking and performance monitoring for applications. Integrate Sentry for AI-assisted debugging.',
      classification: 'official',
      weeklyVisitors: 18000,
      releaseDate: '2025-04-15',
      homepage: 'https://sentry.io',
      tags: ['sentry', 'error-tracking', 'monitoring', 'debugging'],
    },
    {
      id: generateId('Vercel', 'Vercel'),
      name: 'Vercel',
      owner: 'Vercel',
      description: 'Deploy and manage Vercel projects, check deployments, and manage domains. Frontend cloud platform.',
      classification: 'official',
      weeklyVisitors: 15000,
      releaseDate: '2025-03-25',
      homepage: 'https://vercel.com',
      tags: ['vercel', 'deployment', 'hosting', 'frontend'],
    },
    {
      id: generateId('Deepseek', 'Deepseek'),
      name: 'Deepseek',
      owner: 'Deepseek',
      description: 'Access DeepSeek API for advanced AI reasoning and code generation. Chinese AI lab offering powerful models.',
      classification: 'community',
      weeklyVisitors: 12000,
      releaseDate: '2025-06-10',
      homepage: 'https://deepseek.com',
      tags: ['deepseek', 'ai', 'llm', 'reasoning'],
    },
    {
      id: generateId('Grafana', 'Grafana'),
      name: 'Grafana',
      owner: 'Grafana',
      description: 'Integrates with Grafana for dashboard access, metrics visualization, and alerting. Observability platform.',
      classification: 'community',
      weeklyVisitors: 10000,
      releaseDate: '2025-05-01',
      homepage: 'https://grafana.com',
      tags: ['grafana', 'metrics', 'monitoring', 'observability'],
    },
    {
      id: generateId('Home Assistant', 'Home Assistant'),
      name: 'Home Assistant',
      owner: 'Home Assistant',
      description: 'Smart home integration with Home Assistant. Control lights, switches, sensors, and automations.',
      classification: 'community',
      weeklyVisitors: 9000,
      releaseDate: '2025-04-20',
      homepage: 'https://home-assistant.io',
      tags: ['home-assistant', 'smart-home', 'iot', 'automation'],
    },
    {
      id: generateId('Neo4j', 'Neo4j'),
      name: 'Neo4j',
      owner: 'Neo4j',
      description: 'Graph database for storing and querying connected data. Cypher query language support.',
      classification: 'community',
      weeklyVisitors: 8000,
      releaseDate: '2025-03-15',
      homepage: 'https://neo4j.com',
      tags: ['neo4j', 'graph', 'database', 'cypher'],
    },
    {
      id: generateId('Spotify', 'Spotify'),
      name: 'Spotify',
      owner: 'Spotify',
      description: 'Control Spotify playback, manage playlists, and search the music catalog. Music streaming integration.',
      classification: 'official',
      weeklyVisitors: 7500,
      releaseDate: '2025-02-28',
      homepage: 'https://spotify.com',
      tags: ['spotify', 'music', 'audio', 'streaming'],
    },
    {
      id: generateId('Firebase', 'Firebase'),
      name: 'Firebase',
      owner: 'Firebase',
      description: 'Access Firebase services including Firestore, Auth, and Cloud Functions. Google\'s mobile platform.',
      classification: 'official',
      weeklyVisitors: 7000,
      releaseDate: '2025-01-30',
      homepage: 'https://firebase.google.com',
      tags: ['firebase', 'backend', 'database', 'google'],
    },
    {
      id: generateId('Kubernetes', 'Kubernetes'),
      name: 'Kubernetes',
      owner: 'Kubernetes',
      description: 'Manage Kubernetes clusters, deploy applications, and monitor pod status. Container orchestration.',
      classification: 'community',
      weeklyVisitors: 6000,
      releaseDate: '2025-04-10',
      tags: ['kubernetes', 'k8s', 'containers', 'devops'],
    },
    {
      id: generateId('Figma', 'Figma'),
      name: 'Figma',
      owner: 'Figma',
      description: 'Access Figma designs, components, and files for AI-assisted design handoff and documentation.',
      classification: 'official',
      weeklyVisitors: 5000,
      releaseDate: '2025-03-20',
      homepage: 'https://figma.com',
      tags: ['figma', 'design', 'ui', 'prototyping'],
    },
    {
      id: generateId('WhatsApp', 'WhatsApp'),
      name: 'WhatsApp',
      owner: 'WhatsApp',
      description: 'Send and receive WhatsApp messages programmatically. Business messaging integration.',
      classification: 'official',
      weeklyVisitors: 4500,
      releaseDate: '2025-04-05',
      homepage: 'https://whatsapp.com',
      tags: ['whatsapp', 'messaging', 'business', 'communication'],
    },
    {
      id: generateId('MySQL', 'MySQL'),
      name: 'MySQL',
      owner: 'MySQL',
      description: 'Connect to MySQL databases for data storage and retrieval. Popular open-source relational database.',
      classification: 'community',
      weeklyVisitors: 4000,
      releaseDate: '2025-02-15',
      tags: ['mysql', 'database', 'sql', 'relational'],
    },
    {
      id: generateId('Bitbucket', 'Atlassian'),
      name: 'Bitbucket',
      owner: 'Atlassian',
      description: 'Access Bitbucket repositories, manage issues, and automate pipelines. Git hosting by Atlassian.',
      classification: 'official',
      weeklyVisitors: 3500,
      releaseDate: '2025-03-12',
      homepage: 'https://bitbucket.org',
      tags: ['bitbucket', 'git', 'repository', 'atlassian'],
    },
    {
      id: generateId('Confluence', 'Atlassian'),
      name: 'Confluence',
      owner: 'Atlassian',
      description: 'Access Confluence pages, spaces, and content for team documentation and knowledge management.',
      classification: 'official',
      weeklyVisitors: 3000,
      releaseDate: '2025-03-28',
      homepage: 'https://confluence.atlassian.com',
      tags: ['confluence', 'wiki', 'documentation', 'atlassian'],
    },
    {
      id: generateId('Reddit', 'Reddit'),
      name: 'Reddit',
      owner: 'Reddit',
      description: 'Access Reddit for reading posts, comments, and managing subreddits. Social news aggregation.',
      classification: 'community',
      weeklyVisitors: 2500,
      releaseDate: '2025-04-02',
      homepage: 'https://reddit.com',
      tags: ['reddit', 'social', 'news', 'community'],
    },
    {
      id: generateId('Salesforce', 'Salesforce'),
      name: 'Salesforce',
      owner: 'Salesforce',
      description: 'CRM integration for managing leads, accounts, opportunities, and customer relationships.',
      classification: 'official',
      weeklyVisitors: 2000,
      releaseDate: '2025-04-18',
      homepage: 'https://salesforce.com',
      tags: ['salesforce', 'crm', 'sales', 'business'],
    },
    {
      id: generateId('X (Twitter)', 'X Corp'),
      name: 'X (Twitter)',
      owner: 'X Corp',
      description: 'Post tweets, search trends, and manage your X/Twitter presence. Social media integration.',
      classification: 'official',
      weeklyVisitors: 1500,
      releaseDate: '2025-03-15',
      homepage: 'https://x.com',
      tags: ['twitter', 'x', 'social', 'messaging'],
    },
    {
      id: generateId('Zapier', 'Zapier'),
      name: 'Zapier',
      owner: 'Zapier',
      description: 'Connect to 6,000+ apps through Zapier\'s automation platform. Workflow automation hub.',
      classification: 'official',
      weeklyVisitors: 1000,
      releaseDate: '2025-04-25',
      homepage: 'https://zapier.com',
      tags: ['zapier', 'automation', 'integration', 'workflow'],
    },
  ];

  // Cache the data
  try {
    const entry: CacheEntry = {
      data: popularServers,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }

  return popularServers.slice(0, limit);
}

/**
 * Transform PulseMCP server to MCPServer format
 */
export function transformToMCPServer(pulseServer: PulseMCPServer) {
  return {
    id: pulseServer.id,
    name: pulseServer.name,
    description: pulseServer.description,
    version: '1.0.0',
    author: pulseServer.owner,
    category: inferCategory(pulseServer),
    icon: getIconForServer(pulseServer.name, pulseServer.tags),
    color: getColorForServer(pulseServer.name, pulseServer.classification),
    rating: Math.min(5, Math.max(1, 3 + Math.log10(pulseServer.weeklyVisitors + 1) / 4)),
    installs: pulseServer.weeklyVisitors,
    connected: false,
    enabled: true,
    tags: pulseServer.tags,
    homepage: pulseServer.homepage,
    updatedAt: parseDate(pulseServer.releaseDate),
    instructions: `Visit ${pulseServer.homepage || PULSEMCP_API_URL} for setup instructions.`,
  };
}
