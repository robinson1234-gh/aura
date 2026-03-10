import { useState } from 'react';
import {
  Bot, Key, Cpu, FileText, Brain, User, Database, FolderOpen, ArrowLeft,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useConfigStore } from '../../stores/configStore';
import { AgentSettings } from './AgentSettings';
import { LLMSettings } from './LLMSettings';
import { WorkspaceSettings } from './WorkspaceSettings';
import { MdEditor } from './MdEditor';
import { MemoryManager } from './MemoryManager';

type Section =
  | 'agents'
  | 'llm'
  | 'workspace'
  | 'agent-md'
  | 'skill'
  | 'identity'
  | 'memory'
  | 'user';

interface NavItem {
  id: Section;
  label: string;
  icon: typeof Bot;
  group: 'global' | 'workspace';
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'agents', label: 'Agents', icon: Cpu, group: 'global', description: 'Manage agent selection and health' },
  { id: 'llm', label: 'LLM', icon: Key, group: 'global', description: 'Configure LLM provider and API keys' },
  { id: 'workspace', label: 'Directory', icon: FolderOpen, group: 'workspace', description: 'Set working directory' },
  { id: 'agent-md', label: 'Agent', icon: Bot, group: 'workspace', description: 'Agent behavior and instructions' },
  { id: 'skill', label: 'Skill', icon: FileText, group: 'workspace', description: 'Skills and capabilities' },
  { id: 'identity', label: 'Identity', icon: Brain, group: 'workspace', description: 'Persona and soul' },
  { id: 'memory', label: 'Memory', icon: Database, group: 'workspace', description: 'Context and memory' },
  { id: 'user', label: 'User', icon: User, group: 'workspace', description: 'User preferences' },
];

export function SettingsPage() {
  const { activeWorkspace } = useWorkspaceStore();
  const { toggleConfigPanel } = useConfigStore();
  const [section, setSection] = useState<Section>('agents');

  const activeItem = NAV_ITEMS.find(n => n.id === section)!;
  const globalItems = NAV_ITEMS.filter(n => n.group === 'global');
  const workspaceItems = NAV_ITEMS.filter(n => n.group === 'workspace');

  const renderContent = () => {
    if (section === 'agents') {
      return <AgentSettings />;
    }
    if (section === 'llm') {
      return <LLMSettings />;
    }
    if (section === 'workspace') {
      if (!activeWorkspace) return <NoWorkspace />;
      return <WorkspaceSettings workspacePath={activeWorkspace.path} />;
    }

    if (!activeWorkspace) return <NoWorkspace />;

    if (section === 'memory') {
      return (
        <MemoryManager
          key={`${activeWorkspace.path}-memory`}
          workspacePath={activeWorkspace.path}
        />
      );
    }

    const configs: Record<string, { filename: string; title: string; description: string; placeholder: string }> = {
      'agent-md': {
        filename: 'AGENT.md',
        title: 'Agent Configuration',
        description: 'Define how the AI agent should behave, what tools to prioritize, and overall operating instructions for this workspace.',
        placeholder: '# Agent Instructions\n\nYou are a coding assistant for this project.\n\n## Behavior\n- Always write TypeScript\n- Use functional components\n- Follow clean architecture\n\n## Tools\n- Prefer cursor_agent for complex refactors\n- Use shell for running tests',
      },
      'skill': {
        filename: 'SKILL.md',
        title: 'Skills',
        description: 'Define the technical skills, knowledge, and capabilities the agent should have when working in this workspace.',
        placeholder: '# Skills\n\n- React 18 with TypeScript\n- Tailwind CSS\n- Node.js/Express backend\n- SQLite database\n- WebSocket real-time communication',
      },
      'identity': {
        filename: 'IDENTITY.md',
        title: 'Identity / Persona',
        description: 'Define the agent\'s personality, communication style, and persona. This shapes how the agent responds and interacts.',
        placeholder: '# Identity\n\n## Persona\nYou are a senior full-stack developer with 10 years of experience.\n\n## Communication Style\n- Be concise and precise\n- Prefer code over lengthy explanations\n- Use technical language appropriate for the audience\n\n## Values\n- Code quality over speed\n- Maintainability and readability',
      },
      'user': {
        filename: 'USER.md',
        title: 'User Preferences',
        description: 'Define user-specific preferences, working habits, and personal instructions for the agent.',
        placeholder: '# User Preferences\n\n## Working Style\n- I prefer to see code changes directly\n- Show me the plan before implementing\n- Use Chinese for comments when needed\n\n## Environment\n- Windows 10\n- VS Code / Cursor IDE\n- PowerShell terminal',
      },
    };

    const cfg = configs[section];
    if (!cfg) return null;

    return (
      <MdEditor
        key={`${activeWorkspace.path}-${section}`}
        workspacePath={activeWorkspace.path}
        filename={cfg.filename}
        title={cfg.title}
        description={cfg.description}
        placeholder={cfg.placeholder}
      />
    );
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Settings sidebar */}
      <div className="w-56 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-900 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={toggleConfigPanel}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          <div className="px-3 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
              Global
            </p>
          </div>
          {globalItems.map(item => (
            <NavButton
              key={item.id}
              item={item}
              active={section === item.id}
              onClick={() => setSection(item.id)}
            />
          ))}

          <div className="px-3 mt-4 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
              Workspace
            </p>
            {activeWorkspace && (
              <p className="text-[10px] text-slate-400 px-2 font-mono truncate" title={activeWorkspace.path}>
                {activeWorkspace.path}
              </p>
            )}
          </div>
          {workspaceItems.map(item => (
            <NavButton
              key={item.id}
              item={item}
              active={section === item.id}
              disabled={!activeWorkspace && item.group === 'workspace'}
              onClick={() => setSection(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
        {renderContent()}
      </div>
    </div>
  );
}

function NavButton({
  item, active, disabled, onClick,
}: {
  item: NavItem; active: boolean; disabled?: boolean; onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-5 py-2 text-sm transition-colors text-left
        ${active
          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-r-2 border-primary-500'
          : disabled
            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-medium">{item.label}</span>
    </button>
  );
}

function NoWorkspace() {
  return (
    <div className="flex items-center justify-center h-full text-center">
      <div className="space-y-2">
        <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
        <p className="text-sm text-slate-400">Select a workspace first</p>
        <p className="text-xs text-slate-400">Choose a workspace from the sidebar to configure its settings.</p>
      </div>
    </div>
  );
}
