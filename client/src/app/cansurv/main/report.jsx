import { Container, Row, Col } from "react-bootstrap";
import { useMemo } from "react";
import Table from "@/components/table";
import { createColumnHelper } from "@tanstack/react-table";
import { groupBy } from "lodash";

export default function Report({ data, seerData, precision }) {
  const fit = useMemo(() => {
    return data["fit.list"][0];
  }, [data]);

  const stratumOptions = useMemo(() => {
    return (
      data["fit.list.by"]?.map((e, index) => ({
        label: Object.entries(e)
          .map(
            ([name, value]) =>
              seerData.cohortVariables.find((v) => v.name === name)?.factors.find((f) => f.value == value)?.label || ""
          )
          .join(" / "),
        value: index,
      })) || []
    );
  }, [data, seerData.cohortVariables]);

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

  const cureFractionTable = useMemo(() => {
    const subs = seerData.cohortVariables.map((e) => e.name);
    return Object.values(groupBy(fit.data, (item) => subs.map((key) => item[key]))).map((group) => group[0]); // Get the first item from each group
  }, [fit.data, seerData.cohortVariables]);

  const columnHelper = createColumnHelper();
  const columnEstimates = [
    columnHelper.accessor("parameter", {
      header: () => "Parameter",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("Estimate", {
      header: () => "Estimate",
      cell: (info) => info.getValue().toFixed(precision),
    }),
    columnHelper.accessor((e) => e["Std. Error"], {
      id: "stderr",
      header: () => "Std. Error",
      cell: (info) => info.getValue().toFixed(precision),
    }),
  ];
  const columnCure = [
    ...seerData.cohortVariables.map((e) =>
      columnHelper.accessor(e.name, {
        header: () => e.label,
        cell: (info) => valueToLabelMap[e.name][info.getValue()],
      })
    ),
    columnHelper.accessor((e) => e[".Cure.Fraction"], {
      id: "cure-fraction",
      header: () => "Cure Fraction",
      cell: (info) => info.getValue()[0].toFixed(precision),
    }),
  ];

  return (
    <Container className="p-3">
      <Row>
        <Col>
          <h4>Number of Cohorts and Follow-Up Intervals</h4>
          <ul>
            <li>Number of Cohorts: {fit.obj.nsets}</li>
            <li>Number of Follow-Up Intervals: {fit.obj.nint}</li>
          </ul>
        </Col>
      </Row>
      <Row>
        <Col>
          <h4>Final Estimates and Tests</h4>
          <Table data={fit.fitlist.estimates} columns={columnEstimates} size="sm" />
        </Col>
      </Row>
      <Row>
        <Col>
          <h4>Cure Fractions</h4>
          <Table data={cureFractionTable} columns={columnCure} size="sm" />
        </Col>
      </Row>
    </Container>
  );
}
