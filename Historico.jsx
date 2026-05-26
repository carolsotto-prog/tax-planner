import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIPO_CONFIG = {
  criacao: { label: 'Projeto criado', cls: '', icon: 'ti-circle-plus' },
  edicao: { label: 'Status alterado', cls: 'status', icon: 'ti-refresh' },
  alocacao: { label: 'Alocação registrada', cls: '', icon: 'ti-user-check' },
  remocao: { label: 'Alocação removida', cls: 'pause', icon: 'ti-user-minus' },
  pausa: { label: 'Projeto pausado', cls: 'pause', icon: 'ti-player-pause' },
}

function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

export default function Historico() {
  const [projetos, setProjetos] = useState([])
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(false)
  const [projetoId, setProjetoId] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [clientes, setClientes] = useState([])

  useEffect(() => {
    fetchProjetos()
    fetchClientes()
  }, [])

  useEffect(() => {
    if (projetoId) fetchHistorico(projetoId)
    else setHistorico([])
  }, [projetoId])

  async function fetchProjetos() {
    const { data } = await supabase.from('projetos').select('*, clientes(id, nome, nome_curto)').order('nome')
    setProjetos(data || [])
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
  }

  async function fetchHistorico(id) {
    setLoading(true)
    const { data } = await supabase
      .from('historico_projetos')
      .select('*')
      .eq('projeto_id', id)
      .order('created_at', { ascending: false })
    setHistorico(data || [])
    setLoading(false)
  }

  const projetosFiltrados = filtroCliente
    ? projetos.filter(p => p.clientes?.id === filtroCliente)
    : projetos

  const projetoSelecionado = projetos.find(p => p.id === projetoId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-title">Selecionar projeto</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
            <label>Filtrar por cliente</label>
            <select value={filtroCliente} onChange={e => { setFiltroCliente(e.target.value); setProjetoId('') }}>
              <option value="">Todos os clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_curto || c.nome}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: 240 }}>
            <label>Projeto</label>
            <select value={projetoId} onChange={e => setProjetoId(e.target.value)}>
              <option value="">Selecione um projeto...</option>
              {projetosFiltrados.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} — {p.clientes?.nome_curto || p.clientes?.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {projetoSelecionado && (
        <div className="card">
          <div className="card-title">
            <div>
              {projetoSelecionado.nome}
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
                {projetoSelecionado.clientes?.nome_curto || projetoSelecionado.clientes?.nome}
              </span>
            </div>
            <span className={`badge ${projetoSelecionado.tipo === 'FT' ? 'badge-ft' : 'badge-tarefa'}`}>{projetoSelecionado.tipo}</span>
          </div>

          {loading ? (
            <div className="loading"><i className="ti ti-loader"></i> Carregando histórico...</div>
          ) : historico.length === 0 ? (
            <div className="empty"><i className="ti ti-history"></i><p>Nenhum registro encontrado para este projeto.</p></div>
          ) : (
            <div className="timeline">
              {historico.map(h => {
                const cfg = TIPO_CONFIG[h.tipo] || { label: h.tipo, cls: '', icon: 'ti-point' }
                return (
                  <div key={h.id} className="tl-item">
                    <div className={`tl-dot ${cfg.cls}`}></div>
                    <div className="tl-date">{formatDateTime(h.created_at)}</div>
                    <div className="tl-desc">
                      <strong>{cfg.label}</strong>
                      {h.descricao && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>— {h.descricao}</span>}
                    </div>
                    {h.usuario_email && (
                      <div className="tl-who">
                        <i className="ti ti-user" style={{ fontSize: 11 }}></i>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.usuario_email}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!projetoId && (
        <div className="empty" style={{ background: 'white', borderRadius: 10, border: '0.5px solid var(--border)' }}>
          <i className="ti ti-history"></i>
          <p>Selecione um projeto acima para ver seu histórico.</p>
        </div>
      )}
    </div>
  )
}
