import type React from "react";
import {
	LayoutDashboardIcon,
	ClipboardCheckIcon,
	CreditCardIcon,
	TrophyIcon,
	BarChart3Icon,
	HistoryIcon,
	SettingsIcon,
} from "lucide-react";

export type NavItem = {
	title: string;
	url: string;
	icon: React.ComponentType<{ className?: string }>;
};

export type NavGroup = {
	label?: string;
	items: NavItem[];
};

export const navGroups: NavGroup[] = [
	{
		label: "Gestão",
		items: [
			{ title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
			{ title: "Registro", url: "/registro", icon: ClipboardCheckIcon },
		],
	},
	{
		label: "Financeiro",
		items: [{ title: "Cobrança", url: "/cobranca", icon: CreditCardIcon }],
	},
	{
		label: "Relatórios",
		items: [
			{ title: "Ranking", url: "/ranking", icon: TrophyIcon },
			{ title: "Relatórios", url: "/relatorios", icon: BarChart3Icon },
			{ title: "Histórico", url: "/historico", icon: HistoryIcon },
		],
	},
	{
		label: "Sistema",
		items: [{ title: "Configurações", url: "/configuracoes", icon: SettingsIcon }],
	},
];

export const navLinks = navGroups.flatMap((group) => group.items);

export const footerNavLinks: NavItem[] = [];