import fs from 'fs';
import path from 'path';
import os from 'os';
import type { WorkspaceConfig } from '../types/index.js';

const WORKSPACE_DIR = path.join(os.homedir(), '.workagent', 'workspaces');

export class ConfigService {
  resolveConfig(workspacePath: string): WorkspaceConfig {
    const parts = workspacePath.split('/');
    let skills = '';
    let soul = '';
    let agent = '';
    let identity = '';
    let memory = '';
    let user = '';
    const settings: Record<string, unknown> = {};

    for (let i = 1; i <= parts.length; i++) {
      const partialPath = parts.slice(0, i).join('/');
      const dir = path.join(WORKSPACE_DIR, partialPath);

      const skillContent = this.readFile(path.join(dir, 'SKILL.md'));
      if (skillContent) {
        skills += (skills ? '\n\n---\n\n' : '') + `## ${partialPath}\n\n${skillContent}`;
      }

      const soulContent = this.readFile(path.join(dir, 'SOUL.md'));
      if (soulContent) {
        if (soulContent.startsWith('@extend')) {
          soul += '\n\n' + soulContent.replace('@extend', '').trim();
        } else {
          soul = soulContent;
        }
      }

      const resolveAppend = (existing: string, filename: string) => {
        const content = this.readFile(path.join(dir, filename));
        if (!content) return existing;
        if (content.startsWith('@extend')) {
          return existing + '\n\n' + content.replace('@extend', '').trim();
        }
        return content;
      };

      agent = resolveAppend(agent, 'AGENT.md');
      identity = resolveAppend(identity, 'IDENTITY.md');
      memory = resolveAppend(memory, 'MEMORY.md');
      user = resolveAppend(user, 'USER.md');

      const configContent = this.readFile(path.join(dir, 'config.json'));
      if (configContent) {
        try {
          Object.assign(settings, JSON.parse(configContent));
        } catch {
          // skip invalid config
        }
      }
    }

    return { skills, soul, agent, identity, memory, user, settings };
  }

  getFile(workspacePath: string, filename: string): string {
    const dir = path.join(WORKSPACE_DIR, workspacePath);
    return this.readFile(path.join(dir, filename)) || '';
  }

  saveFile(workspacePath: string, filename: string, content: string): void {
    const dir = path.join(WORKSPACE_DIR, workspacePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), content, 'utf-8');
  }

  getSkill(workspacePath: string): string {
    return this.getFile(workspacePath, 'SKILL.md');
  }

  getSoul(workspacePath: string): string {
    return this.getFile(workspacePath, 'SOUL.md');
  }

  saveSkill(workspacePath: string, content: string): void {
    this.saveFile(workspacePath, 'SKILL.md', content);
  }

  saveSoul(workspacePath: string, content: string): void {
    this.saveFile(workspacePath, 'SOUL.md', content);
  }

  getSettings(workspacePath: string): Record<string, unknown> {
    const dir = path.join(WORKSPACE_DIR, workspacePath);
    const content = this.readFile(path.join(dir, 'config.json'));
    if (!content) return {};
    try {
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  saveSettings(workspacePath: string, settings: Record<string, unknown>): void {
    const dir = path.join(WORKSPACE_DIR, workspacePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(settings, null, 2), 'utf-8');
  }

  ensureDefaultConfigs(): void {
    this.ensureFile('tech', 'SKILL.md', '# Tech Domain Skills\n\nYou are a software engineering assistant. Write clean, well-structured code with proper error handling.\n');
    this.ensureFile('tech', 'SOUL.md', '# Tech Soul\n\nBe concise and precise. Prefer code over lengthy explanations. Follow best practices and design patterns.\n');
    this.ensureFile('tech', 'AGENT.md', '# Agent Configuration\n\nPrioritize code quality. Use cursor_agent for complex multi-file changes. Run tests after modifications.\n');
    this.ensureFile('tech', 'IDENTITY.md', '# Identity\n\nYou are a senior software engineer. Communicate clearly and technically.\n');
    this.ensureFile('tech/project', 'SKILL.md', '# Project Skills\n\nFollow clean architecture principles. Use TypeScript where applicable. Write unit tests for critical logic.\n');
    this.ensureFile('dataanalysis', 'SKILL.md', '# Data Analysis Skills\n\nYou are a data analysis assistant. Use Python with pandas, numpy, and visualization libraries.\n');
    this.ensureFile('dataanalysis', 'SOUL.md', '# Data Analysis Soul\n\nBe thorough in analysis. Always explain your methodology. Provide visualizations when possible.\n');
    this.ensureFile('dataanalysis/EDA', 'SKILL.md', '# EDA Skills\n\nPerform exploratory data analysis. Check for missing values, outliers, and data distributions. Create summary statistics.\n');
  }

  private ensureFile(wsPath: string, filename: string, defaultContent: string): void {
    const filePath = path.join(WORKSPACE_DIR, wsPath, filename);
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, defaultContent, 'utf-8');
    }
  }

  private readFile(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }
}
