"use client";

import { DashboardInvoices } from "@/components/dashboard-invoices";
import { SalesChart } from "@/components/sales-chart";
import { DashboardStats } from "@/components/stats";
import { Calendario } from "@/components/calendario";
import { Distribuicao } from "@/components/distribuicao";
import { useInfluencers } from "@/lib/use-influencers";
import { useBancoDados } from "@/lib/use-banco-dados";

function normaliza(s: string) {
	return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function ehNaoPostou(status: string) {
	const n = normaliza(status);
	return n === "naopostou" || n === "pendente" || n === "nao" || n === "";
}

export function Dashboard() {
	const { influencers, loading } = useInfluencers();
	const { registros } = useBancoDados();

	if (loading) {
		return (
			<div className="flex flex-1 flex-col gap-6 py-6">
				<p className="text-muted-foreground">Carregando dados...</p>
			</div>
		);
	}

	const total = influencers.length;
	const posted = influencers.filter((i) => !ehNaoPostou(i.status || "")).length;
	const inadimplentes = total - posted;
	const adesao = total > 0 ? Math.round((posted / total) * 100) : 0;

	const stats = [
		{ label: "Postaram hoje", value: String(posted), delta: adesao },
		{ label: "% adesão", value: `${adesao}%`, delta: 0 },
		{ label: "Inadimplentes", value: String(inadimplentes), delta: inadimplentes > 0 ? -100 : 0 },
	];

	const attentionList = influencers.filter((i) => ehNaoPostou(i.status || ""));

	return (
		<div className="flex flex-1 flex-col gap-6 py-6">
			<div className="flex flex-col gap-1">
				<h1 className="font-semibold text-xl leading-tight">Bem-vindo de volta, Ruan! 👋</h1>
				<p className="text-base text-muted-foreground">Acompanhe as postagens dos influenciadores de hoje.</p>
			</div>

			<div className="rounded-lg overflow-hidden border">
				<div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-3">
					<DashboardStats stats={stats} />
					<SalesChart registros={registros} />
					<DashboardInvoices attentionList={attentionList} />
				</div>
			</div>

			{/* ⬇️ AQUI entra o bloco do Calendário + Distribuição ⬇️ */}
			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Calendario />
				<Distribuicao />
			</div>
		</div>
	);
}