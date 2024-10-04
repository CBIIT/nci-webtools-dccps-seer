"use client";
import { useMemo, useState } from "react";
import { Container, Row, Col, Form, Button, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calculateCalendarTrends } from "../../queries";
import SelectHookForm from "@/components/selectHookForm";
import SurvYearPlot from "./surv-year-plot";
import SurvYearTable from "./surv-year-table";
import TrendTable from "./surv-trend-table";

export default function SurvivalVsYear({ data, seerData, params, cohortIndex, fitIndex }) {
  const queryClient = useQueryClient();
  const isFetching = queryClient.isFetching();
  const intervalOptions = [...new Set(data.fullpredicted.map((e) => e.Interval))];
  const defaultInterval = intervalOptions.includes(5) ? 5 : Math.max(...intervalOptions);
  const {
    control,
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      intervals: [defaultInterval],
      survTrend: false,
      calendarTrend: false,
      trendStart: "",
      trendEnd: "",
    },
  });
  const intervals = watch("intervals");
  const trendJp = watch("trendJp");
  const calendarTrend = watch("calendarTrend");
  const statistic = seerData?.config["Session Options"]["Statistic"];
  const yearStart = +seerData.seerStatDictionary.filter((e) => e.name === params.year)[0]["factors"][0].label;
  const yearOptions = [...new Set(data.predicted.map((e) => e[params.year]))];
  const memoData = useMemo(() => data.fullpredicted.filter((e) => intervals.includes(e.Interval)), [data, intervals]);
  const trendData = useMemo(
    () => data.survTrend.reduce((acc, ar) => [...acc, ...ar], []).filter((e) => intervals.includes(e.interval)),
    [data, intervals]
  );
  const [calTrendData, setCalTrendData] = useState([]);
  const observedHeader = params?.observed;
  const observedSeHeader = observedHeader?.includes("Relative") ? "Relative_SE_Cum" : "CauseSpecific_SE_Cum";
  const predictedHeader = "pred_cum";
  const predictedSeHeader = "pred_cum_se";

  async function getCalendarTrend(form) {
    try {
      const { data } = await queryClient.fetchQuery({
        queryKey: ["calendarTrend", cohortIndex, form.trendStart, form.trendEnd],
        queryFn: async () =>
          calculateCalendarTrends(params.id, { yearRange: [+form.trendStart, +form.trendEnd], cohortIndex }),
      });
      const reduceData = data.map((e) =>
        e.reduce((acc, ar) => [...acc, ...ar], []).filter((e) => intervals.includes(e.interval))
      );
      setCalTrendData(reduceData);
    } catch (e) {
      console.log(e);
    } finally {
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
                    id="survTrend"
                    label="Between Joinpoints"
                    aria-label="Between Joinpoints"
                    type="checkbox"
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
                  />
                </Form.Group>
              </Col>
              <Col sm="auto">
                <Form.Group className="mb-4">
                  <Form.Label>From</Form.Label>
                  <Form.Select
                    {...register("trendStart", {
                      required: calendarTrend ? "Required" : false,
                      validate: (value, form) =>
                        value < form.trendEnd || `Must be less than ${+form.trendEnd + yearStart}`,
                    })}
                    disabled={!calendarTrend}
                    isInvalid={errors?.trendStart}>
                    {yearOptions.map((year) => (
                      <option key={year} value={+year}>
                        {year + yearStart}
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
                      required: calendarTrend ? "Required" : false,
                      validate: (value, form) =>
                        value > form.trendStart || `Must be greater than ${+form.trendStart + yearStart}`,
                    })}
                    disabled={!calendarTrend}
                    isInvalid={errors?.trendEnd}>
                    {yearOptions.map((year) => (
                      <option key={year} value={+year}>
                        {year + yearStart}
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
              <TrendTable data={trendData} seerData={seerData} params={params} />
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
          {calendarTrend && (
            <div className="mt-3">
              <h5>Trend Measures for User Selected Years</h5>
              <TrendTable data={calTrendData[fitIndex]} seerData={seerData} params={params} />
            </div>
          )}
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvYearPlot
            data={memoData}
            seerData={seerData}
            params={params}
            title={`${statistic} by Diagnosis Year`}
            xTitle={"Year of Diagnosis"}
            yTitle={`${statistic} (%)`}
            observedHeader={observedHeader}
            predictedHeader={predictedHeader}
          />
        </Col>
      </Row>
      <Row>
        <Col>
          <SurvYearTable
            data={memoData}
            seerData={seerData}
            params={params}
            observedHeader={observedHeader}
            observedSeHeader={observedSeHeader}
            predictedHeader={predictedHeader}
            predictedSeHeader={predictedSeHeader}
          />
        </Col>
      </Row>
    </Container>
  );
}
