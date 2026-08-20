"use client";
import Container from "react-bootstrap/Container";

export default function CanSurvHelp() {
  return (
    <Container className="py-3">
      <article className="shadow p-4 rounded">
        <h2 className="text-primary">CanSurv Help</h2>
        <p>
          CanSurv has been developed to analyze population-based survival data. For grouped data, it can fit both
          standard survival models and mixture cure survival models.
        </p>

        <h2 className="h5 mb-2">What it does</h2>
        <p>
          Fits the standard survival models or mixture cure survival models to grouped population-based survival data
          and provides multiple graphs for model diagnosis.
        </p>

        <h2 className="h5 mb-2">Input data</h2>
        <p>
          Grouped relative survival or cause-specific survival data by survival time intervals as SEER*Stat survival
          text and dictionary files.
        </p>

        <h2 className="h5 mb-2">Model specifications</h2>
        <p>CanSurv has options for:</p>
        <ol>
          <li>Parametric survival model distributions</li>
          <li>
            A standard Cox proportional hazards model via a semiparametric option. An option to fit a mixture cure
            survival model is available. Analysis variable type (categorical or continuous) and component (stratum, mu,
            sigma, or cure) can be selected.
          </li>
        </ol>

        <h2 className="h5 mb-2">Computation specifications</h2>
        <p>
          Maximum number of iterations, convergence tolerance, number of restarts, and seed can all be specified. An
          option to be emailed results if a highly complex model is fit is available.{" "}
        </p>

        <h2 className="h5 mb-2">Output</h2>
        <p>
          Final parameter estimates (including cure fraction estimates if selected) and log-likelihood, graph of
          estimated and actuarial survival curves by analysis variables, graph of survival rate by years since diagnosis
          and analysis variables, graph of deviance residuals, graph of log-likelihood and cure fraction (if selected).
        </p>

        <h2 className="h5 mb-2">References</h2>
        <ol>
          <li>
            Gamel JW, Weller EA, Wesley MN, Feuer EJ. Parametric cure models of relative and cause-specific survival for
            grouped survival times. <i>Comput Methods Programs Biomed.</i> 2000 Feb;61(2):99-110.
          </li>
        </ol>
      </article>
    </Container>
  );
}
