"use client";
import { useMemo } from "react";
import { Container, Row, Col, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import KYearPlot from "./plot";
import KYearTable from "./table";
import { downloadTable } from "@/services/xlsx";

export default function KYear({ data, seerData, precision }) {
  const defaultValues = useMemo(() => {
    const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
    const subs = seerData.cohortVariables
      .filter((e) => !stratum.includes(e.name))
      .reduce((acc, e) => {
        acc[e.name] = 0;
        return acc;
      }, {});
    return { stratum: 0, k: 1, xAxisVar: Object.keys(subs)[0], ...subs };
  }, [data, seerData]);

  const { register, watch } = useForm({ defaultValues });
  const formState = watch();

  const stratumOptions = useMemo(
    () =>
      data["fit.list.by"]?.length
        ? data["fit.list.by"].map((e, index) => ({
            label: Object.entries(e)
              .reduce(
                (acc, [name, value]) => [
                  ...acc,
                  seerData.cohortVariables.filter((e) => e.name === name)[0].factors.filter((e) => e.value === value)[0]
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
  }, [stratumOptions, seerData.cohortVariables]);

  const kOptions = useMemo(() => {
    const { stratum, ..._ } = formState;
    const fit = data["fit.list"][stratum].data;
    return [...new Set(fit.map((e) => e.Interval))].map((e) => ({ label: e, value: e }));
  }, [data, formState]);

  const xAxisOptions = useMemo(() => {
    const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
    return seerData.cohortVariables
      .filter((e) => !stratum.includes(e.name))
      .map((e) => ({ label: e.label, value: e.name }));
  }, [data, seerData.cohortVariables]);

  const subStratumVars = useMemo(() => {
    const stratum = data["fit.list.by"].length ? Object.keys(data["fit.list.by"][0]) : [];
    return seerData.cohortVariables.filter((e) => ![...stratum, formState.xAxisVar].includes(e.name));
  }, [data, formState.xAxisVar]);

  const memoData = useMemo(() => {
    const { stratum, k, xAxisVar, [xAxisVar]: _, ...subStratum } = formState;
    const fit = data["fit.list"][stratum].data;
    return fit
      .filter((e) => {
        return Object.entries(subStratum).every(([key, value]) => e[key] == value);
      })
      .filter((e) => e.Interval == k);
  }, [data, formState]);

  function getPlotSubtitle() {
    const { stratum, k, xAxisVar, ...subs } = formState;
    let subtitle = `${stratumOptions.length ? valueToLabelMap.stratum[stratum] + " / " : ""}`;
    Object.entries(subs).forEach(
      ([key, value], i) =>
        (subtitle += `${valueToLabelMap[key][value]}${i < Object.keys(subs).length - 1 ? " / " : ""}`)
    );
    return `${subtitle} / K = ${k}`;
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
          <Row className="mb-3">
            <Col sm="auto">
              <Form.Group controlId="k">
                <Form.Label>K Value</Form.Label>
                <Form.Select {...register("k", { valueAsNumber: true })}>
                  {kOptions.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col sm="auto">
              <Form.Group controlId="xAxisVar">
                <Form.Label>X Axis Variable</Form.Label>
                <Form.Select {...register("xAxisVar")}>
                  {xAxisOptions.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            {subStratumVars.map((e) => (
              <Col key={e.name} sm="auto">
                <Form.Group controlId={e.name}>
                  <Form.Label></Form.Label>
                  {e.label}
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
          <KYearPlot
            data={memoData}
            xAxisVar={formState.xAxisVar}
            valueToLabelMap={valueToLabelMap}
            title={`Plot of K-Year Survival by Covariate`}
            subtitle={getPlotSubtitle()}
            xTitle={xAxisOptions.filter((e) => e.value === formState.xAxisVar)[0].label}
            yTitle={"Survival"}
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
          <KYearTable data={memoData} seerData={seerData} valueToLabelMap={valueToLabelMap} precision={precision} />
        </Col>
      </Row>
    </Container>
  );
}
