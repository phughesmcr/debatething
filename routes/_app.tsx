import { asset } from "$fresh/runtime.ts";
import { type PageProps } from "$fresh/server.ts";

const JSONLD = {
  "@context": "http://www.schema.org",
  "@type": "WebSite",
  "name": "DebateThing.com",
  "url": "https://www.debatething.com",
  "image": {
    "@type": "ImageObject",
    "url": "https://www.debatething.com/android-chrome-512x512.png",
    "width": 512,
    "height": 512,
  },
};

export default function App({ Component }: PageProps) {
  return (
    <html lang="en" dir="ltr">
      <head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# rdfa: http://www.w3.org/ns/rdfa# rdfs: http://www.w3.org/2000/01/rdf-schema# dcterms: http://purl.org/dc/terms/ foaf: http://xmlns.com/foaf/0.1/">
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <title>DebateThing.com</title>
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={asset("/favicon-32x32.png")}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={asset("/favicon-16x16.png")}
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={asset("/apple-touch-icon.png")}
        />

        <meta name="theme-color" content="#1881F2" key="head-theme-color" />
        <meta name="application-name" content="DebateThing.com" />
        <meta name="HandheldFriendly" content="True" />
        <meta name="MobileOptimized" content="320" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />

        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
        <meta name="author" content="Peter Hughes - www.phugh.es" />
        <link
          rel="sitemap"
          type="application/xml"
          title="Sitemap"
          href={asset("/sitemap.xml")}
        />

        <link
          rel="manifest"
          href={asset("/site.webmanifest")}
          crossorigin="use-credentials"
        />

        <link rel="stylesheet" href={asset("/styles.css")} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: `${JSON.stringify(JSONLD)}` }}
        >
        </script>
        {
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(registration) {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
              }, function(err) {
                console.log('ServiceWorker registration failed: ', err);
              });
            });
          }
        `}}></script>
        }
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
