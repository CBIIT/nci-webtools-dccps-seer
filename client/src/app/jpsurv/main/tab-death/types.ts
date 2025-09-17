// Death component type definitions
import { DataPoint, Params, SeerData, TrendDataPoint } from "../types";

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

export interface DeathYearTableProps {
  data: DataPoint[];
  params: Params;
  observedHeader: string;
  observedSeHeader: string;
  predictedHeader: string;
  predictedSeHeader: string;
  precision: number;
}

export interface DeathVsYearProps {
  data: {
    fullpredicted: DataPoint[];
    predicted?: DataPoint[];
  };
  seerData: SeerData;
  params: Params;
  cohortIndex: number;
  fitIndex: number;
  conditional?: DataPoint[];
  precision: number;
}

export interface DeathFormData {
  intervalsD: number[];
  jpTrend: boolean;
  useRange: boolean;
  trendRange: any[];
}
