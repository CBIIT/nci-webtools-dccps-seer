// Death component type definitions
import { DataPoint, Params, SeerData, Selection, TrendDataPoint } from "../types";

export interface DeathYearPlotProps {
  data: DataPoint[];
  trendData?: TrendDataPoint[];
  params: Params;
  title: string;
  subtitle: string;
  xTitle: string;
  yTitle: string;
  observedHeader: string;
  predictedHeader: string;
  precision: number;
}

export interface DeathVsYearProps {
  data: {
    fullpredicted: DataPoint[];
    predicted?: DataPoint[];
    jp?: number | number[];
  };
  seerData: SeerData;
  params: Params;
  cohortIndex: number;
  fitIndex: number;
  conditional?: DataPoint[];
  precision: number;
  selection: Selection;
}

export interface DeathFormData {
  intervalsD: number[];
  jpTrend: boolean;
  useRange: boolean;
  trendRange: number[];
}
