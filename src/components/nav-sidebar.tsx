"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  InboxIcon,
  UploadIcon,
  ImageIcon,
  SearchIcon,
  UsersIcon,
  DatabaseIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
  ChevronUpIcon,
  FileTextIcon,
  PaletteIcon,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/context";
import { NavHelpButton } from "@/components/nav-help-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const mainNavItems = [
  {
    label: "Panoramica",
    href: "/",
    icon: LayoutDashboardIcon,
    helpKey: "navHelp.panoramica" as const,
  },
  {
    label: "Coda in arrivo",
    href: "/coda",
    icon: InboxIcon,
    hasBadge: true,
    helpKey: "navHelp.coda" as const,
  },
  {
    label: t("nav.upload"),
    href: "/caricamento",
    icon: UploadIcon,
    helpKey: "navHelp.caricamento" as const,
  },
  {
    label: t("nav.gallery"),
    href: "/galleria",
    icon: ImageIcon,
    helpKey: "navHelp.galleria" as const,
  },
  {
    label: t("nav.search"),
    href: "/ricerca",
    icon: SearchIcon,
    helpKey: "navHelp.ricerca" as const,
  },
  {
    label: t("nav.theme"),
    href: "/tema",
    icon: PaletteIcon,
    helpKey: "navHelp.tema" as const,
  },
];

const adminNavItems = [
  {
    label: t("nav.users"),
    href: "/admin/utenti",
    icon: UsersIcon,
    helpKey: "navHelp.utenti" as const,
  },
  {
    label: t("nav.backup"),
    href: "/admin/backup",
    icon: DatabaseIcon,
    helpKey: "navHelp.backup" as const,
  },
  {
    label: t("nav.settings"),
    href: "/admin/impostazioni",
    icon: SettingsIcon,
    helpKey: "navHelp.impostazioni" as const,
  },
  {
    label: "Registro attività",
    href: "/admin/registro",
    icon: FileTextIcon,
    helpKey: "navHelp.registro" as const,
  },
];

export function NavSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    async function fetchQueueCount() {
      try {
        const res = await fetch("/api/v1/slides/incoming?count_only=true", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setQueueCount(data.count ?? 0);
        }
      } catch (error) {
        // Polled every 30s; avoid toast spam but surface in the console so
        // devs can see a flapping backend.
        console.error("Impossibile aggiornare la coda:", error);
      }
    }
    fetchQueueCount();
    const interval = setInterval(fetchQueueCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = user?.role === "admin";

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ImageIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{t("app.name")}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {t("app.tagline")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigazione</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href} className="group/menu-item">
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.hasBadge && queueCount > 0 && (
                    <SidebarMenuBadge>{queueCount}</SidebarMenuBadge>
                  )}
                  <NavHelpButton text={t(item.helpKey)} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>{t("nav.admin")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.href} className="group/menu-item">
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      <NavHelpButton text={t(item.helpKey)} />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="group/menu-item">
            <SidebarMenuButton
              tooltip="Aiuto"
              render={<Link href="/aiuto" />}
            >
              <HelpCircleIcon />
              <span>Aiuto</span>
            </SidebarMenuButton>
            <NavHelpButton text={t("navHelp.aiuto")} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar size="sm">
                  <AvatarFallback>
                    {user ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user?.name ?? "Utente"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email ?? ""}
                  </span>
                </div>
                <ChevronUpIcon className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-56"
              >
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOutIcon />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
