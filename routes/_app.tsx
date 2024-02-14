import { type PageProps } from "$fresh/server.ts";
export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>pass-key-memo</title>
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
