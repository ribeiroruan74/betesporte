import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { FullWidthDivider } from "@/components/full-width-divider";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { IosTabBar } from "@/components/ios-tab-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="overflow-x-hidden">
			<SidebarProvider className="relative mx-auto h-svh w-full max-w-full overflow-x-hidden lg:border-x">
				<FullWidthDivider className="top-14 z-60 -translate-y-px print:hidden" />
				<div className="print:hidden">
					<AppSidebar />
				</div>
				<SidebarInset className="min-w-0 flex-1 overflow-x-hidden">
					<div className="print:hidden">
						<AppHeader />
					</div>
					<div className="ios-tabbar-padding flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 md:p-6 print:overflow-visible print:p-0">
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
			<IosTabBar />
		</div>
	);
}