"use client";
import { useMemo, useEffect } from "react";
import { Container, Row, Col, Form, Button, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { calculateTrends } from "@/services/queries";
import SelectHookForm from "@/components/selectHookForm";
import SurvYearPlot from "./surv-year-plot";
import SurvYearTable from "./surv-year-table";
import TrendTable from "./surv-trend-table";
import { downloadTable } from "@/services/xlsx";
import { useStore } from "../../store";
import { getCohortLabel } from "../cohort-select";
import { SurvivalVsYearProps } from "./types";

export default function SurvivalVsYear({
  data,
  seerData,
  params,
  cohortIndex,
  fitIndex,
  conditional,
  cluster,
  precision,
}: SurvivalVsYearProps) {
  const setState = useStore((state) => state.setState);
  const survTrendQueryKey = useStore((state) => state.survTrendQueryKey);
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["trend"] });
  const isRecalcCond = !!conditional;
  const intervalOptions = [...new Set((conditional || data.fullpredicted).map((e) => e.Interval))];
  const defaultInterval = intervalOptions.includes(5) ? 5 : Math.max(...intervalOptions);

  const {
    control,
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      intervals: [defaultInterval],
      jpTrend: false,
      calendarTrend: false,
      trendStart: "",
      trendEnd: "",
    },
  });

  const intervals = watch("intervals");
  const jpTrend = watch("jpTrend");
  const calendarTrend = watch("calendarTrend");
  const trendStart = watch("trendStart");
  const trendEnd = watch("trendEnd");
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const { firstYear } = params;
  const yearOptions = [...new Set(data.predicted.map((e) => e[params.year]))];
  const memoData = useMemo(
    () => (conditional || data.fullpredicted).filter((e) => intervals.includes(e.Interval)),
    [data, conditional, intervals]
  );

  const trendQueryData = queryClient.getQueryData(survTrendQueryKey);
  const survTrend = useMemo(
    () =>
      trendQueryData?.data?.jpTrend
        ? trendQueryData.data.jpTrend[fitIndex].survTrend
            .reduce((acc, ar) => [...acc, ...ar], [])
            .filter((e) => intervals.includes(e.interval))
        : [],
    [trendQueryData, jpTrend, intervals, fitIndex]
  );

  const calTrend = useMemo(
    () =>
      trendQueryData?.data?.calendarTrend
        ? (params.useRelaxModel
            ? trendQueryData.data.calendarTrend[cluster][fitIndex]
            : trendQueryData.data.calendarTrend[fitIndex]
          )
            .reduce((acc, ar) => [...acc, ...ar], [])
            .filter((e) => intervals.includes(e.interval))
        : [],
    [trendQueryData, calendarTrend, intervals, fitIndex, cluster, params.useRelaxModel]
  );

  const observedHeader = isRecalcCond ? "observed" : params?.observed;
  const observedSeHeader = isRecalcCond
    ? "observed_se"
    : params?.observed?.includes("Relative")
    ? "Relative_SE_Cum"
    : "CauseSpecific_SE_Cum";
  const predictedHeader = isRecalcCond ? "pred_cum" : "Predicted_Survival_Cum";
  const predictedSeHeader = isRecalcCond ? "pred_cum_se" : "Predicted_Survival_Cum_SE";

  // disable trends for conditional recalculation
  useEffect(() => {
    if (jpTrend && !!conditional) setValue("jpTrend", false);
    if (calendarTrend && !!conditional) setValue("calendarTrend", false);
  }, [conditional, jpTrend, calendarTrend]);
  // auto select interval on conditional recalculation switch
  useEffect(() => {
    if (!intervalOptions.includes(intervals)) setValue("intervals", [...intervals, defaultInterval]);
  }, [conditional, defaultInterval]);
  useEffect(() => {
    setState({ survTrendQueryKey: ["trend", cohortIndex, trendStart, trendEnd] });
  }, [setState, jpTrend, calendarTrend, trendStart, trendEnd, cohortIndex]);

  async function getTrends(form: any): Promise<void> {
    try {
      await queryClient.fetchQuery({
        queryKey: survTrendQueryKey,
        queryFn: async () =>
          calculateTrends(params.id, {
            jpTrend: form.jpTrend,
            calendarTrend: form.calendarTrend,
            yearRange: [+form.trendStart, +form.trendEnd],
            cohortIndex,
            useRelaxModel: params.useRelaxModel,
            type: "surv",
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
          <Form className="border rounded m-1" onSubmit={handleSubmit(getTrends)}>
            <Row>
              <Col className="border-end" sm="10">
                <Row>
                  <Col className="p-3 pb-0">
                    <b>Include Trend Measures</b>
                  </Col>
                </Row>
                <Row>
                  <Col sm="auto" className="p-3 pt-0">
                    <Form.Group>
                      <Form.Check
                        {...register("jpTrend")}
                        id="jpTrend"
                        label="Between Joinpoints"
                        aria-label="Between Joinpoints"
                        type="checkbox"
                        disabled={conditional}
                      />
                    </Form.Group>
                  </Col>
                  <Col sm="auto" className="p-3 pt-0">
                    <Form.Group>
                      <Form.Check
                        {...register("calendarTrend")}
                        id="calendarTrend"
                        label="Between Calendar Years of Diagnosis"
                        aria-label="Between Calendar Years of Diagnosis"
                        type="checkbox"
                        disabled={conditional}
                      />
                    </Form.Group>
                  </Col>
                  <Col sm="auto" className="p-3 pt-0">
                    <Form.Group className="d-flex" controlId="trendStart">
                      <Form.Label className="me-2 text-nowrap">From</Form.Label>
                      <Form.Select
                        {...register("trendStart", {
                          valueAsNumber: true,
                          required: calendarTrend ? "Required" : false,
                          validate: (value, form) =>
                            !calendarTrend ||
                            value < form.trendEnd ||
                            `Must be less than ${+form.trendEnd + firstYear}`,
                        })}
                        disabled={!calendarTrend}
                        isInvalid={errors?.trendStart}>
                        {yearOptions.map((year) => (
                          <option key={year} value={+year}>
                            {year + firstYear}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{errors?.trendStart?.message}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col sm="auto" className="p-3 pt-0">
                    <Form.Group className="d-flex" controlId="trendEnd">
                      <Form.Label className="me-2 text-nowrap">To</Form.Label>
                      <Form.Select
                        {...register("trendEnd", {
                          valueAsNumber: true,
                          required: calendarTrend ? "Required" : false,
                          validate: (value, form) =>
                            !calendarTrend ||
                            value > form.trendStart ||
                            `Must be greater than ${+form.trendStart + firstYear}`,
                        })}
                        disabled={!calendarTrend}
                        isInvalid={errors?.trendEnd}>
                        {yearOptions.map((year) => (
                          <option key={year} value={+year}>
                            {year + firstYear}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{errors?.trendEnd?.message}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </Col>
              <Col sm="2" className="d-flex justify-content-center align-items-center">
                <Button type="submit" disabled={!(calendarTrend || jpTrend) || isFetching}>
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
          {jpTrend && survTrend.length > 0 && (
            <div>
              <h5>Average Absolute Change in Survival</h5>
              <TrendTable data={survTrend} params={params} precision={precision} />
              <small>
                Numbers represent the difference in cumulative survival rate (as the percent surviving) from one year at
                diagnosis to the previous.
              </small>
            </div>
          )}
        </Col>
      </Row>
      <Row>
        <Col>
          {calendarTrend && calTrend.length > 0 && (
            <div className="mt-3">
              <h5>Trend Measures for User Selected Years</h5>
              <TrendTable data={calTrend} params={params} precision={precision} />
            </div>
          )}
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvYearPlot
            data={memoData}
            trendData={survTrend}
            params={params}
            title={`${conditional ? "Conditional " : ""}${statistic} by Diagnosis Year`}
            subtitle={`Joinpoint ${fitIndex} - ${getCohortLabel(params, cohortIndex)}`}
            xTitle={"Year of Diagnosis"}
            yTitle={`${isRecalcCond ? "Conditional " : ""}${statistic}`}
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
                `survByYear - Model ${fitIndex} - ${cohortIndex}`
              )
            }>
            Download Graph Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvYearTable
            data={memoData}
            params={params}
            observedHeader={observedHeader}
            observedSeHeader={observedSeHeader}
            predictedHeader={predictedHeader}
            predictedSeHeader={predictedSeHeader}
            isRecalcCond={isRecalcCond}
            precision={precision}
          />
        </Col>
      </Row>
    </Container>
  );
}
