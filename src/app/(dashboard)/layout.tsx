"use client";

import React, { lazy, Suspense, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { NavSidebar, mainNavItems, adminNavItems } from "@/components/nav-sidebar";
import { t } from "@/lib/i18n";

const HelpBot = lazy(() =>
  import("@/components/help-bot").then((m) => ({ default: m.HelpBot }))
);
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Breadcrumb entries derived from the sidebar nav so the two can never
 * diverge, plus the routes that are reachable without a nav item.
 * Sorted longest-first so prefix matching picks the most specific entry
 * (e.g. /admin/utenti before a hypothetical /admin).
 */
const extraEntries: Array<[string, string]> = [
  ["/aiuto", "Aiuto"],
  ["/album", "Album"],
];

const breadcrumbEntries: Array<[string, string]> = [
  ...mainNavItems.map((item): [string, string] => [item.href, item.label]),
  ...adminNavItems.map((item): [string, string] => [item.href, item.label]),
  ...extraEntries,
].sort((a, b) => b[0].length - a[0].length);

/**
 * Longest-prefix match so dynamic routes (/galleria/12, /album/3) resolve
 * to their section title. Root ("/") only matches exactly.
 */
function resolvePageTitle(pathname: string): string | null {
  const entry = breadcrumbEntries.find(([prefix]) =>
    prefix === "/"
      ? pathname === "/"
      : pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return entry ? entry[1] : null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/accesso");
    }
  }, [loading, user, router]);

  if (loading) {
    // Branded loader: a blank slide mount on the light table, so the very
    // first paint already speaks the app's language.
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="slide-reveal flex flex-col items-center gap-3">
          <div className="rounded-sm border bg-card p-2 shadow-sm">
            <Skeleton className="aspect-[3/2] w-28 rounded-[3px]" />
          </div>
          <div className="film-sprockets w-40 opacity-40" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("labels.loading")}
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const pageTitle = resolvePageTitle(pathname);

  return (
    <SidebarProvider>
      <NavSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {pageTitle ? (
                <>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink
                      href="/"
                      className="font-semibold tracking-tight"
                    >
                      {t("app.name")}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {pageTitle}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                // Fallback so the header is never empty (especially on
                // mobile, where the root item is hidden when a title exists).
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold tracking-tight">
                    {t("app.name")}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        {/* Thin sprocket strip: the film edge that runs under every page header.
            Inline style because .film-sprockets is unlayered CSS and would win
            over utility overrides. */}
        <div
          className="film-sprockets shrink-0 opacity-30"
          style={{ height: "10px", backgroundSize: "19px 10px" }}
          aria-hidden
        />
        <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
      </SidebarInset>
      <Suspense><HelpBot /></Suspense>
    </SidebarProvider>
  );
}
