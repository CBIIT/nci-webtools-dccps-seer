import { create } from "zustand";

export const defaultAdvOptions = {
  delLastIntvl: false,
  numbetwn: 2,
  numfromstart: 3,
  numtoend: 5,
  projectedYears: 5,
};

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
  ...defaultAdvOptions,
};

export const defaultState = {
  params: defaultForm,
  main: { cohortIndex: 1, fitIndex: 0 },
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
