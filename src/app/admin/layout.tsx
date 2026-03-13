import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AdminLayoutClient } from "./AdminLayoutClient";

export const metadata: Metadata = {
  title: "Admin | Webinteli",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  children: ReactNode;
};

export default function AdminLayout({ children }: Props) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

