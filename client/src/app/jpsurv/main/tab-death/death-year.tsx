"use client";
import { useMemo, useEffect } from "react";
import { Container, Row, Col, Form, Button, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import SelectHookForm from "@/components/selectHookForm";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { calculateTrends } from "@/services/queries";
import DeathYearPlot from "./death-year-plot";
import DeathYearTable from "./death-year-table";
import TrendTable from "../tab-surv/surv-trend-table";
import { downloadTable } from "@/services/xlsx";
import { useStore } from "../../store";
import { getCohortLabel } from "../cohort-select";
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
}: DeathVsYearProps) {
  const setState = useStore((state) => state.setState);
  const deathTrendQueryKey = useStore((state) => state.deathTrendQueryKey).slice(0, 2);
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["deathTrend"] });
  const trendQueryData = queryClient.getQueryData(deathTrendQueryKey);
  const intervalOptions = useMemo(() => 
    [...new Set((conditional || data.fullpredicted).map((e: DataPoint) => e.Interval))], 
    [conditional, data.fullpredicted]
  );
  const defaultInterval = intervalOptions.includes(5) ? 5 : Math.max(...intervalOptions);
  const { control, register, watch, setValue, handleSubmit } = useForm<DeathFormData>({
    defaultValues: { intervalsD: [defaultInterval], jpTrend: false, useRange: false, trendRange: [] },
  });
  const intervalsD = watch("intervalsD");
  const jpTrend = watch("jpTrend");
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

  const deathTrend = useMemo(
    () =>
      (trendQueryData as TrendQueryData)?.data?.jpTrend
        ? (trendQueryData as TrendQueryData).data.jpTrend[fitIndex].deathTrend
            .reduce((acc: TrendDataPoint[], ar: TrendDataPoint[]) => [...acc, ...ar], [])
            .filter((e: TrendDataPoint) => intervalsD.includes(e.interval))
        : [],
    [trendQueryData, intervalsD, fitIndex]
  );

  // disable trends for conditional recalculation
  useEffect(() => {
    if (jpTrend && !!conditional) setValue("jpTrend", false);
  }, [conditional, jpTrend, setValue]);
  // auto select interval on conditional recalculation switch
  useEffect(() => {
    if (!intervalsD.every(interval => intervalOptions.includes(interval))) setValue("intervalsD", [...intervalsD, defaultInterval]);
  }, [conditional, defaultInterval, intervalOptions, intervalsD, setValue]);
  useEffect(() => {
    setState({ deathTrendQueryKey: ["deathTrend", cohortIndex] });
  }, [setState, cohortIndex]);

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
                rules={undefined}
                defaultValue={undefined}
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
                    disabled={!!conditional}
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
        </Col>
      </Row>
      <Row>
        <Col>
          <DeathYearPlot
            data={memoData}
            trendData={deathTrend}
            params={params}
            title={`${conditional ? "Conditional " : ""}` + "Annual Probability of Dying of Cancer by Diagnosis Year"}
            subtitle={`Joinpoint ${fitIndex} - ${getCohortLabel(params, cohortIndex)}`}
            xTitle={"Year of Diagnosis"}
            yTitle={`Annual Probability of Cancer Death (%)`}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
            precision={precision}
          />
        </Col>
      </Row>
      <Row className="justify-content-between align-items-center">
        <Col sm="auto">Total Row Count: {memoData.length}</Col>
        <Col sm="auto">
          <Button
            variant="link"
            onClick={() =>
              downloadTable(
                memoData,
                [
                  ...params.cohortVars,
                  params.year,
                  "Interval",
                  observedHeader,
                  observedSeHeader,
                  predictedHeader,
                  predictedSeHeader,
                ],
                seerData,
                params,
                `deathByYear - Model ${fitIndex} - ${cohortIndex}`
              )
            }>
            Download Graph Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <DeathYearTable
            data={memoData}
            params={params}
            observedHeader={observedHeader}
            observedSeHeader={observedSeHeader}
            predictedHeader={predictedHeader}
            predictedSeHeader={predictedSeHeader}
            precision={precision}
          />
        </Col>
      </Row>
    </Container>
  );
}
