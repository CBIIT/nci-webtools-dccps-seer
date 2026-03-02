import { create } from "zustand";

export const defaultParams = {
  inputFileType: "seerStatAndCanSurvFiles",
  stageVariable: "",
  distantStageValue: "",
  adjustmentFactorR: 1,
  followUpYears: 25,
};

export const defaultState = {
  params: defaultParams,
  seerStatDictionary: [],
  seerStatData: [],
  canSurvData: [],
  results: [],
  openSidebar: true,
};

export const useStore = create((set) => ({
  ...defaultState,
  toggleSidebar: () => set((state) => ({ openSidebar: !state.openSidebar })),
  setState: (update) => set((state) => ({ ...state, ...update })),
  resetStore: () => set(() => defaultState),
}));
