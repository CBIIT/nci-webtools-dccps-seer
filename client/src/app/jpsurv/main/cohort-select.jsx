"use client";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { FaCircleInfo } from "react-icons/fa6";

function getManifestCohorts(manifest) {
  return Array.isArray(manifest) ? manifest.filter((e) => typeof e !== "string") : [];
}

// fills in defaults for anything unset or not present in the manifest
export function resolveSelection(stored, manifest, useRelaxModel) {
  const cohorts = getManifestCohorts(manifest);
  const cohortIndexes = [...new Set(cohorts.map((e) => e.cohort_index))];
  const cohortIndex = cohortIndexes.find((e) => e == stored.cohortIndex) ?? cohortIndexes[0] ?? null;
  if (!useRelaxModel) return { ...stored, cohortIndex };

  const cutpoints = cohorts.filter((e) => e.cohort_index == cohortIndex);
  const cutpointIndex =
    cutpoints.find((e) => e.cutpoint_index == stored.cutpointIndex)?.cutpoint_index ??
    cutpoints.find((e) => e.optimal_cutpoint)?.cutpoint_index ??
    null;
  const cluster = cutpointIndex == 1 ? "uncond" : stored.cluster ?? "uncond";
  return { ...stored, cohortIndex, cutpointIndex, cluster };
}

export function getCohortLabel(params, cohort_index) {
  return params.cohortCombos[cohort_index - 1]
    ?.map((c, i) => params.cohorts[i].options.find((o) => o.value == c)?.label)
    .join(" + ");
}

// jp is the model's 0-based joinpoint offset(s) from firstYear; may be a scalar or an array
export function getJoinpointLabel(params, fitIndex, jp) {
  const years = (Array.isArray(jp) ? jp : jp ? [jp] : []).map((e) => +e + params.firstYear);
  return `Joinpoint ${fitIndex}${years.length ? ` (${years.join(", ")})` : ""}`;
}

export function CohortSelect({ id, params, manifest, selection, setSelection, className, handleSaveResults }) {
  const { cohortIndex, cutpointIndex, cluster, precision } = selection;
  const errors = Array.isArray(manifest) ? manifest.filter((e) => typeof e === "string") : [manifest];
  const cohorts = getManifestCohorts(manifest);
  const cohortIndexes = [...new Set(cohorts.map((e) => e.cohort_index))];
  const cutpoints = cohorts.filter((e) => e.cohort_index == cohortIndex);

  function handleCohortChange(e) {
    setSelection({ cohortIndex: e.target.value });
  }

  function handlePrecisionChange(e) {
    setSelection({ precision: +e.target.value });
  }

  function handleCutpointChange(e) {
    setSelection({ cutpointIndex: e.target.value, ...(e.target.value == 1 && { cluster: "uncond" }) });
  }

  const handleClusterChange = (e) => {
    setSelection({ cluster: e.target.value });
  };

  async function handleSaveWorkspace() {
    const response = await fetch(`/api/export/${id}`);
    if (!response.ok) {
      throw new Error("Error during workspace export");
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
            <Form.Label>
              Precision{" "}
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="precision-tooltip">Number of decimal places in data</Tooltip>}>
                <span>
                  <FaCircleInfo />
                </span>
              </OverlayTrigger>
            </Form.Label>
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
