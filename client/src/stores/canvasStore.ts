import { create } from 'zustand';

export interface CanvasItem {
  id: string;
  title: string;
  language: string;
  content: string;
  originalContent: string;
  type: 'code' | 'document' | 'diagram';
  createdAt: string;
  messageId?: string;
}

interface CanvasState {
  isOpen: boolean;
  items: CanvasItem[];
  activeItemId: string | null;

  openCanvas: (item: Omit<CanvasItem, 'id' | 'createdAt'>) => void;
  closeCanvas: () => void;
  toggleCanvas: () => void;
  updateContent: (id: string, content: string) => void;
  setActiveItem: (id: string) => void;
  removeItem: (id: string) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  isOpen: false,
  items: [],
  activeItemId: null,

  openCanvas: (item) => {
    const id = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newItem: CanvasItem = {
      ...item,
      id,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      isOpen: true,
      items: [...state.items, newItem],
      activeItemId: id,
    }));
  },

  closeCanvas: () => {
    set({ isOpen: false });
  },

  toggleCanvas: () => {
    const { isOpen, items } = get();
    if (isOpen) {
      set({ isOpen: false });
    } else if (items.length > 0) {
      set({ isOpen: true });
    }
  },

  updateContent: (id, content) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, content } : item
      ),
    }));
  },

  setActiveItem: (id) => {
    set({ activeItemId: id, isOpen: true });
  },

  removeItem: (id) => {
    set((state) => {
      const filtered = state.items.filter((item) => item.id !== id);
      const needNewActive = state.activeItemId === id;
      return {
        items: filtered,
        activeItemId: needNewActive
          ? filtered.length > 0
            ? filtered[filtered.length - 1].id
            : null
          : state.activeItemId,
        isOpen: filtered.length > 0 ? state.isOpen : false,
      };
    });
  },
}));
