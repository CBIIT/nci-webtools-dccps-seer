import { create } from "zustand";

export const defaultParams = {
  id: "",
  worker: "recurrence",
  inputType: "data",
  individualData: [],
  sendNotification: false,
  jobName: "",
  email: "",
  functionName: "getRiskFromIndividualData",
  version: "v2", // api version
};

export const defaultState = {
  params: defaultParams,
  individualData: [],
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
