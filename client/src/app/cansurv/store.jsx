import { create } from "zustand";

export const DISTRIBUTION_OPTIONS = [
  { label: "Lognormal", value: "lnorm" },
  { label: "Loglogistic", value: "llogis" },
  { label: "Weibull", value: "weibull" },
  { label: "Gompertz", value: "gompertz" },
  { label: "Semi-Parametric", value: "semi-parametric" },
];

export const defaultForm = {
  id: "",
  worker: "cansurv",
  inputType: "seer",
  inputFile: "",
  covariates: [],
  distribution: "lnorm",
  maxit: 100,
  reltol: 1.5e-8,
  n_restart_conv: 10,
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

// id is the job the selection belongs to; a different id starts from defaults
export const defaultMain = { id: null, stratumIndex: 0, precision: 2 };

export const defaultState = {
  params: defaultForm,
  main: defaultMain,
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
  openReviewDataModal: false,
};

export const useStore = create((set) => ({
  ...defaultState,
  toggleSidebar: () => set((state) => ({ openSidebar: !state.openSidebar })),
  setState: (update) => set((state) => ({ ...state, ...update })),
  setUserCsv: (update) => set((state) => ({ userCsv: { ...state.userCsv, ...update } })),
  resetStore: () => set(() => defaultState),
  setMain: (id, update) =>
    set((state) => ({ main: { ...(state.main.id === id ? state.main : defaultMain), ...update, id } })),
}));
