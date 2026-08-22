"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useInfluencers } from "@/lib/use-influencers";
import { STATUS_CONFIG, type StatusType } from "@/lib/influencers";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

// Ícone do Instagram (SVG embutido — a lib lucide-react removeu os ícones de marcas)
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
	const [statuses, setStatuses] = useState<Record<string, StatusType>>({});
	const [showConfirm, setShowConfirm] = useState(false);
	const [saving, setSaving] = useState(false);

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

	async function handleStatus(status: StatusType) {
		if (!current) return;
		setSaving(true);
		try {
			await fetch("/api/registro", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: current.name, status }),
			});
			setStatuses((prev) => ({ ...prev, [current.name]: status }));
			setShowConfirm(true);
		} catch (e) {
			alert("Erro ao salvar o status. Tente novamente.");
		} finally {
			setSaving(false);
		}
	}

	function next() {
		setShowConfirm(false);
		if (currentIndex + 1 < influencers.length) {
			setCurrentIndex(currentIndex + 1);
		} else {
			setCurrentIndex(influencers.length);
		}
	}

	function goBack() {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
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
						onClick={() => { setStatuses({}); setCurrentIndex(0); }}
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
				{/* Progresso */}
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

				{/* Card do influenciador */}
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

				{/* Botões de status */}
				<div className="grid grid-cols-2 gap-3">
					{(Object.keys(STATUS_CONFIG) as StatusType[])
						.filter((s) => s !== "nao-postou")
						.map((status) => {
							const config = STATUS_CONFIG[status];
							return (
								<button
									key={status}
									onClick={() => handleStatus(status)}
									disabled={saving}
									className="flex flex-col items-center justify-center gap-2 rounded-2xl border p-5 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 disabled:opacity-50"
									style={{ borderColor: config.color, backgroundColor: `${config.color}1A` }}
								>
									<span className="text-2xl">{config.icon}</span>
									<span className="text-sm font-medium" style={{ color: config.color }}>{config.label}</span>
								</button>
							);
						})}
				</div>

				{/* Não Postou */}
				<button
					onClick={() => handleStatus("nao-postou")}
					disabled={saving}
					className="mt-3 w-full rounded-2xl bg-[#FF3B30] py-4 font-semibold text-white shadow-lg shadow-[#FF3B30]/25 transition-all hover:scale-[1.01] hover:shadow-xl active:scale-95 disabled:opacity-50"
				>
					🚫 Não Postou
				</button>

				{/* Navegação */}
				<div className="mt-6 flex gap-3">
					<button
						onClick={goBack}
						disabled={currentIndex === 0}
						className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted disabled:opacity-40"
					>
						<ArrowLeftIcon className="h-4 w-4" />
						Anterior
					</button>
					{Object.keys(statuses).length > 0 && (
						<button
							onClick={next}
							className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95"
						>
							Pular
							<ArrowRightIcon className="h-4 w-4" />
						</button>
					)}
				</div>
			</div>

			{/* Modal de confirmação */}
			{showConfirm && current && statuses[current.name] && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
					<div className="w-full max-w-sm overflow-visible rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
						<div
							className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
							style={{ backgroundColor: `${STATUS_CONFIG[statuses[current.name]].color}1A` }}
						>
							{STATUS_CONFIG[statuses[current.name]].icon}
						</div>
						<p className="text-sm text-muted-foreground">Status registrado para</p>
						<p className="mt-1 text-lg font-bold text-foreground">{current.name}</p>
						<div
							className="mx-auto mt-4 w-fit rounded-full px-4 py-2 text-sm font-medium"
							style={{ backgroundColor: `${STATUS_CONFIG[statuses[current.name]].color}1A`, color: STATUS_CONFIG[statuses[current.name]].color }}
						>
							{STATUS_CONFIG[statuses[current.name]].label}
						</div>
						<button
							onClick={next}
							className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95"
						>
							Próximo influenciador
							<ArrowRightIcon className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}
		</AppShell>
	);
}