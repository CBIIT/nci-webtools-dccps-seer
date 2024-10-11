"use client";
import { useEffect } from "react";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import { useStore } from "../store";

export default function CohortSelect({ params, manifest, className }) {
  const setState = useStore((state) => state.setState);
  const { cohortIndex, ...rest } = useStore((state) => state.main);
  const errors = manifest.filter((e) => typeof e === "string");
  const cohortComboIndexes = manifest.filter((e) => typeof e !== "string").map((e) => e.r_index);

  useEffect(() => {
    if (!cohortIndex && cohortComboIndexes.length) setState({ main: { ...rest, cohortIndex: cohortComboIndexes[0] } });
  }, [cohortComboIndexes, cohortIndex]);

  function handleCohortChange(e) {
    setState({ main: { ...rest, cohortIndex: e.target.value } });
  }

  return (
    <Form className={className}>
      {errors.length > 0 && (
        <Alert variant="warning" dismissible>
          <ul>
            {errors.map((e) => (
              <li>{e}</li>
            ))}
          </ul>
        </Alert>
      )}
      <Form.Group as={Row}>
        <Form.Label column sm="auto">
          Cohort
        </Form.Label>
        <Col sm="auto">
          <Form.Select value={cohortIndex || ""} onChange={handleCohortChange}>
            {cohortComboIndexes.map((r_index, i) => (
              <option key={i} value={r_index}>
                {params.cohortCombos[r_index - 1]
                  ?.map((c, i) => params.cohorts[i].options[c].label.replace(/"/gi, "").trim())
                  .join(" + ")}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Form.Group>
    </Form>
  );
}
