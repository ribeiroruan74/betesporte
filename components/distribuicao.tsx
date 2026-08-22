"use client";

import { useMemo, useState } from "react";
import { useBancoDados } from "@/lib/use-banco-dados";
import { cn } from "@/lib/utils";

const FORMATOS = ["Todos", "Story + Link", "Story Sem Link", "Branding", "Feed/Reels", "Não Postou"];

const CORES: Record<string, string> = {
	"Story + Link": "#75CEFF",
	"Story Sem Link": "#5AC8FA",
	Branding: "#AF52DE",
	"Feed/Reels": "#FF9500",
	"Não Postou": "#FF3B30",
};

function normaliza(s: string) {
	return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function classifica(status: string): string {
	const n = normaliza(status);
	if (n.includes("story") && n.includes("link")) return "Story + Link";
	if (n.includes("story")) return "Story Sem Link";
	if (n.includes("branding")) return "Branding";
	if (n.includes("feed") || n.includes("reels")) return "Feed/Reels";
	if (n.includes("nao") || n.includes("pendente")) return "Não Postou";
	return "Outros";
}

export function Distribuicao() {
	const { registros } = useBancoDados();
	const [filtro, setFiltro] = useState("Todos");

	const contagem = useMemo(() => {
		const map: Record<string, number> = {};
		registros.forEach((r) => {
			const f = classifica(r.status);
			map[f] = (map[f] || 0) + 1;
		});
		return map;
	}, [registros]);

	const total = Object.values(contagem).reduce((a, b) => a + b, 0);
	const itens = Object.entries(contagem).filter(
		([f]) => filtro === "Todos" || f === filtro
	);

	return (
		<div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-lg font-bold text-foreground">Distribuição por Formato</h2>
				<div className="flex flex-wrap gap-1.5">
					{FORMATOS.map((f) => (
						<button
							key={f}
							onClick={() => setFiltro(f)}
							className={cn(
								"rounded-full px-3 py-1 text-xs font-medium transition-all hover:scale-105",
								filtro === f ? "bg-primary text-primary-foreground shadow-md" : "border border-border text-muted-foreground hover:bg-muted"
							)}
						>
							{f}
						</button>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-3">
				{itens.length === 0 && <p className="text-sm text-muted-foreground">Sem dados para este formato.</p>}
				{itens.map(([formato, qtd]) => {
					const pct = total > 0 ? Math.round((qtd / total) * 100) : 0;
					const cor = CORES[formato] || "#94A3B8";
					return (
						<div key={formato}>
							<div className="mb-1 flex items-center justify-between text-sm">
								<span className="font-medium text-foreground">{formato}</span>
								<span className="text-muted-foreground">{qtd} · {pct}%</span>
							</div>
							<div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full transition-all duration-500"
									style={{ width: `${pct}%`, backgroundColor: cor }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}