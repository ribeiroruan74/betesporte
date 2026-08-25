"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { UserRoundIcon, PlusIcon, PencilIcon, Trash2Icon, CheckIcon, XIcon, Loader2Icon, TargetIcon, Square, SquareCheckIcon } from "lucide-react";
import { useMetas } from "@/lib/use-metas";

interface Inf { linha: number; nome: string; username: string; link: string; }

export function InfluenciadoresManager() {
  const { mostrar } = useToast();
  const { obterMeta, definirMeta } = useMetas();
  const [lista, setLista] = useState<Inf[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [link, setLink] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [edNome, setEdNome] = useState("");
  const [edUser, setEdUser] = useState("");
  const [edLink, setEdLink] = useState("");
  const [metasAbertas, setMetasAbertas] = useState<number | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [metaLoteAberta, setMetaLoteAberta] = useState(false);
  const [metaLoteStories, setMetaLoteStories] = useState(0);
  const [metaLoteFeed, setMetaLoteFeed] = useState(0);
  const [aplicandoLote, setAplicandoLote] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/influenciadores");
      const data = await res.json();
      setLista(data.influenciadores || []);
    } catch {
      mostrar("Erro ao carregar influenciadores", "error");
    } finally {
      setCarregando(false);
    }
  }, [mostrar]);

  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar() {
    if (!nome.trim()) { mostrar("Informe o nome", "error"); return; }
    const res = await fetch("/api/influenciadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, username, link }),
    });
    if (res.ok) {
      mostrar(`${nome} adicionado`);
      setNome(""); setUsername(""); setLink("");
      carregar();
    } else {
      mostrar("Erro ao adicionar", "error");
    }
  }

  async function salvarEdicao(inf: Inf) {
    const res = await fetch("/api/influenciadores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: inf.nome, novoNome: edNome, username: edUser, link: edLink }),
    });
    if (res.ok) {
      mostrar("Influenciador atualizado");
      setEditando(null);
      carregar();
    } else {
      mostrar("Erro ao atualizar", "error");
    }
  }

  async function remover(inf: Inf) {
    if (!window.confirm(`Remover ${inf.nome}?`)) return;
    const res = await fetch("/api/influenciadores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: inf.nome }),
    });
    if (res.ok) {
      mostrar(`${inf.nome} removido`);
      carregar();
    } else {
      mostrar("Erro ao remover", "error");
    }
  }

  function alternarSelecao(linha: number) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(linha)) novo.delete(linha);
      else novo.add(linha);
      return novo;
    });
  }

  function limparSelecao() {
    setSelecionados(new Set());
    setMetaLoteAberta(false);
  }

  const influenciadoresSelecionados = lista.filter((inf) => selecionados.has(inf.linha));

  async function removerSelecionados() {
    if (influenciadoresSelecionados.length === 0) return;
    if (!window.confirm(`Remover ${influenciadoresSelecionados.length} influenciador(es) selecionado(s)?`)) return;
    setAplicandoLote(true);
    try {
      const resultados = await Promise.all(
        influenciadoresSelecionados.map((inf) =>
          fetch("/api/influenciadores", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: inf.nome }),
          })
        )
      );
      const falhas = resultados.filter((r) => !r.ok).length;
      mostrar(
        falhas === 0
          ? `${influenciadoresSelecionados.length} influenciador(es) removido(s)`
          : `${resultados.length - falhas} removido(s), ${falhas} falharam`,
        falhas === 0 ? "success" : "error"
      );
      limparSelecao();
      carregar();
    } finally {
      setAplicandoLote(false);
    }
  }

  function aplicarMetaLote() {
    influenciadoresSelecionados.forEach((inf) => {
      definirMeta(inf.nome, { storiesSemana: metaLoteStories, feedSemana: metaLoteFeed });
    });
    mostrar(`Meta aplicada a ${influenciadoresSelecionados.length} influenciador(es)`);
    limparSelecao();
  }

  return (
    <div className="glass-card card-animate mt-6 rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <UserRoundIcon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Influenciadores ({lista.length})</h2>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome"
          className="rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username"
          className="rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link (opcional)"
          className="rounded-lg border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={adicionar}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <PlusIcon className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {selecionados.size > 0 && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {selecionados.size} selecionado{selecionados.size !== 1 ? "s" : ""}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMetaLoteAberta((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <TargetIcon className="h-3.5 w-3.5" />
                Definir meta em lote
              </button>
              <button
                onClick={removerSelecionados}
                disabled={aplicandoLote}
                className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-card px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2Icon className="h-3.5 w-3.5" />
                Remover selecionados
              </button>
              <button
                onClick={limparSelecao}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Limpar seleção
              </button>
            </div>
          </div>

          {metaLoteAberta && (
            <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-3">
              <label className="text-xs text-muted-foreground">
                Stories / semana
                <input
                  type="number"
                  min={0}
                  value={metaLoteStories}
                  onChange={(e) => setMetaLoteStories(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Feed/Reels / semana
                <input
                  type="number"
                  min={0}
                  value={metaLoteFeed}
                  onChange={(e) => setMetaLoteFeed(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <button
                onClick={aplicarMetaLote}
                className="mt-1 self-end rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground sm:mt-0"
              >
                Aplicar a {selecionados.size}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {carregando ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="h-4 w-4 animate-spin" /> Carregando...
          </p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum influenciador cadastrado.</p>
        ) : (
          lista.map((inf) =>
            editando === inf.linha ? (
              <div key={inf.linha} className="grid grid-cols-1 gap-2 rounded-xl bg-white/60 p-3 md:grid-cols-4">
                <input value={edNome} onChange={(e) => setEdNome(e.target.value)} className="rounded-lg border border-border bg-white/70 px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <input value={edUser} onChange={(e) => setEdUser(e.target.value)} className="rounded-lg border border-border bg-white/70 px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <input value={edLink} onChange={(e) => setEdLink(e.target.value)} className="rounded-lg border border-border bg-white/70 px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <div className="flex gap-2">
                  <button onClick={() => salvarEdicao(inf)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
                    <CheckIcon className="h-3.5 w-3.5" /> Salvar
                  </button>
                  <button onClick={() => setEditando(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div key={inf.linha} className="rounded-xl bg-white/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <button
                      onClick={() => alternarSelecao(inf.linha)}
                      aria-label={selecionados.has(inf.linha) ? "Desmarcar" : "Selecionar"}
                      className="shrink-0 text-muted-foreground hover:text-primary"
                    >
                      {selecionados.has(inf.linha) ? (
                        <SquareCheckIcon className="h-4.5 w-4.5 text-primary" />
                      ) : (
                        <Square className="h-4.5 w-4.5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{inf.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{inf.username || "—"}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setMetasAbertas(metasAbertas === inf.linha ? null : inf.linha)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                      title="Metas semanais de entrega"
                    >
                      <TargetIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setEditando(inf.linha); setEdNome(inf.nome); setEdUser(inf.username); setEdLink(inf.link); }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remover(inf)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-red-500 hover:text-red-400">
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {metasAbertas === inf.linha && (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                    <label className="text-xs text-muted-foreground">
                      Stories / semana
                      <input
                        type="number"
                        min={0}
                        value={obterMeta(inf.nome).storiesSemana}
                        onChange={(e) =>
                          definirMeta(inf.nome, { ...obterMeta(inf.nome), storiesSemana: Math.max(0, parseInt(e.target.value, 10) || 0) })
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Feed/Reels / semana
                      <input
                        type="number"
                        min={0}
                        value={obterMeta(inf.nome).feedSemana}
                        onChange={(e) =>
                          definirMeta(inf.nome, { ...obterMeta(inf.nome), feedSemana: Math.max(0, parseInt(e.target.value, 10) || 0) })
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-white/70 px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </label>
                  </div>
                )}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}