import type { ReactNode } from "react";
import NustatymaiLayoutClient from "./NustatymaiLayoutClient";

export default function NustatymaiLayout({ children }: { children: ReactNode }) {
  return <NustatymaiLayoutClient>{children}</NustatymaiLayoutClient>;
}
