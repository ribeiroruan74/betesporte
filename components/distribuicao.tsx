"use client";

import { useMemo, useState } from "react";
import { useBancoDados } from "@/lib/use-banco-dados";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, parseFormatos, type StatusType } from "@/lib/influencers";

const FORMATOS: (StatusType | "todos")[] = [
	"todos",
	"story-link",
	"story-sem-link",
	"branding",
	"feed-reels",
	"nao-postou",
];

export function Distribuicao() {
	const { registros } = useBancoDados();
	const [filtro, setFiltro] = useState<StatusType | "todos">("todos");

	// Um mesmo registro pode conter mais de um formato (ex.: Story + Link E
	// Feed/Reels no mesmo dia). Cada formato encontrado soma 1 na sua própria
	// contagem, em vez de o registro "sumir" dentro de um rótulo combinado.
	const contagem = useMemo(() => {
		const map: Record<StatusType, number> = {
			"story-link": 0,
			"story-sem-link": 0,
			branding: 0,
			"feed-reels": 0,
			"nao-postou": 0,
		};
		registros.forEach((r) => {
			parseFormatos(r.status).forEach((f) => {
				map[f] += 1;
			});
		});
		return map;
	}, [registros]);

	// Total de entregas (não de registros — um dia com 2 formatos conta 2 entregas)
	const totalEntregas = Object.entries(contagem)
		.filter(([f]) => f !== "nao-postou")
		.reduce((a, [, qtd]) => a + qtd, 0);

	const itens = (Object.keys(contagem) as StatusType[]).filter(
		(f) => filtro === "todos" || f === filtro
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
							{f === "todos" ? "Todos" : STATUS_CONFIG[f].label}
						</button>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-3">
				{itens.every((f) => contagem[f] === 0) && (
					<p className="text-sm text-muted-foreground">Sem dados para este formato.</p>
				)}
				{itens.map((formato) => {
					const qtd = contagem[formato];
					if (qtd === 0 && filtro === "todos") return null;
					const base = formato === "nao-postou" ? registros.length || 1 : totalEntregas || 1;
					const pct = Math.round((qtd / base) * 100);
					const meta = STATUS_CONFIG[formato];
					return (
						<div key={formato}>
							<div className="mb-1 flex items-center justify-between text-sm">
								<span className="font-medium text-foreground">
									{meta.icon} {meta.label}
								</span>
								<span className="text-muted-foreground">{qtd} · {pct}%</span>
							</div>
							<div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full transition-all duration-500"
									style={{ width: `${pct}%`, backgroundColor: meta.color }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
