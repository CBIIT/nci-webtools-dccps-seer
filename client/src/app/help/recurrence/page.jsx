"use client";
import Container from "react-bootstrap/Container";
import { TABLE_COLUMN_MAP } from "@/app/recurrence/main/table-columns";

const MODEL_PARAMETER_KEYS = [
  "link",
  "cure",
  "lambda",
  "k",
  "theta",
  "median_surv_notcured",
  "surv_notcured",
  "surv_curemodel",
  "obs_surv",
  "obs_dist_surv",
];

function DefinitionList({ keys }) {
  return (
    <ul>
      {keys
        .map((key) => TABLE_COLUMN_MAP[key])
        .filter((column) => column?.definition)
        .map((column) => (
          <li key={column.key}>
            <strong>{column.label}: </strong>
            {column.definition}
          </li>
        ))}
    </ul>
  );
}

export default function RecurRiskHelp() {
  return (
    <Container className="py-3">
      <article className="shadow p-4 rounded">
        <h2 className="text-primary">About RecurRisk</h2>
        <p>
          RecurRisk estimates the population-level risk of distant metastatic recurrence or progression among patients
          whose cancer was nonmetastatic at diagnosis. Estimates describe groups of patients, rather than individualized
          prognosis.
        </p>
        <p>
          Here, <b>recurrence</b> includes both progression to metastatic disease and distant metastatic recurrence,
          whether or not a disease-free interval was documented. Time is measured from diagnosis. Estimates represent
          risk in the absence of other causes of death.
        </p>
        <p>
          The tool uses relative or cause-specific survival data in life-table format exported from SEER*Stat, together
          with mixture cure model estimates from CanSurv. The model separates the population into a statistically cured
          fraction, patients not at risk of dying from their cancer, and a noncured fraction. It assumes that patients
          who die from their cancer first develop metastatic disease. Recurrence risk is inferred from survival among
          the noncured fraction and an estimate of survival after metastatic recurrence.
        </p>
        <p>RecurRisk supports Weibull and log-logistic mixture cure distributions.</p>

        <h2 className="h5 mb-2">Intended uses</h2>
        <p>
          Population-based recurrence data are not routinely available from cancer registries. RecurRisk can help
          researchers:
        </p>
        <ul>
          <li>
            Estimate the proportion of patients who develop metastatic recurrence or progression within specified
            periods after diagnosis.
          </li>
          <li>Describe differences across population groups or diagnosis periods.</li>
          <li>Provide model-based comparisons for studies collecting recurrence data.</li>
        </ul>

        <h2 className="h5 mb-2">Quick start</h2>
        <ol>
          <li>
            <b>
              Download the <a href="/data/recurrence_risk_groupdata/recurrence_risk_groupdata.zip">example files</a>.
            </b>{" "}
            The example includes cause-specific survival for female breast cancer patients by AJCC stage (I-IV),
            diagnosis period (2000-2004 and 2005-2015), and age at diagnosis (15-59, 60-74, and 75-84 years).
          </li>
          <li>
            <b>Identify stage.</b> Select the variable containing stage at diagnosis, then select the value representing
            distant metastatic disease, such as stage IV. Survival for this group is used to estimate survival after
            metastatic recurrence.
          </li>
          <li>
            <b>Select the groups to analyze.</b> Run all groups or select specific strata. In the example, stages I-III,
            two diagnosis periods, and three age groups produce estimates for 18 groups. Selecting all age groups and
            stages but only the most recent period (2005-2015) produces 9 groups.
          </li>
          <li>
            <b>Obtain CanSurv estimates.</b> Fit mixture cure models for the nonmetastatic groups in CanSurv and export
            the results. These provide the cure fraction and survival parameters for the noncured fraction.
          </li>
          <li>
            <b>
              Specify the adjustment factor, <em>r</em>.
            </b>{" "}
            This factor adjusts the cancer mortality hazard after metastatic recurrence relative to that after an
            initial diagnosis of metastatic disease. The default is 1. Choose other values using relevant external
            evidence and explore plausible alternatives in sensitivity analyses.
            <ul>
              <li>
                <b>
                  <em>r</em> = 1:
                </b>{" "}
                assumes the same survival.
              </li>
              <li>
                <b>
                  <em>r</em> &lt; 1:
                </b>{" "}
                assumes better survival after metastatic recurrence.
              </li>
              <li>
                <b>
                  <em>r</em> &gt; 1:
                </b>{" "}
                assumes poorer survival after metastatic recurrence.
              </li>
            </ul>
          </li>
          <li>
            <b>Run the analysis and review the results.</b> Check model convergence, fit, and sensitivity before
            interpreting or reporting recurrence estimates.
          </li>
        </ol>

        <h2 className="h5 mb-2">Prepare your data</h2>
        <p>
          RecurRisk accepts survival data exported from SEER*Stat. Include a stage variable that distinguishes
          nonmetastatic from distant metastatic disease. <b>CanSurv</b> uses the same SEER*Stat data as RecurRisk.
        </p>
        <p>
          Long-term follow-up is important for estimating the cure fraction and survival among the noncured fraction.
          The follow-up needed depends on the cancer and its survival pattern; a minimum of 10 years is recommended.
          Interpret projections beyond observed follow-up cautiously.
        </p>
        <p>
          Grouping variables define separate strata rather than covariate effects within a model. Analyze all available
          strata or select particular values.
        </p>

        <h2 className="h5 mb-2">Understand your results</h2>
        <p>
          The main recurrence estimates are net metastatic recurrence risks from the analytical or numerical methods.
          They should not be interpreted as cumulative incidence accounting for competing causes of death.
        </p>
        <h3 className="h6">Recurrence estimates using Analytical or Numerical Method</h3>
        <p>
          Analytical uses the assumption that survival from recurrence follows an exponential distribution and numerical
          uses a numerical solution to a deconvolution equation.
        </p>
        <ul>
          <li>
            <strong>Net metastatic recurrence risk: </strong>Estimated net cumulative incidence of metastatic recurrence
            or progression by a specified time after diagnosis. Equal to 1 minus the corresponding net recurrence-free
            probability.
          </li>
          <li>
            <strong>Standard error of net recurrence risk: </strong>Standard error of the corresponding net recurrence
            risk estimate.
          </li>
          <li>
            <strong>Net recurrence-free probability: </strong>Estimated probability of remaining free of metastatic
            recurrence or progression beyond a specified time from diagnosis in the strata.
          </li>
          <li>
            <strong>Recurrence-free probability among the noncured fraction: </strong>Estimated probability of remaining
            free of metastatic recurrence or progression beyond a specified time from diagnosis in the specified cohort.
          </li>
        </ul>

        <h3 className="h6">Model Parameters</h3>
        <DefinitionList keys={MODEL_PARAMETER_KEYS} />

        <h2 className="h5 mb-2">Check your results</h2>
        <p>
          <b>Start with the mixture cure model.</b> Confirm that the CanSurv models converged and that the fitted
          survival curves adequately describe the input survival data, including the later follow-up years. Convergence
          alone does not establish good fit.
        </p>
        <p>
          <b>Compare methods and assumptions.</b> Examine agreement between analytical and numerical solutions. The
          analytical method assumes an exponential distribution for survival after recurrence; the numerical method does
          not require this assumption. Investigate substantial differences.
        </p>
        <p>
          <b>
            Assess sensitivity to <em>r</em> and model distribution.
          </b>{" "}
          Repeat analyses using plausible values of <em>r</em>
          and, where appropriate, both Weibull and log-logistic models. Published analyses showed robustness under
          several evaluated scenarios, but misspecifying survival after recurrence can bias estimates. Assess robustness
          for each application.
        </p>
        <p>
          <b>Distinguish statistical uncertainty from uncertainty in assumptions.</b> The provided standard-error
          calculation does not incorporate uncertainty in <em>r</em>; sensitivity analyses provide additional
          information.
        </p>
        <p>
          <b>Interpret estimates in the 1-2 years from diagnosis cautiously.</b> A 2023 validation study found close
          agreement between modeled and empirically derived five-year recurrence-free survival for female breast, colon,
          and rectum cancers. Agreement was weaker during years 1-3 after diagnosis. This evidence does not establish
          equivalent performance for other cancers or populations.
        </p>
      </article>
    </Container>
  );
}
