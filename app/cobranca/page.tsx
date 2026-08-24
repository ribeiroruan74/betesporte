"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useBancoDados } from "@/lib/use-banco-dados";
import { useInfluencers } from "@/lib/use-influencers";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  MessageSquareIcon,
  UserRoundIcon,
} from "lucide-react";

type Modo = "hoje" | "semana" | "mes" | "periodo";

const MODOS: { id: Modo; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "periodo", label: "Período" },
];

function normaliza(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasAtras(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function primeiroDoMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function paraISO(data: string) {
  const p = (data || "").split("/");
  if (p.length !== 3) return "";
  const ano = (p[2].length === 2 ? "20" + p[2] : p[2]).padStart(4, "0");
  return `${ano}-${String(parseInt(p[1]) || 0).padStart(2, "0")}-${String(parseInt(p[0]) || 0).padStart(2, "0")}`;
}

function formatarBR(iso: string) {
  if (!iso) return "";
  const p = iso.split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function ehNaoPostou(status: string) {
  const n = normaliza(status);
  return n === "" || n === "nao postou" || n === "pendente" || n === "aguardando";
}

export default function CobrancaPage() {
  const { influencers } = useInfluencers();
  const { registros, loading } = useBancoDados();
  const [modo, setModo] = useState<Modo>("semana");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [idx, setIdx] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [phone, setPhone] = useState("");

  // Lista de influenciadores (do ACOMPANHAMENTO; fallback para nomes do banco)
  const lista = useMemo(() => {
    if (influencers.length > 0) {
      return influencers.map((i) => ({ name: i.name, username: i.username || "" }));
    }
    return Array.from(new Set(registros.map((r) => r.nome))).map((n) => ({ name: n, username: "" }));
  }, [influencers, registros]);

  // Período ativo
  const periodo = useMemo(() => {
    const hoje = hojeISO();
    if (modo === "hoje") return { inicio: hoje, fim: hoje, rotulo: "hoje" };
    if (modo === "semana") return { inicio: diasAtras(6), fim: hoje, rotulo: "últimos 7 dias" };
    if (modo === "mes") return { inicio: primeiroDoMes(), fim: hoje, rotulo: "mês atual" };
    return { inicio: de || hoje, fim: ate || hoje, rotulo: "período selecionado" };
  }, [modo, de, ate]);

  const influenciador = lista[idx];

  // Registros do influenciador no período
  const registrosDoInfluenciador = useMemo(() => {
    if (!influenciador) return [];
    const alvo = normaliza(influenciador.name);
    return registros
      .filter((r) => {
        const iso = paraISO(r.data);
        if (!iso) return false;
        if (iso < periodo.inicio || iso > periodo.fim) return false;
        return normaliza(r.nome) === alvo;
      })
      .sort((a, b) => (paraISO(a.data) < paraISO(b.data) ? -1 : 1));
  }, [registros, influenciador, periodo]);

  // Contabilização igual à planilha
  const resumo = useMemo(() => {
    let entregas = 0;
    let branding = 0;
    let naoPostou = 0;
    let pendentes = 0;
    const dias: { data: string; emoji: string; rotulo: string }[] = [];

    registrosDoInfluenciador.forEach((r) => {
      const dataBR = r.data;
      const st = normaliza(r.status);
      let emoji = "✅";
      let rotulo = r.status || "Sem registro";

      if (st === "" || st === "pendente" || st === "aguardando") {
        emoji = "⚪";
        pendentes++;
      } else if (st.includes("nao postou")) {
        emoji = "❌";
        rotulo = r.status;
        naoPostou++;
      } else {
        const temStory = st.includes("story + link");
        const temBrand = st.includes("branding");
        if (temStory) entregas++;
        else if (!temBrand) entregas++;
        if (temBrand) branding++;
        emoji = temStory ? "✅" : temBrand ? "⚠️" : "✅";
        rotulo = r.status;
      }
      dias.push({ data: dataBR, emoji, rotulo });
    });

    return { entregas, branding, naoPostou, pendentes, dias };
  }, [registrosDoInfluenciador]);

  // Mensagem de cobrança (formato da planilha)
  const mensagem = useMemo(() => {
    if (!influenciador) return "";
    let m = "";
    m += "📲 *COBRANÇA DE POSTAGENS*\n";
    m += "━━━━━━━━━━━━━━━━━━━━\n";
    m += "👤 *Influenciador:* " + influenciador.name + "\n";
    m += "📅 *Período:* " + formatarBR(periodo.inicio) + " a " + formatarBR(periodo.fim) + "\n";
    m += "━━━━━━━━━━━━━━━━━━━━\n";
    m += "✅ *Entregas confirmadas:* " + resumo.entregas + "\n";
    if (resumo.branding > 0) m += "⚠️ *Branding:* " + resumo.branding + "\n";
    if (resumo.naoPostou > 0) m += "❌ *Dias sem postar:* " + resumo.naoPostou + "\n";
    if (resumo.pendentes > 0) m += "⚪ *Dias sem registro:* " + resumo.pendentes + "\n";
    m += "━━━━━━━━━━━━━━━━━━━━\n\n";
    if (resumo.dias.length > 0) {
      m += "*Status por dia:*\n";
      resumo.dias.forEach((d, i) => {
        m += (i + 1) + ". " + d.emoji + " " + d.data + " — " + d.rotulo + "\n";
      });
    } else {
      m += "Nenhum registro encontrado para este influenciador no período.\n";
    }
    m += "\nQualquer dúvida, me avise. Obrigado! 🙏";
    return m;
  }, [influenciador, periodo, resumo]);

  function copiar() {
    navigator.clipboard.writeText(mensagem).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const waLink = phone
    ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`
    : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando dados...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cobrança</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o influenciador e o período para gerar a cobrança — igual à planilha
        </p>
      </div>

      {/* Pré-modelos de período */}
      <div className="mt-6 flex flex-wrap gap-2">
        {MODOS.map((t) => (
          <button
            key={t.id}
            onClick={() => setModo(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              modo === t.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Período personalizado */}
      {modo === "periodo" && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Data inicial</label>
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Data final</label>
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Seleção do influenciador: dropdown + navegação em ordem */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={!influenciador || idx === 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            aria-label="Anterior"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-center gap-2">
              <UserRoundIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <select
                value={idx}
                onChange={(e) => setIdx(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {lista.map((inf, i) => (
                  <option key={inf.name} value={i}>
                    {i + 1}. {inf.name} {inf.username ? `(${inf.username})` : ""}
                  </option>
                ))}
              </select>
            </div>
            {influenciador && (
              <p className="mt-1 text-center text-xs text-muted-foreground">
                {idx + 1} de {lista.length} · {periodo.rotulo}
              </p>
            )}
          </div>

          <button
            onClick={() => setIdx((i) => Math.min(lista.length - 1, i + 1))}
            disabled={!influenciador || idx >= lista.length - 1}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            aria-label="Próximo"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Resultado da cobrança */}
      {influenciador && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
              ✅ {resumo.entregas} entregas
            </span>
            {resumo.branding > 0 && (
              <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-600">
                ⚠️ {resumo.branding} branding
              </span>
            )}
            {resumo.naoPostou > 0 && (
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600">
                ❌ {resumo.naoPostou} sem postar
              </span>
            )}
            {resumo.pendentes > 0 && (
              <span className="rounded-full bg-gray-500/10 px-3 py-1 text-xs font-medium text-gray-600">
                ⚪ {resumo.pendentes} sem registro
              </span>
            )}
          </div>

          <pre className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
            {mensagem}
          </pre>

          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefone opcional (ex: 5511999999999) para wa.me direto"
              className="flex-1 rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={copiar}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground md:flex-none"
              >
                {copiado ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                {copiado ? "Copiado ✓" : "Copiar"}
              </button>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white md:flex-none"
              >
                <MessageSquareIcon className="h-4 w-4" />
                wa.me
              </a>
            </div>
          </div>

          <button
            onClick={() => setIdx((i) => Math.min(lista.length - 1, i + 1))}
            disabled={idx >= lista.length - 1}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-40"
          >
            Próximo influenciador
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </AppShell>
  );
}