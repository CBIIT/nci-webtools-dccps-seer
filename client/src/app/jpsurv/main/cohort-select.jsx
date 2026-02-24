"use client";
import { useEffect } from "react";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import { useStore } from "../store";

export function getCohortLabel(params, cohort_index) {
  return params.cohortCombos[cohort_index - 1]
    ?.map((c, i) => params.cohorts[i].options.find((o) => o.value == c)?.label)
    .join(" + ");
}

export function CohortSelect({ params, manifest, className, handleSaveResults }) {
  const setState = useStore((state) => state.setState);
  const main = useStore((state) => state.main);
  const id = useStore((state) => state.params.id);
  const { cohortIndex, cutpointIndex, cluster, precision } = main;
  const errors = Array.isArray(manifest) ? manifest.filter((e) => typeof e === "string") : [manifest];
  const cohorts = Array.isArray(manifest) ? manifest.filter((e) => typeof e !== "string") : [];
  const cohortIndexes = [...new Set(cohorts.map((e) => e.cohort_index))];
  const cutpoints = cohorts.filter((e) =>
    cohortIndex ? e.cohort_index == cohortIndex : e.cohort_index == cohortIndexes[0]
  );

  // select initial cohort
  useEffect(() => {
    if (params.useRelaxModel) {
      if (!cohortIndex && !cutpointIndex && cohortIndexes.length && cutpoints.length) {
        setState({
          main: {
            ...main,
            cohortIndex: cohortIndexes[0],
            cutpointIndex: cutpoints.filter((e) => e.optimal_cutpoint)[0].cutpoint_index,
            cluster: "uncond",
          },
        });
      }
    } else if (!cohortIndex && cohortIndexes.length) {
      setState({ main: { ...main, cohortIndex: cohortIndexes[0] } });
    }
  }, [cohortIndexes, cutpoints, cohortIndex, cutpointIndex]);

  function handleCohortChange(e) {
    setState({ main: { ...main, cohortIndex: e.target.value } });
  }

  function handlePrecisionChange(e) {
    setState({ main: { ...main, precision: +e.target.value } });
  }

  function handleCutpointChange(e) {
    setState({
      main: { ...main, cutpointIndex: e.target.value, cluster: e.target.value == 1 ? "uncond" : main.cluster },
    });
  }

  const handleClusterChange = (e) => {
    setState({ main: { ...main, cluster: e.target.value } });
  };

  async function handleSaveWorkspace() {
    const response = await fetch(`/api/export/${id}`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jpsurv-${id}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <Form className={"mb-3 " + className}>
      {errors.length > 0 && (
        <Alert variant="warning" dismissible>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}
      <Row>
        <Col sm="auto">
          <Form.Group controlId="cohort">
            <Form.Label>Cohort</Form.Label>
            <Form.Select value={cohortIndex || ""} onChange={handleCohortChange}>
              {cohortIndexes.map((cohort_index, i) => (
                <option key={i} value={cohort_index}>
                  {getCohortLabel(params, cohort_index)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        {params.useRelaxModel && (
          <Col sm="auto">
            <Form.Group controlId="cutpoint">
              <Form.Label>Cutpoint</Form.Label>
              <Form.Select value={cutpointIndex || ""} onChange={handleCutpointChange}>
                {cutpoints.map((e, i) => (
                  <option key={i} value={e.cutpoint_index}>
                    {e.optimal_cutpoint ? i + " (Optimal)" : i}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        )}
        <Col sm="auto">
          <Form.Group controlId="precision">
            <Form.Label>Number of Decimal Places</Form.Label>
            <Form.Select value={precision} onChange={handlePrecisionChange}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((e, i) => (
                <option key={i} value={e}>
                  {e}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col />
        <Col sm="auto">
          <Button variant="link" onClick={handleSaveResults}>
            Download Full Dataset
          </Button>
        </Col>
        <Col sm="auto">
          <Button variant="link" onClick={handleSaveWorkspace}>
            Export Workspace
          </Button>
        </Col>
      </Row>
      {params.useRelaxModel && (
        <Row className="mt-3">
          <Col sm="auto">
            <Form.Check
              inline
              label="Cluster 1"
              name="cluster"
              type="radio"
              id="cluster1"
              value={"uncond"}
              checked={cluster === "uncond"}
              onChange={handleClusterChange}
            />
            <Form.Check
              inline
              label="Cluster 2"
              name="cluster"
              type="radio"
              id="cluster2"
              value={"cond"}
              checked={cluster === "cond"}
              onChange={handleClusterChange}
              disabled={cutpointIndex == 1}
              className={cutpointIndex == 1 ? "disabled-contrast" : ""}
            />
          </Col>
        </Row>
      )}
    </Form>
  );
}
