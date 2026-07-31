import { create } from "zustand";

const useAppStore = create((set) => ({
  activeRepository: null,
  user: null,
  setActiveRepository: (repo) => set({ activeRepository: repo }),
  setUser: (user) => set({ user }),
}));

export default useAppStore;
