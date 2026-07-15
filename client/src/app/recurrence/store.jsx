import { create } from "zustand";

export const defaultParams = {
  id: "",
  worker: "recurrence",
  inputType: "data",
  stageVariable: "",
  distantStageValue: "",
  adjustmentFactorR: 1,
  followUpYears: 25,
  sendNotification: false,
  jobName: "",
  email: "",
  functionName: "getRiskFromGroupData",
  version: "v2", // api version
};

export const defaultState = {
  params: defaultParams,
  seerData: {},
  results: [],
  openSidebar: true,
};

export const useStore = create((set) => ({
  ...defaultState,
  toggleSidebar: () => set((state) => ({ openSidebar: !state.openSidebar })),
  setState: (update) => set((state) => ({ ...state, ...update })),
  resetStore: () => set(() => defaultState),
  resetMain: () => set((state) => ({ ...state, results: defaultState.results })),
}));
