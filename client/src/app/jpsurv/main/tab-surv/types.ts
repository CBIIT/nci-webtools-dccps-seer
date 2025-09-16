// Type definitions for JPSurv tab-surv components

export interface DataPoint {
  Interval: number;
  "Start.interval"?: number;
  [key: string]: any; // For flexible property access like params.year, observedHeader, etc.
}

export interface Params {
  statistic: string;
  yearStart: number;
  yearEnd: number;
  year: string;
  firstYear: number;
  observed?: string;
  id: string;
  useRelaxModel?: boolean;
  cohortVars: string[];
}

export interface Cohort {
  name: string;
  label: string;
}

export interface TrendDataPoint {
  interval: number;
  "start.year": number;
  "end.year": number;
  estimate: number;
  lowCI: number | number[];
  upCI: number | number[];
}

export interface SurvYearPlotProps {
  data: DataPoint[];
  trendData: any[];
  params: Params;
  title: string;
  subtitle: string;
  xTitle: string;
  yTitle: string;
  observedHeader: string;
  predictedHeader: string;
  precision: number;
}

export interface SurvYearTableProps {
  data: DataPoint[];
  params: Params;
  observedHeader: string;
  observedSeHeader: string;
  predictedHeader: string;
  predictedSeHeader: string;
  isRecalcCond?: boolean;
  precision: number;
}

export interface TrendTableProps {
  data: TrendDataPoint[];
  params: Params;
  precision: number;
}

export interface SurvivalVsYearProps {
  data: {
    fullpredicted: DataPoint[];
    predicted: DataPoint[];
  };
  seerData: {
    config: {
      "Session Options": {
        Statistic: string;
      };
    };
  };
  params: Params;
  cohortIndex: number;
  fitIndex: number;
  conditional?: DataPoint[];
  cluster?: number;
  precision: number;
}

