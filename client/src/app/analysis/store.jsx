import { create } from "zustand";

export const defaultForm = {
  id: "",
  inputType: "seer",
  inputFile: "",
  seerStatDataFile: "",
  year: "",
  yearStart: "",
  yearEnd: "",
  interval: "",
  cohorts: [],
  maxJp: 0,
  sendNotification: false,
  jobName: "",
  email: "",
};

export const defaultState = {
  results: {},
  seerData: {},
  modelOptions: {},
  openSidebar: true,
};

export const useStore = create((set) => ({
  ...defaultState,
  toggleSidebar: () => set((state) => ({ openSidebar: !state.openSidebar })),
  setState: (update) => set((state) => ({ ...state, ...update })),
  resetStore: () => set(() => defaultState),
}));
