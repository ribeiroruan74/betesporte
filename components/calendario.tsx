"use client";

import { useMemo, useState } from "react";
import { useBancoDados } from "@/lib/use-banco-dados";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, parseFormatos } from "@/lib/influencers";

function paraISO(data: string) {
	const p = data.split("/");
	if (p.length !== 3) return "";
	const ano = (p[2].length === 2 ? "20" + p[2] : p[2]).padStart(4, "0");
	return `${ano}-${String(parseInt(p[1]) || 0).padStart(2, "0")}-${String(parseInt(p[0]) || 0).padStart(2, "0")}`;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function Calendario() {
	const { registros } = useBancoDados();
	const hoje = new Date();
	const [mes, setMes] = useState(hoje.getMonth());
	const [ano, setAno] = useState(hoje.getFullYear());
	const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

	const porDia = useMemo(() => {
		const map = new Map<string, { nome: string; status: string }[]>();
		registros.forEach((r) => {
			const iso = paraISO(r.data);
			if (!iso) return;
			if (!map.has(iso)) map.set(iso, []);
			map.get(iso)!.push({ nome: r.nome || r.username, status: r.status });
		});
		return map;
	}, [registros]);

	const primeiroDia = new Date(ano, mes, 1);
	const diasNoMes = new Date(ano, mes + 1, 0).getDate();
	const offset = primeiroDia.getDay();
	const celulas: (number | null)[] = [
		...Array(offset).fill(null),
		...Array.from({ length: diasNoMes }, (_, i) => i + 1),
	];

	function isoDe(dia: number) {
		return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
	}

	const registrosDoDia = diaSelecionado ? porDia.get(diaSelecionado) || [] : [];

	return (
		<div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-lg font-bold text-foreground">Calendário de Postagens</h2>
				<div className="flex items-center gap-2">
					<button
						onClick={() => { if (mes === 0) { setMes(11); setAno(ano - 1); } else setMes(mes - 1); }}
						className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
					>←</button>
					<span className="w-32 text-center text-sm font-medium capitalize text-foreground">
						{primeiroDia.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
					</span>
					<button
						onClick={() => { if (mes === 11) { setMes(0); setAno(ano + 1); } else setMes(mes + 1); }}
						className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
					>→</button>
				</div>
			</div>

			<div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
				{DIAS_SEMANA.map((d) => <div key={d} className="py-1">{d}</div>)}
			</div>

			<div className="mt-1 grid grid-cols-7 gap-1">
				{celulas.map((dia, i) => {
					if (dia === null) return <div key={`v-${i}`} />;
					const iso = isoDe(dia);
					const regs = porDia.get(iso) || [];
					const ehHoje = iso === hoje.toISOString().slice(0, 10);
					return (
						<button
							key={iso}
							onClick={() => setDiaSelecionado(iso)}
							className={cn(
								"flex min-h-14 flex-col items-center gap-1 rounded-lg border p-1 text-sm transition-all hover:scale-[1.03] hover:shadow-md",
								ehHoje ? "border-primary bg-primary/10" : "border-border bg-background",
								diaSelecionado === iso && "ring-2 ring-primary"
							)}
						>
							<span className="font-medium text-foreground">{dia}</span>
							<div className="flex flex-wrap justify-center gap-0.5">
								{regs
									.flatMap((r) => parseFormatos(r.status))
									.slice(0, 4)
									.map((f, j) => (
										<span key={j} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG[f].color }} />
									))}
							</div>
						</button>
					);
				})}
			</div>

			{diaSelecionado && (
				<div className="mt-4 rounded-xl border border-border bg-background p-4">
					<div className="mb-2 flex items-center justify-between">
						<h3 className="text-sm font-semibold text-foreground">
							{new Date(diaSelecionado + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
						</h3>
						<button onClick={() => setDiaSelecionado(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ fechar</button>
					</div>
					{registrosDoDia.length === 0 ? (
						<p className="text-sm text-muted-foreground">Nenhum registro neste dia.</p>
					) : (
						<ul className="flex flex-col gap-2">
							{registrosDoDia.map((r, i) => (
								<li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
									<span className="min-w-0 truncate text-sm font-medium text-foreground">{r.nome}</span>
									<span className="flex shrink-0 flex-wrap justify-end gap-1">
										{parseFormatos(r.status).map((f) => (
											<span
												key={f}
												className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
												style={{ backgroundColor: STATUS_CONFIG[f].color }}
											>
												{STATUS_CONFIG[f].label}
											</span>
										))}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}