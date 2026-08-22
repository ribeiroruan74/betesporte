"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import {
	ChevronsUpDownIcon,
	UserIcon,
	BellIcon,
	CreditCardIcon,
	SettingsIcon,
	LifeBuoyIcon,
	LogOutIcon,
} from "lucide-react";

type UserType = { name: string; email: string };

const user: UserType = {
	name: "Ruan",
	email: "ribeiroruan74@gmail.com",
};

export function NavUser() {
	const { isMobile } = useSidebar();

	return (
		<SidebarMenu className="p-2">
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger render={<SidebarMenuButton className="text-muted-foreground" />}>
						<Avatar className="size-5">
							<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
						</Avatar>
						<span className="font-medium text-sm">{user.name}</span>
						<ChevronsUpDownIcon className="ml-auto size-3!" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-48" side={isMobile ? "bottom" : "right"} sideOffset={4}>
						<DropdownMenuGroup>
							<DropdownMenuItem><UserIcon /> Perfil</DropdownMenuItem>
							<DropdownMenuItem><BellIcon /> Notificações</DropdownMenuItem>
							<DropdownMenuItem><CreditCardIcon /> Cobrança</DropdownMenuItem>
							<DropdownMenuItem><SettingsIcon /> Configurações</DropdownMenuItem>
							<DropdownMenuItem><LifeBuoyIcon /> Central de Ajuda</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive"><LogOutIcon /> Sair</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}