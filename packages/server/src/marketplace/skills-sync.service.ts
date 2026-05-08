import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from '../database/database.service';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
  topics: string[];
  created_at: string;
  updated_at: string;
}

@Injectable()
export class SkillsSyncService {
  private readonly GITHUB_TOPICS_API = 'https://api.github.com/search/repositories';

  constructor(private readonly db: DatabaseService) {}

  async syncFromSkillsSh(): Promise<{
    categoriesCreated: number;
    skillsCreated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let categoriesCreated = 0;
    let skillsCreated = 0;

    try {
      const repos = await this.fetchGitHubSkills();
      const categoryMap = await this.syncCategories(repos, errors);
      categoriesCreated = categoryMap.size;
      const result = await this.syncSkills(repos, categoryMap, errors);
      skillsCreated = result.skillsCreated;

      return { categoriesCreated, skillsCreated, errors };
    } catch (error) {
      errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { categoriesCreated, skillsCreated, errors };
    }
  }

  private async fetchGitHubSkills(): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 30;

    try {
      const response = await axios.get(`${this.GITHUB_TOPICS_API}`, {
        params: {
          q: 'topic:agent-skill in:readme',
          sort: 'stars',
          order: 'desc',
          per_page: perPage,
          page: page,
        },
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'IceCola-Marketplace/1.0',
        },
        timeout: 30000,
      });

      const items = response.data?.items || [];
      for (const item of items) {
        repos.push({
          id: item.id,
          name: item.name,
          full_name: item.full_name,
          description: item.description || '',
          html_url: item.html_url,
          stargazers_count: item.stargazers_count || 0,
          language: item.language || 'Unknown',
          topics: item.topics || [],
          created_at: item.created_at,
          updated_at: item.updated_at,
        });
      }
    } catch (error) {
      console.error('Failed to fetch GitHub skills:', error);
    }

    return repos;
  }

  private async syncCategories(
    repos: GitHubRepo[],
    errors: string[]
  ): Promise<Map<string, number>> {
    const categoryMap = new Map<string, number>();
    const categorySet = new Set<string>();

    for (const repo of repos) {
      if (repo.language) categorySet.add(repo.language);
      if (repo.topics) {
        repo.topics.forEach(topic => {
          if (topic.startsWith('skill-') || topic === 'agent-skill') {
            categorySet.add(topic.replace(/^skill-/, '').replace(/-/g, ' '));
          }
        });
      }
    }

    if (categorySet.size === 0) {
      categorySet.add('General');
    }

    for (const catName of categorySet) {
      const slug = this.slugify(catName);
      try {
        const existing = await this.db.queryOne(
          'SELECT id FROM marketplace_categories WHERE slug = $1',
          [slug]
        );

        if (!existing) {
          const result = await this.db.queryOne(
            `INSERT INTO marketplace_categories (name, slug, description, item_type, sort_order)
             VALUES ($1, $2, $3, 'skill', 0)
             RETURNING id`,
            [catName, slug, `Category from GitHub topic: agent-skill`]
          );
          if (result) categoryMap.set(catName, result.id);
        } else {
          categoryMap.set(catName, existing.id);
        }
      } catch (err) {
        errors.push(`Category ${catName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return categoryMap;
  }

  private async syncSkills(
    repos: GitHubRepo[],
    categoryMap: Map<string, number>,
    errors: string[]
  ): Promise<{ skillsCreated: number }> {
    let skillsCreated = 0;

    for (const repo of repos) {
      try {
        const sourceId = `github-${repo.id}`;
        const existing = await this.db.queryOne(
          'SELECT id FROM marketplace_items WHERE source_id = $1 AND type = $2',
          [sourceId, 'skill']
        );

        const categoryName = repo.language || 'General';
        const categoryId = categoryMap.get(categoryName) || null;

        if (existing) {
          await this.db.query(
            `UPDATE marketplace_items
             SET name = $1, description = $2, category_id = $3,
                 install_count = $4, rating = $5, updated_at = NOW()
             WHERE id = $6`,
            [repo.name, repo.description, categoryId, repo.stargazers_count, Math.min(repo.stargazers_count / 10, 5), existing.id]
          );
        } else {
          await this.db.query(
            `INSERT INTO marketplace_items
             (type, name, slug, description, version, author_id, category_id,
              tags, status, source_id, install_count, rating)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              'skill', repo.name, this.slugify(repo.name), repo.description,
              '1.0.0', '00000000-0000-0000-0000-000000000000',
              categoryId, repo.topics.slice(0, 5), 'approved', sourceId,
              repo.stargazers_count, Math.min(repo.stargazers_count / 10, 5),
            ]
          );
          skillsCreated++;
        }
      } catch (err) {
        errors.push(`Skill ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return { skillsCreated };
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  }
}
