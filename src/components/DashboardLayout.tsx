import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";

interface Props {
  children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <main className="ml-16 p-6 lg:p-10">{children}</main>
    </div>
  );
}
