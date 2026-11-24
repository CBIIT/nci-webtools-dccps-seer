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

// id is the job the selection belongs to; a different id starts from defaults
export const defaultMain = {
  id: null,
  stratum: {},
  precision: 2,
};

export const defaultState = {
  params: defaultParams,
  seerData: {},
  main: defaultMain,
  openSidebar: true,
  openReviewDataModal: false,
};

export const useStore = create((set) => ({
  ...defaultState,
  toggleSidebar: () => set((state) => ({ openSidebar: !state.openSidebar })),
  setState: (update) => set((state) => ({ ...state, ...update })),
  resetStore: () => set(() => defaultState),
  setMain: (id, update) =>
    set((state) => ({ main: { ...(state.main.id === id ? state.main : defaultMain), ...update, id } })),
}));
