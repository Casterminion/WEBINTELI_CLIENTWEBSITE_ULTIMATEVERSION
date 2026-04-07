import path from "path";
import { Font } from "@react-pdf/renderer";

let registered = false;

export function ensureInvoiceFontsServer(): void {
  if (registered) return;
  registered = true;
  const files = path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files");
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: path.join(files, "noto-sans-latin-ext-400-normal.woff"), fontWeight: 400 },
      { src: path.join(files, "noto-sans-latin-ext-700-normal.woff"), fontWeight: 700 },
    ],
  });
}
