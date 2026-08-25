"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CheckIcon, ClockIcon, DatabaseIcon, MessageSquareIcon, PaletteIcon, RefreshCwIcon, TagIcon, TargetIcon } from "lucide-react";
import { InfluenciadoresManager } from "@/components/influenciadores-manager";

type Tema = "sistema" | "claro" | "escuro";

interface StatusConfig {
	id: string;
	label: string;
	cor: string;
	contaComoPostou: boolean;
}

interface ConfigBetesporte {
	status: StatusConfig[];
	regras: {
		horarioLimite: string;
		toleranciaMin: number;
		diaCobrancaSemanal: string;
		diaCobrancaMensal: number;
	};
	mensagens: {
		diaria: string;
		semanal: string;
		mensal: string;
	};
	preferencias: {
		tema: Tema;
		formatoData: string;
	};
}

const CHAVE = "betesporte_config";

const CONFIG_PADRAO: ConfigBetesporte = {
	status: [
		{ id: "story-link", label: "Story + Link", cor: "#75CEFF", contaComoPostou: true },
		{ id: "story-sem-link", label: "Story Sem Link", cor: "#5AC8FA", contaComoPostou: true },
		{ id: "branding", label: "Branding", cor: "#AF52DE", contaComoPostou: false },
		{ id: "feed-reels", label: "Feed/Reels", cor: "#FF9500", contaComoPostou: true },
		{ id: "nao-postou", label: "Não Postou", cor: "#FF3B30", contaComoPostou: false },
	],
	regras: {
		horarioLimite: "23:59",
		toleranciaMin: 0,
		diaCobrancaSemanal: "sexta-feira",
		diaCobrancaMensal: 1,
	},
	mensagens: {
		diaria:
			"Olá {nome}! 👋\n\nPassando para lembrar sobre a postagem de hoje ({periodo}) referente à parceria com a BETesporte. 🎯\n\nQualquer dúvida, estamos à disposição!\nAtenciosamente, Equipe BETesporte.",
		semanal:
			"Olá {nome}! 👋\n\nVocê ficou {dias} dia(s) sem postar nesta semana ({periodo}). Contamos com você para manter a parceria com a BETesporte! 🎯\n\nQualquer dúvida, estamos à disposição!\nAtenciosamente, Equipe BETesporte.",
		mensal:
			"Olá {nome}! 👋\n\nNeste mês ({periodo}), você ficou {dias} dia(s) sem postar. Reforçamos a importância das entregas para a parceria com a BETesporte. 🎯\n\nQualquer dúvida, estamos à disposição!\nAtenciosamente, Equipe BETesporte.",
	},
	preferencias: {
		tema: "sistema",
		formatoData: "dd/mm/aaaa",
	},
};

const DIAS_SEMANA = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];

export default function ConfiguracoesPage() {
	const [config, setConfig] = useState<ConfigBetesporte>(CONFIG_PADRAO);
	const [carregado, setCarregado] = useState(false);
	const [salvo, setSalvo] = useState<"ok" | "saving">("ok");
	const [conn, setConn] = useState<"checking" | "ok" | "error">("checking");
	const [connInfo, setConnInfo] = useState("");
	const [ultimaVerif, setUltimaVerif] = useState("");
	const primeiraVez = useRef(true);

	// Carrega a configuração salva
	useEffect(() => {
		try {
			const raw = localStorage.getItem(CHAVE);
			if (raw) {
				const p = JSON.parse(raw);
				setConfig({
					...CONFIG_PADRAO,
					...p,
					status: p.status ?? CONFIG_PADRAO.status,
					regras: { ...CONFIG_PADRAO.regras, ...(p.regras ?? {}) },
					mensagens: { ...CONFIG_PADRAO.mensagens, ...(p.mensagens ?? {}) },
					preferencias: { ...CONFIG_PADRAO.preferencias, ...(p.preferencias ?? {}) },
				});
			}
		} catch (e) {
			// config corrompida — usa o padrão
		}
		setCarregado(true);
	}, []);

	// Salva automaticamente com debounce
	useEffect(() => {
		if (!carregado) return;
		if (primeiraVez.current) {
			primeiraVez.current = false;
			return;
		}
		setSalvo("saving");
		const t = setTimeout(() => {
			try {
				localStorage.setItem(CHAVE, JSON.stringify(config));
			} catch (e) {
				// armazenamento cheio/indisponível
			}
			setSalvo("ok");
		}, 500);
		return () => clearTimeout(t);
	}, [config, carregado]);

	// Aplica o tema
	useEffect(() => {
		const html = document.documentElement;
		const tema = config.preferencias.tema;
		if (tema === "escuro") {
			html.classList.add("dark");
		} else if (tema === "claro") {
			html.classList.remove("dark");
		} else {
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) html.classList.add("dark");
			else html.classList.remove("dark");
		}
	}, [config.preferencias.tema]);

	// Testa a conexão com a planilha
	function testar() {
		setConn("checking");
		Promise.all([
			fetch("/api/influencers").then((r) => r.json()),
			fetch("/api/banco-dados").then((r) => r.json()),
		])
			.then(([inf, banco]) => {
				const infOk = !inf.error && Array.isArray(inf.influencers);
				const bancoOk = !banco.error && Array.isArray(banco.registros);
				if (infOk && bancoOk) {
					setConn("ok");
					setConnInfo(`${inf.influencers.length} influenciadores · ${banco.registros.length} registros no banco`);
				} else {
					setConn("error");
					setConnInfo(`influencers: ${inf.error || "ok"} | banco: ${banco.error || "ok"}`);
				}
				setUltimaVerif(new Date().toLocaleTimeString("pt-BR"));
			})
			.catch((e) => {
				setConn("error");
				setConnInfo(String(e));
				setUltimaVerif(new Date().toLocaleTimeString("pt-BR"));
			});
	}

	useEffect(() => {
		testar();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function atualizarStatus(id: string, campo: keyof StatusConfig, valor: string | boolean) {
		setConfig((c) => ({
			...c,
			status: c.status.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)),
		}));
	}

	function atualizarRegra(campo: keyof ConfigBetesporte["regras"], valor: string | number) {
		setConfig((c) => ({ ...c, regras: { ...c.regras, [campo]: valor } }));
	}

	function atualizarMensagem(tipo: keyof ConfigBetesporte["mensagens"], valor: string) {
		setConfig((c) => ({ ...c, mensagens: { ...c.mensagens, [tipo]: valor } }));
	}

	function restaurarMensagens() {
		setConfig((c) => ({ ...c, mensagens: CONFIG_PADRAO.mensagens }));
	}

	function previewMensagem(template: string) {
		return template.replace(/\{nome\}/g, "Zico").replace(/\{periodo\}/g, "hoje").replace(/\{dias\}/g, "3");
	}

	const bolinha = (estado: "ok" | "error" | "checking") =>
		estado === "ok" ? "bg-green-500" : estado === "error" ? "bg-red-500" : "bg-yellow-400 animate-pulse";

	return (
		<AppShell>
			<div className="flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Configurações</h1>
					<p className="mt-1 text-sm text-muted-foreground">Fonte de dados, status, regras, mensagens e preferências</p>
				</div>
				<span
					className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
						salvo === "ok" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
					}`}
				>
					{salvo === "ok" ? <CheckIcon className="h-3.5 w-3.5" /> : <ClockIcon className="h-3.5 w-3.5" />}
					{salvo === "ok" ? "Salvo ✓" : "Salvando..."}
				</span>
			</div>

			{/* 1. CONEXÃO */}
			<div className="glass-card card-animate mt-6 rounded-2xl p-6">
				<div className="flex items-center gap-2">
					<DatabaseIcon className="h-4 w-4 text-muted-foreground" />
					<h2 className="text-sm font-semibold text-foreground">Conexão com a planilha</h2>
				</div>
				<p className="mt-2 text-xs text-muted-foreground">
					A planilha e a credencial são configuradas no painel da Vercel (variáveis de ambiente). Aqui você acompanha o
					status e testa a conexão.
				</p>
				<div className="mt-4 flex items-center gap-3">
					<span className={`h-3 w-3 rounded-full ${bolinha(conn)}`} />
					<p className="text-sm text-muted-foreground">
						{conn === "ok" ? "Conectado" : conn === "error" ? "Erro na conexão" : "Verificando..."}
					</p>
				</div>
				{connInfo && <p className="mt-2 text-sm text-foreground">{connInfo}</p>}
				{ultimaVerif && <p className="mt-1 text-xs text-muted-foreground">Última verificação: {ultimaVerif}</p>}
				<button
					onClick={testar}
					disabled={conn === "checking"}
					className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
				>
					<RefreshCwIcon className={`h-4 w-4 ${conn === "checking" ? "animate-spin" : ""}`} />
					{conn === "checking" ? "Testando..." : "Testar conexão"}
				</button>
			</div>

			{/* 2. INFLUENCIADORES E METAS SEMANAIS */}
			<div>
				<div className="mt-6 flex items-center gap-2 px-1">
					<TargetIcon className="h-4 w-4 text-muted-foreground" />
					<h2 className="text-sm font-semibold text-foreground">Influenciadores e metas semanais</h2>
				</div>
				<p className="mt-1 px-1 text-xs text-muted-foreground">
					Cadastre os influenciadores e defina quantos stories e feeds/reels cada um deve entregar por semana. A
					automação na página inicial calcula sozinha quantas entregas ainda faltam.
				</p>
				<InfluenciadoresManager />
			</div>

			{/* 3. STATUS */}
			<div className="glass-card card-animate mt-6 rounded-2xl p-6">
				<div className="flex items-center gap-2">
					<TagIcon className="h-4 w-4 text-muted-foreground" />
					<h2 className="text-sm font-semibold text-foreground">Status de postagem</h2>
				</div>
				<p className="mt-2 text-xs text-muted-foreground">
					Edite os nomes, as cores e defina quais status contam como "postou" (afeta inadimplência e % de adesão).
				</p>
				<div className="mt-4 flex flex-col gap-3">
					{config.status.map((s) => (
						<div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/60 p-3">
							<input
								type="color"
								value={s.cor}
								onChange={(e) => atualizarStatus(s.id, "cor", e.target.value)}
								className="h-8 w-10 shrink-0 cursor-pointer rounded border border-border bg-transparent"
							/>
							<input
								value={s.label}
								onChange={(e) => atualizarStatus(s.id, "label", e.target.value)}
								className="min-w-0 flex-1 rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
							/>
							<label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
								<input
									type="checkbox"
									checked={s.contaComoPostou}
									onChange={(e) => atualizarStatus(s.id, "contaComoPostou", e.target.checked)}
									className="h-4 w-4 accent-[#0071E3]"
								/>
								Conta como postou
							</label>
						</div>
					))}
				</div>
			</div>

			{/* 4. REGRAS */}
			<div className="glass-card card-animate mt-6 rounded-2xl p-6">
				<div className="flex items-center gap-2">
					<ClockIcon className="h-4 w-4 text-muted-foreground" />
					<h2 className="text-sm font-semibold text-foreground">Regras de negócio</h2>
				</div>
				<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
					<div>
						<label className="text-xs font-medium text-muted-foreground">Horário limite para postar no dia</label>
						<input
							type="time"
							value={config.regras.horarioLimite}
							onChange={(e) => atualizarRegra("horarioLimite", e.target.value)}
							className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
						/>
					</div>
					<div>
						<label className="text-xs font-medium text-muted-foreground">Tolerância (min após o limite)</label>
						<input
							type="number"
							min={0}
							value={config.regras.toleranciaMin}
							onChange={(e) => atualizarRegra("toleranciaMin", parseInt(e.target.value, 10) || 0)}
							className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
						/>
					</div>
					<div>
						<label className="text-xs font-medium text-muted-foreground">Dia da cobrança semanal</label>
						<select
							value={config.regras.diaCobrancaSemanal}
							onChange={(e) => atualizarRegra("diaCobrancaSemanal", e.target.value)}
							className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
						>
							{DIAS_SEMANA.map((d) => (
								<option key={d} value={d}>
									{d}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="text-xs font-medium text-muted-foreground">Dia da cobrança mensal</label>
						<input
							type="number"
							min={1}
							max={31}
							value={config.regras.diaCobrancaMensal}
							onChange={(e) => atualizarRegra("diaCobrancaMensal", parseInt(e.target.value, 10) || 1)}
							className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
						/>
					</div>
				</div>
			</div>

			{/* 5. MENSAGENS */}
			<div className="glass-card card-animate mt-6 rounded-2xl p-6">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
						<h2 className="text-sm font-semibold text-foreground">Mensagens de cobrança</h2>
					</div>
					<button
						onClick={restaurarMensagens}
						className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
					>
						Restaurar padrão
					</button>
				</div>
				<p className="mt-2 text-xs text-muted-foreground">
					Variáveis disponíveis: <code className="rounded bg-muted px-1">{"{nome}"}</code>,{" "}
					<code className="rounded bg-muted px-1">{"{periodo}"}</code>, <code className="rounded bg-muted px-1">{"{dias}"}</code>
				</p>
				<div className="mt-4 flex flex-col gap-4">
					{(["diaria", "semanal", "mensal"] as const).map((tipo) => (
						<div key={tipo}>
							<label className="text-xs font-medium text-muted-foreground capitalize">{tipo}</label>
							<textarea
								value={config.mensagens[tipo]}
								onChange={(e) => atualizarMensagem(tipo, e.target.value)}
								rows={4}
								className="mt-1 w-full resize-y rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
							/>
							<div className="mt-1 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
								<span className="font-medium">Preview:</span> {previewMensagem(config.mensagens[tipo])}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* 6. PREFERÊNCIAS */}
			<div className="glass-card card-animate mt-6 rounded-2xl p-6">
				<div className="flex items-center gap-2">
					<PaletteIcon className="h-4 w-4 text-muted-foreground" />
					<h2 className="text-sm font-semibold text-foreground">Preferências</h2>
				</div>
				<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
					<div>
						<label className="text-xs font-medium text-muted-foreground">Tema</label>
						<select
							value={config.preferencias.tema}
							onChange={(e) =>
								setConfig((c) => ({ ...c, preferencias: { ...c.preferencias, tema: e.target.value as Tema } }))
							}
							className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
						>
							<option value="sistema">Sistema</option>
							<option value="claro">Claro</option>
							<option value="escuro">Escuro</option>
						</select>
					</div>
					<div>
						<label className="text-xs font-medium text-muted-foreground">Formato de data</label>
						<select
							value={config.preferencias.formatoData}
							onChange={(e) =>
								setConfig((c) => ({ ...c, preferencias: { ...c.preferencias, formatoData: e.target.value } }))
							}
							className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
						>
							<option value="dd/mm/aaaa">dd/mm/aaaa</option>
							<option value="aaaa-mm-dd">aaaa-mm-dd</option>
						</select>
					</div>
				</div>
			</div>
		</AppShell>
	);
}