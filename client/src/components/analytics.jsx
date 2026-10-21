"use client";
import Script from "next/script";

export default function GoogleAnalytics({ id }) {
  return (
    <>
      <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${id}`}></Script>
      <Script id="gtag" strategy="afterInteractive">
        {`
        window.dataLayer = window.dataLayer || [];
        function gtag() {
          dataLayer.push(arguments);
        }
        gtag("js", new Date());
        gtag("config", "${id}");
      `}
      </Script>

      <Script
        src="https://assets.adobedtm.com/6a4249cd0a2c/785de09de161/launch-70d67a6a40a8.min.js"
        strategy="afterInteractive"></Script>
    </>
  );
}
