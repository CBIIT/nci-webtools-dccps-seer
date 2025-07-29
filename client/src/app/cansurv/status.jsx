import { Spinner, Alert } from "react-bootstrap";
export default function Status({ seerData, status }) {
  return (
    <>
      {!status || status?.status !== "COMPLETED" ? (
        <div className="shadow border rounded bg-white p-3">
          {!status && Object.keys(seerData).length > 0 && (
            <div>Please configure your covariates under Model specifications on the left and click on Submit</div>
          )}
          {status?.status === "SUBMITTED" && <div>Your job has been submitted.</div>}
          {status?.status === "IN_PROGRESS" && (
            <div className="text-center">
              <Spinner variant="primary" animation="border" role="status" aria-hidden="true" />{" "}
              <div>Calculating...</div>
            </div>
          )}
          {status?.status === "FAILED" && (
            <Alert variant="danger">
              <div>
                An error has occurred. Please ensure the input file(s) is in the correct format and/or correct
                parameters were chosen.
              </div>
              <div>
                For further assistance, please contact us at:{" "}
                <a href="mailto:NCIJPSurvWebAdmin@mail.nih.gov">NCIJPSurvWebAdmin@mail.nih.gov</a>
              </div>
            </Alert>
          )}
        </div>
      ) : (
        <></>
      )}
    </>
  );
}
