"use client";
import { useMemo, useEffect } from "react";
import { Container, Row, Col, Form, Button, Spinner } from "react-bootstrap";
import { useForm, useWatch } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import { useQuery, useQueryClient, useIsFetching, skipToken } from "@tanstack/react-query";
import { calculateTrends } from "@/services/queries";
import DeathYearPlot from "./death-year-plot";
import TrendTable from "../tab-surv/surv-trend-table";
import DatasetTable from "@/components/dataset-table";
import { useStore } from "../../store";
import { getCohortLabel, getJoinpointLabel } from "../cohort-select";
import { getJpsurvSettingsRows } from "../download-settings";
import { getDeathYearColumns } from "../table-columns";
import { TrendQueryData, DataPoint, TrendDataPoint } from "../types";
import { DeathVsYearProps, DeathFormData } from "./types";

export default function DeathVsYear({
  data,
  seerData,
  params,
  cohortIndex,
  fitIndex,
  conditional,
  precision,
  selection,
}: DeathVsYearProps) {
  const setState = useStore((state) => state.setState);
  const conditionalIntervals = useStore((state) => state.conditionalIntervals);
  const deathTrendQueryKey = useStore((state) => state.deathTrendQueryKey).slice(0, 2);
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["deathTrend"] });
  // read-only cache subscription; fetching happens in getTrends
  const { data: trendQueryData } = useQuery({ queryKey: deathTrendQueryKey, queryFn: skipToken });
  const intervalOptions = useMemo(
    () => [...new Set((conditional || data.fullpredicted).map((e: DataPoint) => e.Interval))],
    [conditional, data.fullpredicted]
  );
  const defaultInterval = intervalOptions.includes(5) ? 5 : Math.max(...intervalOptions);
  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<DeathFormData>({
    defaultValues: { intervalsD: [defaultInterval], jpTrend: false, useRange: false, trendRange: [] },
  });
  const intervalsD = useWatch({ control, name: "intervalsD" });
  const jpTrend = useWatch({ control, name: "jpTrend" });
  const observedHeader = params?.observed.includes("Relative")
    ? "Relative_Survival_Interval"
    : "CauseSpecific_Survival_Interval";
  const observedSeHeader = observedHeader?.includes("Relative") ? "Relative_SE_Interval" : "CauseSpecific_SE_Interval";
  const predictedHeader = "Predicted_Survival_Int";
  const predictedSeHeader = "Predicted_Survival_Int_SE";
  const memoData = useMemo(() => {
    const filterInts = (conditional || data.fullpredicted).filter((e: DataPoint) => intervalsD.includes(e.Interval));
    return filterInts.map((e) => ({
      ...e,
      [observedHeader]: e[observedHeader] ? 100 - (e[observedHeader] as number) : e[observedHeader],
      [predictedHeader]: e[predictedHeader] ? 100 - (e[predictedHeader] as number) : e[predictedHeader],
    }));
  }, [data, conditional, intervalsD, observedHeader, predictedHeader]);

  const deathTrend = useMemo(() => {
    const deathTrendByFit = (trendQueryData as TrendQueryData)?.data?.jpTrend?.[fitIndex]?.deathTrend;
    return Array.isArray(deathTrendByFit)
      ? deathTrendByFit
          .reduce((acc: TrendDataPoint[], ar: TrendDataPoint[]) => [...acc, ...ar], [])
          .filter((e: TrendDataPoint) => intervalsD.includes(e.interval))
      : [];
  }, [trendQueryData, intervalsD, fitIndex]);

  // disable trends for conditional recalculation
  useEffect(() => {
    if (jpTrend && !!conditional) setValue("jpTrend", false);
  }, [conditional, jpTrend, setValue]);
  // auto select interval on conditional recalculation switch
  useEffect(() => {
    const validIntervals = intervalsD.filter((interval) => intervalOptions.includes(interval));
    if (validIntervals.length !== intervalsD.length)
      setValue("intervalsD", validIntervals.length ? validIntervals : [defaultInterval]);
  }, [conditional, defaultInterval, intervalOptions, intervalsD, setValue]);
  useEffect(() => {
    setState({ deathTrendQueryKey: ["deathTrend", cohortIndex] });
  }, [setState, cohortIndex]);

  const columns = getDeathYearColumns({
    params,
    observedHeader,
    observedSeHeader,
    predictedHeader,
    predictedSeHeader,
    precision,
  });

  function getSettingsRows() {
    return getJpsurvSettingsRows(
      params,
      seerData,
      { main: selection, conditionalIntervals: conditional ? conditionalIntervals : null },
      [
        ["Years Since Diagnosis", intervalsD.join(", ")],
        ["Trend Measures: Between Joinpoints", jpTrend ? "Yes" : "No"],
      ]
    );
  }

  async function getTrends(form: DeathFormData): Promise<void> {
    try {
      await queryClient.fetchQuery({
        queryKey: deathTrendQueryKey,
        queryFn: async () =>
          calculateTrends(params.id, {
            jpTrend: form.jpTrend,
            cohortIndex,
            useRelaxModel: params.useRelaxModel,
            type: "death",
          }),
      });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Container fluid>
      <Row>
        <Col className="p-3 border mb-3">
          <Row className="mb-3">
            <Col sm="auto">
              <SelectHookForm
                name="intervalsD"
                label="Years Since Diagnosis"
                options={intervalOptions.map((e) => ({ label: e, value: e }))}
                control={control}
                disabled={false}
                className={undefined}
                labelClass={undefined}
                rules={{ required: jpTrend ? "Required" : false }}
                defaultValue={undefined}
                error={errors?.intervalsD}
                isMulti
              />
              <Form.Text className="text-muted">
                <i>Select years since diagnosis (follow-up) for survival plot and/or trend measures</i>
              </Form.Text>
            </Col>
          </Row>
          <Form className="border rounded m-1" onSubmit={handleSubmit(getTrends)}>
            <Row>
              <Col sm="10" className="border-end p-3">
                <Form.Group>
                  <b>Include Trend Measures</b>
                  <Form.Check
                    {...register("jpTrend")}
                    id="jpTrendDeath"
                    label="Between Joinpoints"
                    aria-label="Between Joinpoints"
                    type="checkbox"
                    disabled={!!conditional || !!isFetching}
                  />
                </Form.Group>
              </Col>
              <Col sm="2" className="d-flex p-3 justify-content-center align-items-center">
                <Button type="submit" disabled={!jpTrend || !!isFetching}>
                  {isFetching ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Loading
                    </>
                  ) : (
                    "Recalculate"
                  )}
                </Button>
              </Col>
            </Row>
          </Form>
        </Col>
      </Row>
      <Row>
        <Col>
          {jpTrend && deathTrend.length > 0 && <TrendTable data={deathTrend} params={params} precision={precision} />}
          {jpTrend && (trendQueryData as TrendQueryData)?.data?.jpTrend && deathTrend.length === 0 && (
            <div className="text-danger">Trend measures unavailable</div>
          )}
        </Col>
      </Row>
      <Row>
        <Col>
          <DeathYearPlot
            data={memoData}
            trendData={deathTrend}
            params={params}
            title={`${conditional ? "Conditional " : ""}` + "Annual Probability of Dying of Cancer by Diagnosis Year"}
            subtitle={`${getJoinpointLabel(params, fitIndex, data.jp)} - ${getCohortLabel(params, cohortIndex)}`}
            xTitle={"Year of Diagnosis"}
            yTitle={`Annual Probability of Cancer Death (%)`}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
            precision={precision}
          />
        </Col>
      </Row>
      <DatasetTable
        title={`${conditional ? "Conditional " : ""}Annual Probability of Dying of Cancer by Diagnosis Year`}
        data={memoData}
        columns={columns}
        filename={`deathByYear - Model ${fitIndex} - ${cohortIndex}`}
        getSettingsRows={getSettingsRows}
      />
    </Container>
  );
}
