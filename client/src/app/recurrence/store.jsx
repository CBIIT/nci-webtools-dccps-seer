import { create } from "zustand";

export const defaultParams = {
  id: "",
  worker: "recurrence",
  inputType: "data",
  stageVariable: "",
  distantStageValue: "",
  adjustmentFactorR: 1,
  followUpYears: 25,
  strataOptions: [],
  sendNotification: false,
  jobName: "",
  email: "",
  functionName: "getRiskFromGroupData",
  version: "v2", // api version
};

export const defaultMain = {
  stratum: {},
  precision: 2,
};

export const defaultState = {
  params: defaultParams,
  seerData: {},
  results: [],
  main: defaultMain,
  openSidebar: true,
  openReviewDataModal: false,
};

export const useStore = create((set) => ({
  ...defaultState,
  toggleSidebar: () => set((state) => ({ openSidebar: !state.openSidebar })),
  setState: (update) => set((state) => ({ ...state, ...update })),
  resetStore: () => set(() => defaultState),
  resetMain: () => set((state) => ({ ...state, results: defaultState.results, main: defaultMain })),
}));
