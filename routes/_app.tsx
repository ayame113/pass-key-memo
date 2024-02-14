import { type PageProps } from "$fresh/server.ts";
export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>pass-key-memo</title>
        {/* <!-- Copyright 2018 Twitter, Inc and other contributors. Graphics licensed under CC-BY 4.0: https://creativecommons.org/licenses/by/4.0/ --> */}
        <link rel="icon" type="image/png" href="https://favi.deno.dev/💬.png" />
        <link rel="apple-touch-icon" href="https://favi.deno.dev/💬.png" />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kiwi+Maru&display=swap"
          rel="stylesheet"
          media="print"
          {...{ onload: "this.media='all'" }}
        />
        <style>
          {`
            body {
              font-family: 'Kiwi Maru', serif;
            }
          `}
        </style>
      </head>
      <body class="bg-slate-200">
        <Component />
      </body>
    </html>
  );
}
