"use client";

function parseVersionAndDate(versionString) {
  if (!versionString) return { version: "dev", date: new Date().toISOString().split("T")[0] };
  const versionMatch = versionString.match(/(\d+\.\d+\.\d+)(_dev)?/);
  const version = versionMatch ? versionMatch[1] + (versionMatch[2] || "") : "dev";

  // Extract 8-digit date if present
  const dateMatch = versionString.match(/(\d{8})/)?.[1];
  const date = dateMatch
    ? `${dateMatch.slice(0, 4)}-${dateMatch.slice(4, 6)}-${dateMatch.slice(6, 8)}`
    : new Date().toISOString().split("T")[0];

  return { version, date };
}

export default function Footer() {
  const { version, date } = parseVersionAndDate(process.env.NEXT_PUBLIC_VERSION);

  return (
    <footer className="flex-grow-0">
      <div className="bg-primary text-light py-4">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mb-4">
              <a
                href="https://cancercontrol.cancer.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light h4 mb-1">
                Division of Cancer Control and Population Sciences
              </a>
              <div className="h6">
                at the{" "}
                <a
                  className="text-light fw-semibold"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://www.cancer.gov/">
                  National Cancer Institute
                </a>
              </div>
            </div>
            <div className="col-lg-4 mb-4">
              <a className="text-light" target="_blank" rel="noopener noreferrer" href="https://github.com/CBIIT/nci-webtools-dccps-seer">
                Version: {version}
              </a>
              <div>Last Updated: {date}</div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-4 mb-4">
              <div className="h5 mb-1 font-weight-light">CONTACT INFORMATION</div>
              <ul className="list-unstyled mb-0">
                <li>
                  <a
                    className="text-light"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="mailto:NCIJPSurvWebAdmin@mail.nih.gov">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-lg-4 mb-4">
              <div className="h5 mb-1 font-weight-light">POLICIES</div>
              <ul className="list-unstyled mb-0">
                <li>
                  <a
                    className="text-light"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://www.cancer.gov/policies/accessibility">
                    Accessibility
                  </a>
                </li>
                <li>
                  <a
                    className="text-light"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://www.cancer.gov/policies/disclaimer">
                    Disclaimer
                  </a>
                </li>
                <li>
                  <a
                    className="text-light"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://www.cancer.gov/policies/foia">
                    FOIA
                  </a>
                </li>
                <li>
                  <a
                    className="text-light"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://www.hhs.gov/vulnerability-disclosure-policy/index.html">
                    HHS Vulnerability Disclosure
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-lg-4 mb-4">
              <div className="h5 mb-1 font-weight-light">MORE INFORMATION</div>
              <ul className="list-unstyled mb-0">
                <li>
                  <a className="text-light" target="_blank" rel="noopener noreferrer" href="http://www.hhs.gov/">
                    U.S. Department of Health and Human Services
                  </a>
                </li>
                <li>
                  <a className="text-light" target="_blank" rel="noopener noreferrer" href="http://www.nih.gov/">
                    National Institutes of Health
                  </a>
                </li>
                <li>
                  <a className="text-light" target="_blank" rel="noopener noreferrer" href="https://www.cancer.gov/">
                    National Cancer Institute
                  </a>
                </li>
                <li>
                  <a className="text-light" target="_blank" rel="noopener noreferrer" href="http://usa.gov/">
                    USA.gov
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="text-center">NIH ... Turning Discovery Into Health ®</div>
      </div>
    </footer>
  );
}
