import Link from "next/link";
import { Row, Col } from "react-bootstrap";
export default function Instructions() {
  return (
    <div className="shadow border rounded bg-white p-3">
      <Row>
        <Col md="12">
          <p>
            The JPSurv software (1) has been developed to analyze trends in survival with respect to year of diagnosis.
            The joinpoint survival model (2) is an extension of the proportional hazard model for survival where the
            effect of calendar year at diagnosis is linear on the log hazard of cancer death scale. The joinpoint model
            allows for different linear trends between joinpoints, i.e., calendar years where trends in the hazard of
            cancer death changes.
          </p>

          <p>
            <b>
              Caution should be used when interpreting survival trends for cancer sites for which screening have been
              widely disseminated.
            </b>{" "}
            <a href="https://pubmed.ncbi.nlm.nih.gov/25417232/" target="_blank">
              See article.
            </a>
          </p>

          <p>
            <b>What it does: </b>Fits the joinpoint survival model with 0 to the specified maximum number of joinpoints.
            For each number of joinpoints JPSurv estimates the best model and the respective location of joinpoints, the
            slope parameters for each segment, the baseline hazard and diagnostic statistics to compare models with
            different number of joinpoints.
          </p>

          <p>
            <b>Input data: </b>Grouped relative survival or cause-specific survival data by survival time intervals and
            by calendar year at diagnosis, either as delimited text file or as SEER*Stat survival text and dictionary
            files.
          </p>

          <p>
            <b>Cohort specification: </b>The JPSurv web tool fits a joinpoint model to each cohort (selected values of
            variables).
          </p>

          <p>
            <b>Computation time: </b>Fitting more than one model or fitting a model with 3 or more joinpoints takes a
            long time and an e-mail address is required to retrieve results.
          </p>

          <p>
            <b>Advanced options: </b>Provide control to reduce the number of joinpoints estimated due to data
            variability that do not reflect a significant change in survival.
          </p>

          <p>
            <b>Output: </b>Number and location of joinpoints, parameter estimates for each segment, diagnostic
            statistics and graphs of observed and modeled cumulative survival by time since diagnosis and trends of
            x-years cumulative survival.
          </p>

          <p>
            1. Mariotto AB, Zhang F, Buckman DW, et al. Characterizing Trends in Cancer Patients&apos; Survival Using
            the JPSurv Software. Mariotto et al. Cancer Epidemiol Biomarkers Prev. 30 (11): 2001–2009.
            <a href="https://doi.org/10.1158/1055-9965.EPI-21-0423" target="_blank">
              https://doi.org/10.1158/1055-9965.EPI-21-0423
            </a>
          </p>
          <p>
            2. Yu BB, Huang L, Tiwari RC, Feuer EJ, Johnson KA. Modelling population-based cancer survival trends by
            using join point models for grouped survival data. Yu et al. Journal of the Royal Statistical Society Series
            a-Statistics in Society. 2009;172:405-25.
          </p>

          <Link aria-label="Help" href="/help" title="Help for Joinpoint Model for Relative Survival">
            Help for Joinpoint Model for Relative Survival
          </Link>
        </Col>
      </Row>
    </div>
  );
}
