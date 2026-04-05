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
} from "lucide-react";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/context";
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
  DropdownMenuSeparator,
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
  },
  {
    label: "Coda in arrivo",
    href: "/coda",
    icon: InboxIcon,
    hasBadge: true,
  },
  {
    label: t("nav.upload"),
    href: "/caricamento",
    icon: UploadIcon,
  },
  {
    label: t("nav.gallery"),
    href: "/galleria",
    icon: ImageIcon,
  },
  {
    label: t("nav.search"),
    href: "/ricerca",
    icon: SearchIcon,
  },
];

const adminNavItems = [
  {
    label: t("nav.users"),
    href: "/admin/utenti",
    icon: UsersIcon,
  },
  {
    label: t("nav.backup"),
    href: "/admin/backup",
    icon: DatabaseIcon,
  },
  {
    label: t("nav.settings"),
    href: "/admin/impostazioni",
    icon: SettingsIcon,
  },
  {
    label: "Registro attività",
    href: "/admin/registro",
    icon: FileTextIcon,
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
      } catch {
        // silently ignore
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
                <SidebarMenuItem key={item.href}>
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
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
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
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Aiuto"
              render={<Link href="/aiuto" />}
            >
              <HelpCircleIcon />
              <span>Aiuto</span>
            </SidebarMenuButton>
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
                <DropdownMenuItem
                  onSelect={() => logout()}
                >
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
