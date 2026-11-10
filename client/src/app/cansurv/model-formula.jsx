"use client";
import katex from "katex";
import "katex/dist/katex.min.css";

// G(t|...) body for each distribution, in terms of mu/sigma (see "Summary of CanSurv models", Table 1)
const G_BODY = {
  lnorm: "1 - \\Phi\\left(\\frac{\\ln(t)-\\mu}{\\sigma}\\right)",
  llogis: "\\left[1 + \\exp\\left(\\frac{\\ln(t)-\\mu}{\\sigma}\\right)\\right]^{-1}",
  weibull: "\\exp\\left(-\\exp\\left(\\frac{\\ln(t)-\\mu}{\\sigma}\\right)\\right)",
  gompertz: "\\exp\\left[\\frac{\\sigma}{\\mu}\\left(1-\\exp(\\mu t)\\right)\\right]",
};

function renderToHtml(tex) {
  try {
    // Inline (non-display) mode renders left-aligned by default (no katex-display centering),
    // which keeps sTex and the G(...) line visually consistent.
    return katex.renderToString(tex, { displayMode: false, throwOnError: false });
  } catch (e) {
    console.error(e);
    return "";
  }
}

export default function ModelFormula({ estCure, distribution }) {
  const isSemiParametric = distribution === "semi-parametric";
  // G(t|...) arguments: mu,sigma for all distributions, except Semi-Parametric which only has
  // mu (no sigma), regardless of whether a cure fraction is included in the model.
  const gArgs = isSemiParametric ? "\\mu" : "\\mu,\\sigma";

  // Each formula is a single, unbreakable KaTeX unit, so a long one-liner can only overflow
  // rather than wrap. Splitting every formula into a "label =" part and a separate body part,
  // laid out in a flex-wrap row, lets the body drop to its own line when space is tight.
  const sLabelTex = "S(t) =";
  const sBodyTex = estCure ? "c + (1 - c)\\,G(t \\mid " + gArgs + ")" : "G(t \\mid " + gArgs + ")";

  const gLabelTex = "G(t \\mid " + gArgs + ") =";
  const gBodyTex = isSemiParametric ? "G_0(t)^{\\exp(-\\mu)}" : G_BODY[distribution];

  if (!distribution) return null;

  return (
    <div className="bg-light border rounded p-2 mt-2 overflow-x-auto" style={{ fontSize: "0.85rem" }}>
      <div className="d-flex flex-wrap align-items-center column-gap-2">
        <span dangerouslySetInnerHTML={{ __html: renderToHtml(sLabelTex) }} />
        <span dangerouslySetInnerHTML={{ __html: renderToHtml(sBodyTex) }} />
      </div>
      <div className="d-flex flex-wrap align-items-center column-gap-2 mt-2">
        <span dangerouslySetInnerHTML={{ __html: renderToHtml(gLabelTex) }} />
        <span dangerouslySetInnerHTML={{ __html: renderToHtml(gBodyTex) }} />
      </div>
    </div>
  );
}
