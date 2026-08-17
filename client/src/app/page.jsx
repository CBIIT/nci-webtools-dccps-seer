"use client";
import Link from "next/link";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";

const tools = [
  {
    title: "JPSurv",
    path: "/jpsurv",
    description:
      "JPSurv is a tool for estimating trends in survival with respect to year of diagnosis using the joinpoint survival model. This model is an extension of the proportional hazards model for survival, where the effect of calendar year at diagnosis is linear on the log hazard of cancer death scale. The model allows for different linear trends between “joinpoints”, i.e., calendar years where trends in the hazard of cancer death changes. The model can be used to predict survival in any given year and time interval.",
  },
  {
    title: "CanSurv",
    path: "/cansurv",
    description:
      "CanSurv is used to analyze grouped population-based survival data. The tool can fit both standard parametric survival models, Cox proportional hazards models, and mixture cure survival models. The survival data can be either relative survival or cause-specific survival. Various graphs are provided for model diagnosis: plots of actuarial and estimated survival functions, k-year survival probabilities, and deviance residuals.",
  },
  {
    title: "RecurRisk",
    path: "/recurrence",
    description:
      "RecurRisk estimates the risk of progressing to distant recurrence using disease-specific survival obtained from registries. The disease-specific survival is assessed via cause-specific survival, which is assumed to follow a mixture-cure model. The risk of recurrence is inferred from the survival among the non-cured fraction. The cure fraction and parametric survival distribution among those not cured are estimated using the CanSurv tool.",
  },
];

export default function Home() {
  return (
    <Container size="md" className="px-5 py-4 bg-white">
      <h1>Survival Stats Tools</h1>
      <p>
        The Survival Stats Tools website contains a suite of tools to analyze population-based survival data. These
        include:
      </p>
      <ol>
        <li>JPSurv: a tool to estimate trends in cancer survival by calendar year of diagnosis</li>
        <li>
          CanSurv: a tool to fit models, including standard Cox proportional hazards and mixture cure models, to grouped
          survival data
        </li>
        <li>RecurRisk: a tool to estimate the probability of progressing to distant recurrence.</li>
      </ol>
      <p>
        From each of these tools, users can run and view results fully online and export the results for further
        analysis.
      </p>
      {tools.map((tool) => (
        <Card key={tool.path} as={Link} href={tool.path} className="my-4 text-decoration-none text-reset">
          <Card.Body>
            <Card.Title>{tool.title}</Card.Title>
            <Card.Text>{tool.description}</Card.Text>
          </Card.Body>
        </Card>
      ))}
    </Container>
  );
}
