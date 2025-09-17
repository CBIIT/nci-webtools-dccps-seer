// Survival component type definitions
import { DataPoint, Params, SeerData } from "../types";

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

export interface SurvivalVsYearProps {
  data: {
    fullpredicted: DataPoint[];
    predicted: DataPoint[];
  };
  seerData: SeerData;
  params: Params;
  cohortIndex: number;
  fitIndex: number;
  conditional?: DataPoint[];
  cluster?: number;
  precision: number;
}

export interface SurvFormData {
  intervals: number[];
  jpTrend: boolean;
  calendarTrend: boolean;
  trendStart: string;
  trendEnd: string;
}
