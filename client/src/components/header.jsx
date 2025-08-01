"use client";
import AppNavbar from "./navbar/navbar";
import { useState } from "react";
import { BsSearch } from "react-icons/bs";
import Image from "next/image";
import { Container, Row, Col } from "react-bootstrap";

export default function Header({ routes = [] }) {
  const [search, setSearch] = useState("");

  const newSearch = () =>
    window.open("https://www.google.com/search?q=site:https://jpsurv.cancer.gov/ " + search, "_blank");

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
      <Container className="my-2">
        <Row>
          <Col xl="9" md="8" sm="12">
            <a rel="noopener noreferrer" href="https://cancercontrol.cancer.gov/">
              <Image src={'/assets/dccps-logo.svg'} alt="JPSurv Logo" className="mw-100 jpsurv-logo" width={700} height={65} unoptimized />
            </a>
          </Col>
          <Col xl="3" md="4" sm="9" xs="9">
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
          </Col>
        </Row>
      </Container>

      <AppNavbar routes={routes} />
    </header>
  );
}
