import { create } from 'zustand';
import type { SelectedEntity } from '../types';

export type PostFx = 'none' | 'nightvision' | 'crt';

export interface LayerCounts {
  flights: number;
  ships: number;
  satellites: number;
  earthquakes: number;
}

interface LayerState {
  flights: boolean;
  ships: boolean;
  satellites: boolean;
  earthquakes: boolean;
  postFx: PostFx;
  counts: LayerCounts;
  selected: SelectedEntity | null;
  toggle: (key: 'flights' | 'ships' | 'satellites' | 'earthquakes') => void;
  setPostFx: (fx: PostFx) => void;
  setCount: (key: keyof LayerCounts, value: number) => void;
  setSelected: (entity: SelectedEntity | null) => void;
}

export const useLayerStore = create<LayerState>((set) => ({
  flights: true,
  ships: false,
  satellites: true,
  earthquakes: true,
  postFx: 'none',
  counts: { flights: 0, ships: 0, satellites: 0, earthquakes: 0 },
  selected: null,
  toggle: (key) => set((state) => ({ [key]: !state[key] }) as Partial<LayerState>),
  setPostFx: (fx) => set({ postFx: fx }),
  setCount: (key, value) =>
    set((state) => ({ counts: { ...state.counts, [key]: value } })),
  setSelected: (entity) => set({ selected: entity }),
}));
