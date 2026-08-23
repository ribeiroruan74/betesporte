"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useInfluencers } from "@/lib/use-influencers";
import { STATUS_CONFIG, type StatusType } from "@/lib/influencers";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

function InstagramIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
			<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
			<line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
		</svg>
	);
}

export default function RegistroPage() {
	const { influencers, loading } = useInfluencers();
	const [currentIndex, setCurrentIndex] = useState(0);
	const [statuses, setStatuses] = useState<Record<string, string>>({});
	const [selected, setSelected] = useState<StatusType[]>([]);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	if (loading) {
		return (
			<AppShell>
				<p className="text-muted-foreground">Carregando dados...</p>
			</AppShell>
		);
	}

	if (influencers.length === 0) {
		return (
			<AppShell>
				<p className="text-muted-foreground">
					Nenhum influenciador encontrado na planilha para hoje.
				</p>
			</AppShell>
		);
	}

	const current = influencers[currentIndex];
	const isDone = currentIndex >= influencers.length;
	const postedCount = Object.keys(statuses).length;

	function toggleStatus(status: StatusType) {
		if (saving) return;
		if (status === "nao-postou") {
			setSelected((prev) => (prev.includes("nao-postou") ? [] : ["nao-postou"]));
		} else {
			setSelected((prev) => {
				const semNao = prev.filter((s) => s !== "nao-postou");
				return semNao.includes(status)
					? semNao.filter((s) => s !== status)
					: [...semNao, status];
			});
		}
	}

	function combinedLabel() {
		return selected.map((s) => STATUS_CONFIG[s].label).join(" / ");
	}

	async function salvarEavancar() {
		if (!current || selected.length === 0 || saving) return;
		const combined = combinedLabel();
		setSaving(true);
		try {
			await fetch("/api/registro", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: current.name, status: combined }),
			});
			setStatuses((prev) => ({ ...prev, [current.name]: combined }));
			setSaved(true);
			// Delay de 1,5s antes de avançar
			setTimeout(() => {
				setSaved(false);
				setSelected([]);
				if (currentIndex + 1 < influencers.length) {
					setCurrentIndex(currentIndex + 1);
				} else {
					setCurrentIndex(influencers.length);
				}
			}, 1500);
		} catch (e) {
			alert("Erro ao salvar o status. Tente novamente.");
			setSaving(false);
		}
	}

	function goBack() {
		if (currentIndex > 0 && !saving) {
			setCurrentIndex(currentIndex - 1);
			setSelected([]);
		}
	}

	if (isDone) {
		return (
			<AppShell>
				<div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 py-20 text-center">
					<div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 text-4xl">
						<CheckIcon className="h-10 w-10 text-green-500" />
					</div>
					<h1 className="text-2xl font-bold text-foreground">Dia finalizado!</h1>
					<p className="text-muted-foreground">
						{postedCount} de {influencers.length} influenciadores registrados.
					</p>
					<button
						onClick={() => { setStatuses({}); setCurrentIndex(0); setSelected([]); }}
						className="mt-4 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.03] active:scale-95"
					>
						Começar novo registro
					</button>
				</div>
			</AppShell>
		);
	}

	const instagramUrl = current.username
		? `https://instagram.com/${current.username.replace(/^@/, "")}`
		: null;

	return (
		<AppShell>
			<div className="pb-24 pt-2">
				<div className="mb-6">
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<span>{currentIndex + 1} / {influencers.length}</span>
						<span>{postedCount} registrados</span>
					</div>
					<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-all duration-500"
							style={{ width: `${((currentIndex + 1) / influencers.length) * 100}%` }}
						/>
					</div>
				</div>

				<div className="mb-6 overflow-visible rounded-3xl border border-border bg-card p-6 pt-8 text-center shadow-sm">
					<div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-visible">
						<div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#75CEFF] to-[#AF52DE] opacity-20 blur-xl" />
						<div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#75CEFF] to-[#5AC8FA] text-3xl font-bold text-white shadow-lg dark:border-[#1E293B]">
							{current.name.charAt(0)}
						</div>
					</div>
					<h1 className="text-xl font-bold text-foreground">{current.name}</h1>
					<p className="text-sm text-muted-foreground">{current.username}</p>

					{instagramUrl && (
						<a
							href={instagramUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:scale-[1.03] hover:border-primary/40 hover:shadow-md active:scale-95"
						>
							<InstagramIcon className="h-4 w-4 text-[#E4405F]" />
							Abrir Instagram
						</a>
					)}
				</div>

				<div className="grid grid-cols-2 gap-3">
					{(Object.keys(STATUS_CONFIG) as StatusType[])
						.filter((s) => s !== "nao-postou")
						.map((status) => {
							const config = STATUS_CONFIG[status];
							const isSelected = selected.includes(status);
							return (
								<button
									key={status}
									onClick={() => toggleStatus(status)}
									disabled={saving}
									className="flex flex-col items-center justify-center gap-2 rounded-2xl border p-5 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 disabled:opacity-50"
									style={{
										borderColor: isSelected ? config.color : config.color + "55",
										backgroundColor: isSelected ? `${config.color}33` : `${config.color}1A`,
										boxShadow: isSelected ? `0 0 0 2px ${config.color}` : "none",
									}}
								>
									<span className="text-2xl">{config.icon}</span>
									<span className="text-sm font-medium" style={{ color: config.color }}>{config.label}</span>
									{isSelected && <CheckIcon className="h-4 w-4" style={{ color: config.color }} />}
								</button>
							);
						})}
				</div>

				<button
					onClick={() => toggleStatus("nao-postou")}
					disabled={saving}
					className={`mt-3 w-full rounded-2xl py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl active:scale-95 disabled:opacity-50 ${
						selected.includes("nao-postou") ? "bg-[#FF3B30] shadow-[#FF3B30]/25" : "bg-[#FF3B30]/70"
					}`}
				>
					🚫 Não Postou
				</button>

				{/* Salvar automaticamente após selecionar */}
				{selected.length > 0 && !saving && (
					<div className="mt-4 rounded-2xl border border-border bg-card p-4">
						<p className="text-xs text-muted-foreground">Selecionado:</p>
						<p className="mt-1 text-sm font-semibold text-foreground">{combinedLabel()}</p>
						<button
							onClick={salvarEavancar}
							className="mt-3 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95"
						>
							Salvar e avançar
						</button>
					</div>
				)}

				{/* Feedback de salvamento */}
				{saving && (
					<div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
						<CheckIcon className="h-5 w-5 text-green-500" />
						<p className="text-sm font-medium text-green-600">
							{saved ? "Salvo! Avançando..." : "Salvando..."}
						</p>
					</div>
				)}

				<div className="mt-6 flex gap-3">
					<button
						onClick={goBack}
						disabled={currentIndex === 0 || saving}
						className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted disabled:opacity-40"
					>
						<ArrowLeftIcon className="h-4 w-4" />
						Anterior
					</button>
					{Object.keys(statuses).length > 0 && (
						<button
							onClick={() => { setSelected([]); if (currentIndex + 1 < influencers.length) setCurrentIndex(currentIndex + 1); else setCurrentIndex(influencers.length); }}
							disabled={saving}
							className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95"
						>
							Pular
							<ArrowRightIcon className="h-4 w-4" />
						</button>
					)}
				</div>
			</div>
		</AppShell>
	);
}