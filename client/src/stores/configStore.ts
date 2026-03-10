import { create } from 'zustand';

interface ConfigState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  configPanelOpen: boolean;
  adminPanelOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  toggleConfigPanel: () => void;
  toggleAdminPanel: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  theme: (localStorage.getItem('workagent-theme') as 'light' | 'dark') || 'dark',
  sidebarOpen: true,
  configPanelOpen: false,
  adminPanelOpen: false,

  toggleTheme: () => set(state => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('workagent-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    return { theme: next };
  }),

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  toggleConfigPanel: () => set(state => ({ configPanelOpen: !state.configPanelOpen, adminPanelOpen: false })),
  toggleAdminPanel: () => set(state => ({ adminPanelOpen: !state.adminPanelOpen, configPanelOpen: false })),
}));
