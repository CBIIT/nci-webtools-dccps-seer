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

export default function DeathVsYear({ data, seerData, params, cohortIndex, fitIndex, conditional, precision }) {
  const setState = useStore((state) => state.setState);
  const deathTrendQueryKey = useStore((state) => state.deathTrendQueryKey).slice(0, 2);
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["deathTrend"] });
  const trendQueryData = queryClient.getQueryData(deathTrendQueryKey);
  const intervalOptions = [...new Set((conditional || data.fullpredicted).map((e) => e.Interval))];
  const defaultInterval = intervalOptions.includes(5) ? 5 : Math.max(...intervalOptions);
  const { control, register, watch, setValue, handleSubmit } = useForm({
    defaultValues: { intervals: [defaultInterval], jpTrend: false, useRange: false, trendRange: [] },
  });
  const intervals = watch("intervals");
  const jpTrend = watch("jpTrend");
  const observedHeader = params?.observed.includes("Relative")
    ? "Relative_Survival_Interval"
    : "CauseSpecific_Survival_Interval";
  const observedSeHeader = observedHeader?.includes("Relative") ? "Relative_SE_Interval" : "CauseSpecific_SE_Interval";
  const predictedHeader = "Predicted_Survival_Int";
  const predictedSeHeader = "Predicted_Survival_Int_SE";
  const memoData = useMemo(() => {
    const filterInts = (conditional || data.fullpredicted).filter((e) => intervals.includes(e.Interval));
    return filterInts.map((e) => ({
      ...e,
      [observedHeader]: e[observedHeader] ? 100 - e[observedHeader] : e[observedHeader],
      [predictedHeader]: e[predictedHeader] ? 100 - e[predictedHeader] : e[predictedHeader],
    }));
  }, [data, conditional, intervals]);

  const deathTrend = useMemo(
    () =>
      trendQueryData?.data?.jpTrend
        ? trendQueryData.data.jpTrend[fitIndex].deathTrend
            .reduce((acc, ar) => [...acc, ...ar], [])
            .filter((e) => intervals.includes(e.interval))
        : [],
    [trendQueryData, jpTrend, intervals, fitIndex]
  );

  // disable trends for conditional recalculation
  useEffect(() => {
    if (jpTrend && !!conditional) setValue("jpTrend", false);
  }, [conditional, jpTrend]);
  // auto select interval on conditional recalculation switch
  useEffect(() => {
    if (!intervalOptions.includes(intervals)) setValue("intervals", [...intervals, defaultInterval]);
  }, [conditional, defaultInterval]);
  useEffect(() => {
    setState({ deathTrendQueryKey: ["deathTrend", cohortIndex] });
  }, [setState, cohortIndex]);

  async function getTrends(form) {
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
      console.log(e);
    }
  }

  return (
    <Container fluid>
      <Row>
        <Col className="p-3 border mb-3">
          <Row className="mb-3">
            <Col sm="auto">
              <SelectHookForm
                name="intervals"
                label="Years Since Diagnosis"
                options={intervalOptions.map((e) => ({ label: e, value: e }))}
                control={control}
                isMulti
              />
              <Form.Text className="text-muted">
                <i>Select years since diagnosis (follow-up) for survival plot and/or trend measures</i>
              </Form.Text>
            </Col>
          </Row>
          <Form className="border rounded m-1 p-3" onSubmit={handleSubmit(getTrends)}>
            <Row>
              <Col>
                <b>Include Trend Measures</b>
              </Col>
            </Row>
            <Row>
              <Col sm="auto">
                <Form.Group>
                  <Form.Check
                    {...register("jpTrend")}
                    id="jpTrendDeath"
                    label="Between Joinpoints"
                    aria-label="Between Joinpoints"
                    type="checkbox"
                    disabled={conditional}
                  />
                </Form.Group>
              </Col>
              <Col sm="auto">
                <Button type="submit" disabled={!jpTrend || isFetching}>
                  {isFetching ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Loading
                    </>
                  ) : (
                    "Submit"
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
            params={params}
            title={`${conditional ? "Conditional " : ""}` + "Annual Probability of Dying of Cancer by Diagnosis Year"}
            xTitle={"Year of Diagnosis"}
            yTitle={`Annual Probability of Cancer Death (%)`}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
            precision={precision}
          />
        </Col>
      </Row>
      <Row className="justify-content-between align-items-center">
        <Col sm="auto">Rows: {memoData.length}</Col>
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
            Download Dataset
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
