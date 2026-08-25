"use client";
import { usePathname } from "next/navigation";
import { LogoIcon } from "@/components/logo";
import {
Sidebar,
SidebarContent,
SidebarFooter,
SidebarGroup,
SidebarGroupLabel,
SidebarHeader,
SidebarMenu,
SidebarMenuButton,
SidebarMenuItem,
} from "@/components/ui/sidebar";
import { navGroups } from "@/components/app-shared";
import { NavUser } from "@/components/nav-user";
export function AppSidebar() {
const pathname = usePathname();
return (
<Sidebar collapsible="offcanvas" variant="sidebar" className="static min-h-full">
<SidebarHeader className="relative h-14 justify-center px-2 py-0">
<a
className="rounded-lg flex h-10 w-max items-center gap-2 px-3 hover:bg-muted dark:hover:bg-muted/50"
href="/"
>
<LogoIcon className="h-5 w-5 text-primary" />
<span className="text-base font-bold tracking-tight text-foreground">BETesporte</span>
</a>
</SidebarHeader>
<SidebarContent className="overflow-y-auto">
{navGroups.map((group, index) => (
<SidebarGroup key={`sidebar-group-${index}`}>
{group.label && (
<SidebarGroupLabel className="font-normal">{group.label}</SidebarGroupLabel>
)}
<SidebarMenu>
{group.items.map((item) => (
<SidebarMenuItem key={item.title}>
<SidebarMenuButton isActive={pathname === item.url} tooltip={item.title} render={<a href={item.url} />}>
<item.icon />
<span>{item.title}</span>
</SidebarMenuButton>
</SidebarMenuItem>
))}
</SidebarMenu>
</SidebarGroup>
))}
</SidebarContent>
<SidebarFooter className="gap-0 p-0">
<NavUser />
</SidebarFooter>
</Sidebar>
);
}