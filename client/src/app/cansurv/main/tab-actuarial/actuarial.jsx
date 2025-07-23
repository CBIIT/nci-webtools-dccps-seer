"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form, Button, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import ActuarialPlot from "./plot";
import ActuarialTable from "./table";
import { downloadTableCansurv } from "@/services/xlsx";

export default function Actuarial({ data, seerData, params, precision }) {
  const { register, watch } = useForm({
    defaultValues: useMemo(() => {
      const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
      const subs = seerData.cohortVariables
        .filter((e) => !stratum.includes(e.name))
        .reduce((acc, e) => {
          acc[e.name] = 0;
          return acc;
        }, {});

      return { stratum: 0, ...subs };
    }, [data, seerData]),
  });
  const formState = watch();
  const statistic = seerData?.config["Session Options"]["Statistic"];
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
    [data]
  );

  const subStratumVars = useMemo(() => {
    const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
    return seerData.cohortVariables.filter((e) => !stratum.includes(e.name));
  }, [data]);

  const memoData = useMemo(() => {
    const { stratum, ...subStratum } = formState;
    const fit = data["fit.list"][stratum].data;
    return fit.filter((item) => {
      return Object.entries(subStratum).every(([key, value]) => item[key] == value);
    });
  }, [data, formState]);

  const valueToLabelMap = useMemo(() => {
    const map = { stratum: {}, ...Object.fromEntries(subStratumVars.map((e) => [e.name, {}])) };
    stratumOptions.forEach((option) => {
      map["stratum"][option.value] = option.label;
    });
    subStratumVars.forEach((varObj) => {
      varObj.factors.forEach((factor) => {
        map[varObj.name][factor.value] = factor.label;
      });
    });
    return map;
  }, [stratumOptions, subStratumVars]);

  function getPlotSubtitle() {
    const { stratum, ...subs } = formState;
    let subtitle = `${stratumOptions.length ? valueToLabelMap.stratum[stratum] + " / " : ""}`;
    Object.entries(subs).forEach(
      ([key, value], i) =>
        (subtitle += `${valueToLabelMap[key][value]}${i < Object.keys(subs).length - 1 ? " / " : ""}`)
    );
    return subtitle;
  }

  return (
    <Container fluid>
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
          <Row>
            {subStratumVars.map((e) => (
              <Col key={e.name} sm="auto">
                <Form.Group controlId={e.name}>
                  <Form.Label>{e.label}</Form.Label>
                  <Form.Select {...register(e.name, { valueAsNumber: true })}>
                    {e.factors.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
      <Row>
        <Col>
          <ActuarialPlot
            data={memoData}
            params={params}
            title={`Comparison of Estimated and Actuarial Survival`}
            subtitle={getPlotSubtitle()}
            xTitle={"Time Since Diagnosis"}
            yTitle={`${statistic}`}
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
              downloadTableCansurv(memoData, Object.keys(memoData[0]), params, `EstAct-${getPlotSubtitle()}`)
            }>
            Download Graph Dataset
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <ActuarialTable
            data={memoData}
            formState={formState}
            seerData={seerData}
            valueToLabelMap={valueToLabelMap}
            precision={precision}
          />
        </Col>
      </Row>
    </Container>
  );
}
