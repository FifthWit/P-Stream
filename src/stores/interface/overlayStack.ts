import { create } from "zustand";

type OverlayType = "volume" | "subtitle" | null;

interface OverlayStackStore {
  currentOverlay: OverlayType;
  setCurrentOverlay: (overlay: OverlayType) => void;
}

export const useOverlayStack = create<OverlayStackStore>((set) => ({
  currentOverlay: null,
  setCurrentOverlay: (overlay) => set({ currentOverlay: overlay }),
}));
