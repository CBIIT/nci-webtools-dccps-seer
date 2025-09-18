// Common type definitions for JPSurv main components

export interface DataPoint {
  Interval: number;
  "Start.interval"?: number;
  [key: string]: unknown;
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
  cohorts?: Cohort[];
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
  lowCI?: number | number[];
  upCI?: number | number[];
}

export interface SeerData {
  config: {
    "Session Options": {
      Statistic: string;
    };
  };
}

export interface JpTrendItem {
  survTrend: TrendDataPoint[][];
  deathTrend: TrendDataPoint[][];
}

export interface TrendQueryData {
  data: {
    jpTrend: JpTrendItem[];
    calendarTrend: TrendDataPoint[][][] | TrendDataPoint[][];
  };
}


// Common trend table type
export interface TrendTableProps {
  data: TrendDataPoint[];
  params: Params;
  precision: number;
}
