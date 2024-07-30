"use client";
import AppNavbar from "./navbar/navbar";
import { useState } from "react";
import { BsSearch } from "react-icons/bs";

export default function Header({ routes = [] }) {
  const [search, setSearch] = useState("");

  const newSearch = () =>
    window.open("https://www.google.com/search?q=site:https://analysistools.cancer.gov/jpsurv " + search, "_blank");

  function handleKey(e) {
    if (e.key === "Enter") {
      newSearch();
    }
  }

  function handleClick(e) {
    newSearch();
  }

  return (
    <header>
      <div
        className="container my-2 mb-1 row"
        style={{
          marginLeft: "auto !important",
          marginRight: "auto !important",
        }}>
        <a
          className="col-xl-9 col-md-8 col-sm-12 mb-1"
          rel="noopener noreferrer"
          href="https://cancercontrol.cancer.gov/">
          <img src="/assets/dccps-logo.svg" alt="JPSurv Logo" className="mw-100 jpsurv-logo" />
        </a>
        <div className="col-xl-3 col-md-4 col-sm-9 col-sx-9 mb-1">
          <div className="d-flex" style={{ width: "auto !important" }}>
            <label htmlFor="doc_search" className="visually-hidden">
              Search:
            </label>
            <input
              id="doc_search"
              onKeyDown={(e) => handleKey(e)}
              onChange={(e) => setSearch(e.target.value)}
              name="search"
              type="text"
              className="form-control"
              placeholder="Document Site Search"
              style={{
                borderTopLeftRadius: "20px",
                borderBottomLeftRadius: "20px",
                borderBottomRightRadius: "0",
                borderTopRightRadius: "0",
              }}
            />

            <div
              className="input-group-text"
              onClick={() => handleClick()}
              style={{
                borderTopRightRadius: "20px",
                borderBottomRightRadius: "20px",
                borderBottomLeftRadius: "0",
                borderTopLeftRadius: "0",
                marginLeft: "-1px",
                cursor: "pointer",
              }}>
              <BsSearch />
            </div>
          </div>
        </div>
      </div>

      <AppNavbar routes={routes} />
    </header>
  );
}
