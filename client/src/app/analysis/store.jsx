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
  useCondModel: false,
  useRelaxModel: false,
  ...defaultAdvOptions,
};

export const defaultState = {
  params: defaultForm,
  main: { cohortIndex: null, cutpointIndex: null, cluster: null, fitIndex: 0 },
  results: {},
  seerData: {},
  modelOptions: {},
  userCsv: {
    openConfigDataModal: false,
    userData: null,
    parsedNoHead: [],
    parsedHead: { headers: [], data: [] },
    mapHeaders: [],
    form: { hasHeaders: false, dataType: "Relative Survival", rates: "percents" },
  },
  openSidebar: true,
  useConditional: false,
  conditional: null,
};

export const useStore = create((set) => ({
  ...defaultState,
  toggleSidebar: () => set((state) => ({ openSidebar: !state.openSidebar })),
  setState: (update) => set((state) => ({ ...state, ...update })),
  setUserCsv: (update) => set((state) => ({ userCsv: { ...state.userCsv, ...update } })),
  resetStore: () => set(() => defaultState),
  resetMain: () => set((state) => ({ ...state, main: defaultState.main })),
}));
