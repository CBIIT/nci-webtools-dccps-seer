"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form, Alert } from "react-bootstrap";
import { useForm } from "react-hook-form";
import LoglikePlot from "./plot";
import LoglikeTable from "./table";
import { downloadTable } from "@/services/xlsx";

export default function Loglike({ data, seerData, params, precision }) {
  const { register, watch } = useForm({
    defaultValues: { stratum: 0 },
  });
  const formState = watch();
  const stratumOptions = useMemo(
    () =>
      data["fit.list.by"]?.length
        ? data["fit.list.by"].map((e, index) => ({
            label: Object.entries(e)
              .reduce(
                (acc, [name, value]) => [
                  ...acc,
                  seerData.cohortVariables.filter((e) => e.name === name)[0].factors.filter((e) => e.value == value)[0]
                    .label,
                ],
                []
              )
              .join(" / "),
            value: index,
          }))
        : [],
    [data, seerData.cohortVariables]
  );

  const memoData = useMemo(() => {
    const { stratum } = formState;
    return data["fit.list"][stratum]?.profileLL;
  }, [data, formState]);

  const valueToLabelMap = useMemo(() => {
    const map = { stratum: {}, ...Object.fromEntries(seerData.cohortVariables.map((e) => [e.name, {}])) };
    stratumOptions.forEach((option) => {
      map["stratum"][option.value] = option.label;
    });
    seerData.cohortVariables.forEach((varObj) => {
      varObj.factors.forEach((factor) => {
        map[varObj.name][factor.value] = factor.label;
      });
    });
    return map;
  }, [seerData, stratumOptions]);

  function getPlotSubtitle() {
    const { stratum } = formState;
    let subtitle = `${stratumOptions.length ? valueToLabelMap.stratum[stratum] : ""}`;
    return subtitle;
  }

  return (
    <Container fluid>
      {!Object.keys(memoData).length > 0 ? (
        <Alert variant="info">LogLikelihood Unavailable</Alert>
      ) : (
        <>
          <Row className="border-bottom mb-3">
            <Col className="p-3">
              {stratumOptions.length > 0 && (
                <Row className="mb-3">
                  <Col sm="auto">
                    <Form.Group controlId="stratum">
                      <Form.Label>Stratum</Form.Label>
                      <Form.Select {...register("stratum", { valueAsNumber: true })}>
                        {stratumOptions.map((e) => (
                          <option key={e.label} value={e.value}>
                            {e.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <LoglikePlot
                data={memoData}
                title={`Profile Log-Likelihood Plot with Cure Fraction C`}
                subtitle={getPlotSubtitle()}
                xTitle={"Cure Fraction C"}
                yTitle={"Log(L)"}
                precision={precision}
              />
            </Col>
          </Row>
          <Row className="justify-content-between align-items-center">
            <Col sm="auto">Total Row Count: {memoData.length}</Col>
            <Col sm="auto">
              {/* <Button
            variant="link"
            onClick={() =>
              downloadTable(
                memoData,
                ["Interval", ".Surv.Est", ".Surv.Act", ".Cure.Fraction"],
                seerData,
                params,
                getPlotSubtitle()
              )
            }>
            Download Graph Dataset
          </Button> */}
            </Col>
          </Row>
          <Row>
            <Col>
              <LoglikeTable
                data={memoData}
                seerData={seerData}
                valueToLabelMap={valueToLabelMap}
                precision={precision}
              />
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}
