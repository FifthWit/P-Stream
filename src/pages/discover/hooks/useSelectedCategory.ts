import { create } from "zustand";

type Category = "movies" | "tvshows" | "editorpicks";

interface SelectedCategoryState {
  selectedCategory: Category;
  setSelectedCategory: (category: Category) => void;
}

export const useSelectedCategory = create<SelectedCategoryState>((set) => ({
  selectedCategory: "movies",
  setSelectedCategory: (category) => set({ selectedCategory: category }),
}));
