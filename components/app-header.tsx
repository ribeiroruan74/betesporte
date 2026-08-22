import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { navLinks } from "@/components/app-shared";
import { SearchIcon, BellIcon, HeadsetIcon } from "lucide-react";

const activeItem = navLinks.find((item) => item.isActive);

export function AppHeader() {
	return (
		<header
			className={cn(
				"sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 bg-background px-4 md:px-6"
			)}
		>
			<div className="flex items-center gap-2">
				<SidebarTrigger className="md:hidden" />
				<Separator
					className="mr-2 data-[orientation=vertical]:h-4 md:hidden"
					orientation="vertical"
				/>
				<AppBreadcrumbs page={activeItem} />
			</div>
			<div className="flex items-center gap-2">
				<Button aria-label="Buscar" size="icon" variant="ghost">
					<SearchIcon
					/>
				</Button>
				<Button aria-label="Notificações" size="icon" variant="ghost">
					<BellIcon
					/>
				</Button>
				<Button aria-label="Suporte" size="icon" variant="ghost">
					<HeadsetIcon
					/>
				</Button>
			</div>
		</header>
	);
}
