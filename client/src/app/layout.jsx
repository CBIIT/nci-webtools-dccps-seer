"use client";
import GoogleAnalytics from "@/components/analytics";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import "./styles/main.scss";

export default function RootLayout({ children }) {
  const routes = [
    // { title: "Home", path: "/", subRoutes: [] },
    { title: "JPSurv", path: "/jpsurv", subRoutes: [] },
    { title: "CanSurv", path: "/cansurv", subRoutes: [] },
    { title: "Help", path: "/help", subRoutes: [] },
  ];
  const queryClient = new QueryClient({});
  const pathname = usePathname();
  const currentRoute = routes.find((route) => route.path === pathname);
  const pageTitle = currentRoute ? `${currentRoute.title} | Survival Stats Tools` : "Survival Stats Tools";

  return (
    <html lang="en">
      <head>
        <title>{pageTitle}</title>
        <meta name="keywords" content="jpsurv" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <GoogleAnalytics id="UA-62346354-12" />
        <script async src="https://cbiit.github.io/nci-softwaresolutions-elements/components/include-html.js"></script>
      </head>
      <body>
        <include-html src="https://cbiit.github.io/nci-softwaresolutions-elements/banners/government-shutdown.html"></include-html>
        <Header routes={routes} />
        <main
          className="position-relative d-flex flex-column flex-grow-1 align-items-stretch bg-light"
          style={{ minHeight: "600px" }}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </main>
        <Footer />
      </body>
    </html>
  );
}
