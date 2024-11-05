"use client";
import { useMemo, useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calculateCalendarTrends } from "../../queries";
import SelectHookForm from "@/components/selectHookForm";
import SurvYearPlot from "./surv-year-plot";
import SurvYearTable from "./surv-year-table";
import TrendTable from "./surv-trend-table";
import { downloadTable } from "@/services/xlsx";

export default function SurvivalVsYear({ data, seerData, params, cohortIndex, fitIndex, conditional, cluster }) {
  const queryClient = useQueryClient();
  const isFetching = queryClient.isFetching();
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
      trendJp: false,
      calendarTrend: false,
      trendStart: "",
      trendEnd: "",
    },
  });

  const intervals = watch("intervals");
  const trendJp = watch("trendJp");
  const calendarTrend = watch("calendarTrend");
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const { firstYear } = params;
  const yearOptions = [...new Set(data.predicted.map((e) => e[params.year]))];
  const memoData = useMemo(
    () => (conditional || data.fullpredicted).filter((e) => intervals.includes(e.Interval)),
    [data, conditional, intervals]
  );
  const trendData = useMemo(
    () => data.survTrend.reduce((acc, ar) => [...acc, ...ar], []).filter((e) => intervals.includes(e.interval)),
    [data, intervals]
  );
  const [calTrendData, setCalTrendData] = useState([]);
  const observedHeader = isRecalcCond ? "observed" : params?.observed;
  const observedSeHeader = isRecalcCond
    ? "observed_se"
    : params?.observed?.includes("Relative")
    ? "Relative_SE_Cum"
    : "CauseSpecific_SE_Cum";
  const predictedHeader = "Predicted_Survival_Cum";
  const predictedSeHeader = "Predicted_Survival_Cum_SE";

  // disable trends for conditional recalculation
  useEffect(() => {
    if (trendJp && !!conditional) setValue("trendJp", false);
    if (calendarTrend && !!conditional) setValue("calendarTrend", false);
  }, [conditional, trendJp, calendarTrend]);
  // auto select interval on conditional recalculation switch
  useEffect(() => {
    if (!intervalOptions.includes(intervals)) setValue("intervals", [...intervals, defaultInterval]);
  }, [conditional, defaultInterval]);

  async function getCalendarTrend(form) {
    try {
      const { data } = await queryClient.fetchQuery({
        queryKey: ["calendarTrend", cohortIndex, form.trendStart, form.trendEnd],
        queryFn: async () =>
          calculateCalendarTrends(params.id, {
            yearRange: [+form.trendStart, +form.trendEnd],
            cohortIndex,
            useRelaxModel: params.useRelaxModel,
          }),
      });
      setCalTrendData(data);
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <Container fluid>
      <Row>
        <Col className="p-3 border rounded mb-3">
          <Form onSubmit={handleSubmit(getCalendarTrend)}>
            <Row className="mb-3">
              <Col sm="auto">
                <SelectHookForm
                  name="intervals"
                  label="Year of Diagnosis"
                  options={intervalOptions.map((e) => ({ label: e, value: e }))}
                  control={control}
                  isMulti
                />
                <Form.Text className="text-muted">
                  <i>Select years since diagnosis (follow-up) for survival plot and/or trend measures</i>
                </Form.Text>
              </Col>
            </Row>
            <Row>
              <Col>
                <b>Include Trend Measures</b>
              </Col>
            </Row>
            <Row>
              <Col sm="auto">
                <Form.Group>
                  <Form.Check
                    {...register("trendJp")}
                    id="trendJp"
                    label="Between Joinpoints"
                    aria-label="Between Joinpoints"
                    type="checkbox"
                    disabled={conditional}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col sm="auto">
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
              <Col sm="auto">
                <Form.Group className="mb-4">
                  <Form.Label>From</Form.Label>
                  <Form.Select
                    {...register("trendStart", {
                      valueAsNumber: true,
                      required: calendarTrend ? "Required" : false,
                      validate: (value, form) =>
                        value < form.trendEnd || `Must be less than ${+form.trendEnd + firstYear}`,
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
              <Col sm="auto">
                <Form.Group className="mb-4">
                  <Form.Label>To</Form.Label>
                  <Form.Select
                    {...register("trendEnd", {
                      valueAsNumber: true,
                      required: calendarTrend ? "Required" : false,
                      validate: (value, form) =>
                        value > form.trendStart || `Must be greater than ${+form.trendStart + firstYear}`,
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
              <Col>
                <Button type="submit" disabled={!calendarTrend || isFetching}>
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
          {trendJp && (
            <div>
              <h5>Average Absolute Change in Survival</h5>
              <TrendTable data={trendData} params={params} />
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
          {calendarTrend && Object.keys(calTrendData).length > 0 && (
            <div className="mt-3">
              <h5>Trend Measures for User Selected Years</h5>
              <TrendTable
                data={
                  params.useRelaxModel
                    ? calTrendData[cluster][fitIndex]
                        .reduce((acc, ar) => [...acc, ...ar], [])
                        .filter((e) => intervals.includes(e.interval))
                    : calTrendData[fitIndex]
                        .reduce((acc, ar) => [...acc, ...ar], [])
                        .filter((e) => intervals.includes(e.interval))
                }
                params={params}
              />
            </div>
          )}
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvYearPlot
            data={memoData}
            params={params}
            title={`${conditional ? "Conditional " : ""}${statistic} by Diagnosis Year`}
            xTitle={"Year of Diagnosis"}
            yTitle={`${isRecalcCond ? "Conditional " : ""}${statistic}`}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
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
                `survByYear - Model ${fitIndex} - ${cohortIndex}`
              )
            }>
            Download Dataset
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
          />
        </Col>
      </Row>
    </Container>
  );
}
