"use client";

import Link from "next/link";
import { Settings, CircleHelp, Search } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NSolveLogo } from "@/components/ness-logo";
import { rootUser } from "@/data/users";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

const navSecondary = [
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Help",
    url: "#",
    icon: CircleHelp,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b border-[#1B2030]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-3 hover:bg-[#111317]">
              <Link href="/dashboard/default">
                <NSolveLogo size="md" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="bg-[#0B0C0E]">
        <NavMain items={sidebarItems} />
      </SidebarContent>
      
      <SidebarFooter className="border-t border-[#1B2030] bg-[#0B0C0E]">
        <NavUser user={rootUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
