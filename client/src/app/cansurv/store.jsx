import { create } from "zustand";

export const defaultForm = {
  id: "",
  inputType: "seer",
  inputFile: "",
  covariates: [],

  distribution: "lnorm",
  maxit: 100,
  reltol: 0.000001,
  n_restart_conv: 100,
  seed: 123,
  est_cure: false,
  cure: [],
  mu: [],
  sigma: [],
  continuous: [],
  by: [],
  time: "",
  alive: "",
  died: "",
  lost: "",
  exp_cum: "",
  rel_cum: "",

  sendNotification: false,
  jobName: "",
  email: "",
};

export const defaultState = {
  params: defaultForm,
  main: { cohortIndex: null, cutpointIndex: null, cluster: null, fitIndex: 0, precision: 2 },
  results: {},
  seerData: {},

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
