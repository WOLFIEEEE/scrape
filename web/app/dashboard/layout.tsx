import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = (await cookies()).get("auth_token");
  if (!auth) redirect("/login");
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-bg focus:text-fg focus:border focus:border-rust focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Nav />
      <main id="main-content" className="flex-1 container mx-auto px-4 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
