import { mkdir, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: `
      import { createRoot } from "react-dom/client";
      import { ReconciliationStudio } from "./app/demo/studio";
      import "./app/demo/studio.css";
      createRoot(document.getElementById("studio")).render(<ReconciliationStudio />);
    `,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  minify: true,
  write: false,
  outfile: "demo.js",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "inline",
});
const js = result.outputFiles.find((file) => file.path.endsWith(".js")).text;
const css = result.outputFiles.find((file) => file.path.endsWith(".css")).text;
await mkdir("dist/demo", { recursive: true });
await writeFile(
  "dist/demo/index.html",
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Statement reconciliation | Photon Trail</title><style>body{margin:0}${css}</style></head>
<body><div id="studio"></div><noscript>Enable JavaScript to use the reconciliation studio.</noscript>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script></body></html>`,
);
console.log("Wrote the self-contained studio to dist/demo/index.html");
