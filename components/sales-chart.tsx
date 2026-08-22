"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { formatDate } from "@/components/formater";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";

type PeriodDays = 7 | 30;
type Registro = { data: string; nome: string; username: string; status: string };
type DayRow = { date: string; postaram: number; naopostaram: number };

function normaliza(s: string) {
	return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function ehNaoPostou(status: string) {
	const n = normaliza(status);
	return n === "naopostou" || n === "pendente" || n === "nao" || n === "";
}

function paraISO(data: string) {
	const p = data.split("/");
	if (p.length !== 3) return "";
	const ano = (p[2].length === 2 ? "20" + p[2] : p[2]).padStart(4, "0");
	return `${ano}-${String(parseInt(p[1]) || 0).padStart(2, "0")}-${String(parseInt(p[0]) || 0).padStart(2, "0")}`;
}

function parseChartDay(isoDate: string) {
	return new Date(`${isoDate}T12:00:00`);
}

const chartConfig = {
	postaram: { label: "Postaram", color: "var(--chart-2)" },
	naopostaram: { label: "Não postaram", color: "var(--chart-3)" },
} satisfies ChartConfig;

const animationConfig = { glowWidth: 520 };

function highlightXFromChartMouseEvent(e: unknown): number | null {
	const ex = e as { activeCoordinate?: { x?: number; y?: number }; chartX?: number };
	const fromActive = ex.activeCoordinate?.x;
	if (typeof fromActive === "number" && Number.isFinite(fromActive)) return fromActive;
	const legacy = ex.chartX;
	if (typeof legacy === "number" && Number.isFinite(legacy)) return legacy;
	return null;
}

export function SalesChart({ registros }: { registros: Registro[] }) {
	const chartUid = useId().replace(/:/g, "");
	const idMaskGrad = `sales-chart-mask-grad-${chartUid}`;
	const idMask = `sales-chart-highlight-mask-${chartUid}`;

	const [periodDays, setPeriodDays] = useState<PeriodDays>(7);
	const [xAxis, setXAxis] = useState<number | null>(null);

	const allDays = useMemo<DayRow[]>(() => {
		const porDia = new Map<string, { postaram: number; naopostaram: number }>();
		registros.forEach((r) => {
			const atual = porDia.get(r.data) || { postaram: 0, naopostaram: 0 };
			if (ehNaoPostou(r.status)) atual.naopostaram++;
			else atual.postaram++;
			porDia.set(r.data, atual);
		});
		return Array.from(porDia.entries())
			.map(([data, v]) => ({ date: paraISO(data), postaram: v.postaram, naopostaram: v.naopostaram }))
			.filter((d) => d.date)
			.sort((a, b) => (a.date < b.date ? -1 : 1));
	}, [registros]);

	const referenceDate = useMemo(() => {
		const last = allDays.at(-1);
		return last ? parseChartDay(last.date) : new Date();
	}, [allDays]);

	const chartRows = useMemo(() => {
		const startDate = new Date(referenceDate);
		startDate.setDate(startDate.getDate() - periodDays);
		return allDays.filter((item) => parseChartDay(item.date) >= startDate);
	}, [allDays, periodDays, referenceDate]);

	const growthPctNum = useMemo(() => {
		const first = chartRows[0];
		const last = chartRows.at(-1);
		if (!first || !last) return 0;
		const a = first.postaram;
		const b = last.postaram;
		if (!a) return 0;
		return ((b - a) / a) * 100;
	}, [chartRows]);

	const xAxisMinTickGap: number | undefined = periodDays > 7 ? 32 : undefined;
	const idGradPostaram = `sales-chart-grad-postaram-${chartUid}`;
	const idGradNao = `sales-chart-grad-nao-${chartUid}`;

	return (
		<Card className="rounded-none border-0 bg-background py-4 shadow-none ring-0 lg:col-span-3">
			<CardHeader>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<CardTitle className="text-base">Postagens por dia</CardTitle>
							<Delta value={growthPctNum} variant="badge">
								<DeltaIcon variant="trend" />
								<DeltaValue />
							</Delta>
						</div>
						<CardDescription>
							Postaram vs não postaram, últimos {periodDays} dias.
						</CardDescription>
					</div>
					<Select
						onValueChange={(v) => {
							const n = Number(v);
							if (n === 7 || n === 30) setPeriodDays(n);
						}}
						value={String(periodDays)}
					>
						<SelectTrigger
							aria-label="Sales chart time range"
							className="w-full min-w-36 sm:w-fit"
							size="sm"
						>
							<SelectValue placeholder="Range" />
						</SelectTrigger>
						<SelectContent align="end">
							<SelectItem value="7">Últimos 7 dias</SelectItem>
							<SelectItem value="30">Últimos 30 dias</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent>
				{chartRows.length === 0 ? (
					<p className="text-sm text-muted-foreground">Sem dados no banco ainda.</p>
				) : (
					<ChartContainer
						className="aspect-21/9 min-h-48 w-full p-0"
						config={chartConfig}
					>
						<AreaChart
							data={chartRows}
							margin={{ left: 4, right: 12, top: 8 }}
							onMouseLeave={() => setXAxis(null)}
							onMouseMove={(e) => setXAxis(highlightXFromChartMouseEvent(e))}
						>
							<CartesianGrid className="stroke-border" strokeDasharray="3 3" vertical={false} />
							<XAxis
								axisLine={false}
								dataKey="date"
								interval={periodDays <= 7 ? 0 : "preserveStartEnd"}
								minTickGap={xAxisMinTickGap}
								tickFormatter={(value) => formatDate(String(value), "day-month")}
								tickLine={false}
								tickMargin={8}
							/>
							<ChartTooltip content={<ChartTooltipContent />} cursor={false} />
							<defs>
								<linearGradient id={idMaskGrad} x1="0" x2="1" y1="0" y2="0">
									<stop offset="0%" stopColor="transparent" />
									<stop offset="28%" stopColor="white" stopOpacity={0.55} />
									<stop offset="50%" stopColor="white" />
									<stop offset="72%" stopColor="white" stopOpacity={0.55} />
									<stop offset="100%" stopColor="transparent" />
								</linearGradient>
								<linearGradient id={idGradNao} x1="0" x2="0" y1="0" y2="1">
									<stop offset="5%" stopColor="var(--color-naopostaram)" stopOpacity={0.4} />
									<stop offset="95%" stopColor="var(--color-naopostaram)" stopOpacity={0} />
								</linearGradient>
								<linearGradient id={idGradPostaram} x1="0" x2="0" y1="0" y2="1">
									<stop offset="5%" stopColor="var(--color-postaram)" stopOpacity={0.4} />
									<stop offset="95%" stopColor="var(--color-postaram)" stopOpacity={0} />
								</linearGradient>
								{typeof xAxis === "number" && Number.isFinite(xAxis) ? (
									<mask id={idMask}>
										<rect fill={`url(#${idMaskGrad})`} height="100%" width={animationConfig.glowWidth} x={xAxis - animationConfig.glowWidth / 2} y={0} />
									</mask>
								) : null}
							</defs>
							<Area dataKey="naopostaram" fill={`url(#${idGradNao})`} fillOpacity={0.4} mask={`url(#${idMask})`} stackId="a" stroke="var(--color-naopostaram)" strokeWidth={0.8} type="linear" />
							<Area dataKey="postaram" fill={`url(#${idGradPostaram})`} fillOpacity={0.4} mask={`url(#${idMask})`} stackId="a" stroke="var(--color-postaram)" strokeWidth={0.8} type="linear" />
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}