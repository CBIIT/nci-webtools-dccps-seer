"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import { BsList } from "react-icons/bs";

function pathsMatch(path1, path2) {
  if (!path1 || !path2) {
    return false;
  }
  return path1.replace(/\/$/, "") === path2.replace(/\/$/, "");
}

function isRouteActive(route, pathName) {
  if (route.path && pathsMatch(pathName, route.path)) {
    return true;
  }
  return route.subRoutes?.some((subRoute) => pathsMatch(pathName, subRoute.path)) ?? false;
}

export default function AppNavbar({ routes = [] }) {
  const pathName = usePathname();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <div>
      <div className="bg-primary">
        <Container
          style={{
            background: `url('https://surveillance.cancer.gov/images/dccps_logo.png') right -5px no-repeat`,
          }}>
          <h4 className="py-1">
            <Link href="/" title="JPSurv Home" className="text-white text-decoration-none">
              Surveillance Research Program
            </Link>
          </h4>
        </Container>
      </div>
      {/* Main Navbar */}
      <Navbar bg="dark" data-bs-theme="dark" className="text-uppercase font-title" expand="md">
        <Container>
          <Navbar.Toggle aria-controls="navbar-nav" className="px-0 py-3 text-uppercase">
            <BsList className="me-1" />
            Menu
          </Navbar.Toggle>
          <Navbar.Collapse id="navbar-nav" className="align-items-stretch">
            <Nav className="me-auto">
              {routes.map((route) =>
                route.subRoutes?.length ? (
                  <NavDropdown
                    key={route.title}
                    id={`nav-dropdown-${route.title}`}
                    active={isRouteActive(route, pathName)}
                    show={openMenu === route.title}
                    onMouseEnter={() => setOpenMenu(route.title)}
                    onMouseLeave={() => setOpenMenu(null)}
                    onToggle={(isOpen) => setOpenMenu(isOpen ? route.title : null)}
                    title={
                      // Clicking the label navigates to the first sub-route while hover reveals the menu.
                      <span onClick={() => router.push(route.subRoutes[0].path)}>{route.title}</span>
                    }>
                    {route.subRoutes.map((subRoute) => (
                      <NavDropdown.Item
                        key={subRoute.path}
                        as={Link}
                        href={subRoute.path}
                        active={pathsMatch(pathName, subRoute.path)}
                        onClick={() => setOpenMenu(null)}>
                        {subRoute.title}
                      </NavDropdown.Item>
                    ))}
                  </NavDropdown>
                ) : (
                  <Nav.Link
                    key={route.path}
                    as={Link}
                    href={route.path}
                    active={isRouteActive(route, pathName)}>
                    {route.title}
                  </Nav.Link>
                )
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  );
}
