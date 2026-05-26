import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AVATAR_COLORS = ['#4a9fd4','#2e7d52','#6b2fa0','#b36b00','#a32d2d','#1a6b8a','#3d6b2f','#8a3d6b']
const CHIP_COLORS = [
  { bg: '#e8f4fb', border: '#4a9fd4', color: '#0c447c' },
  { bg: '#eaf6f0', border: '#2e7d52', color: '#1e6e3a' },
  { bg: '#f0ecfb', border: '#6b2fa0', color: '#5a2d9a' },
  { bg: '#fef5e6', border: '#d4890a', color: '#7a4808' },
  { bg: '#fde8e8', border: '#a32d2d', color: '#a32d2d' },
  { bg: '#e8fbf4', border: '#2e7d6b', color: '#1e5a50' },
]

function getColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function getChipColor(id) {
  if (!id) return CHIP_COLORS[0]
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return CHIP_COLORS[Math.abs(h) % CHIP_COLORS.length]
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
}

function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return date
  })
}

function formatDate(date) { return date.toISOString().split('T')[0] }

function formatWeekLabel(dates) {
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${dates[0].getDate()} ${months[dates[0].getMonth()]} – ${dates[4].getDate()} ${months[dates[4].getMonth()]} ${dates[4].getFullYear()}`
}

function getDayLabel(date) {
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  return `${days[date.getDay()]} ${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}`
}

function getDatesInRange(start, end) {
  const dates = []
  const cur = new Date(start)
  const endDate = new Date(end)
  while (cur <= endDate) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

const STATUS_BUCKET = {
  'Projetos ativos': 'b-ativo',
  'A programar': 'b-prog',
  'Propostas em elaboração': 'b-elab',
  'Propostas pendentes': 'b-pend',
}

export default function Programacao({ user }) {
  const [weekBase, setWeekBase] = useState(new Date())
  const [weekDates, setWeekDates] = useState(getWeekDates(new Date()))
  const [profissionais, setProfissionais] = useState([])
  const [projetos, setProjetos] = useState([])
  const [clientes, setClientes] = useState([])
  const [alocacoes, setAlocacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [filtroProf, setFiltroProf] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroProj, setFiltroProj] = useState('')

  // Modal state
  const [modalProfId, setModalProfId] = useState('')
  const [modalClienteId, setModalClienteId] = useState('')
  const [modalProjId, setModalProjId] = useState('')
  const [modalDataInicio, setModalDataInicio] = useState('')
  const [modalDataFim, setModalDataFim] = useState('')
  const [modalDiasSelecionados, setModalDiasSelecionados] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const dates = getWeekDates(weekBase)
    setWeekDates(dates)
    fetchAll(dates)
  }, [weekBase])

  async function fetchAll(dates) {
    setLoading(true)
    const [{ data: profs }, { data: projs }, { data: clis }, { data: alocs }] = await Promise.all([
      supabase.from('profissionais').select('*').order('nome'),
      supabase.from('projetos').select('*, clientes(id, nome, nome_curto)').order('nome'),
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('alocacoes')
        .select('*, profissionais(nome), projetos(nome, cliente_id, clientes(nome_curto, nome))')
        .gte('data', formatDate(dates[0]))
        .lte('data', formatDate(dates[4]))
    ])
    setProfissionais(profs || [])
    setProjetos(projs || [])
    setClientes(clis || [])
    setAlocacoes(alocs || [])
    setLoading(false)
  }

  function prevWeek() { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d) }
  function nextWeek() { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d) }

  function getAlocacoesCell(profId, date) {
    return alocacoes.filter(a => a.profissional_id === profId && a.data === formatDate(date))
  }

  // Quando muda datas, recalcula dias selecionados
  useEffect(() => {
    if (modalDataInicio && modalDataFim) {
      const dates = getDatesInRange(modalDataInicio, modalDataFim)
      setModalDiasSelecionados(dates.map(d => formatDate(d)))
    }
  }, [modalDataInicio, modalDataFim])

  function toggleDia(dateStr) {
    setModalDiasSelecionados(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    )
  }

  function openModal(profId) {
    setModalProfId(profId || '')
    setModalClienteId('')
    setModalProjId('')
    setModalDataInicio(formatDate(weekDates[0]))
    setModalDataFim(formatDate(weekDates[4]))
    setModalDiasSelecionados(weekDates.map(d => formatDate(d)))
    setModal(true)
  }

  async function handleAlocar() {
    if (!modalProfId || !modalProjId || modalDiasSelecionados.length === 0) return
    setSaving(true)

    const projeto = projetos.find(p => p.id === modalProjId)

    // Inserir alocações para cada dia selecionado
    const inserts = modalDiasSelecionados.map(data => ({
      profissional_id: modalProfId,
      projeto_id: modalProjId,
      data,
    }))

    await supabase.from('alocacoes').insert(inserts)

    // Adicionar profissional à equipe do projeto automaticamente
    if (projeto && !(projeto.equipe || []).includes(modalProfId)) {
      const novaEquipe = [...(projeto.equipe || []), modalProfId]
      await supabase.from('projetos').update({ equipe: novaEquipe }).eq('id', modalProjId)
    }

    // Registrar no histórico
    await supabase.from('historico_projetos').insert({
      projeto_id: modalProjId,
      tipo: 'alocacao',
      descricao: `Alocado em ${modalDiasSelecionados.length} dia(s) entre ${modalDataInicio} e ${modalDataFim}`,
      usuario_email: user?.email,
    })

    setSaving(false)
    setModal(false)
    fetchAll(weekDates)
  }

  async function handleRemover(alocId, projId) {
    await supabase.from('alocacoes').delete().eq('id', alocId)
    await supabase.from('historico_projetos').insert({
      projeto_id: projId, tipo: 'remocao',
      descricao: 'Alocação removida', usuario_email: user?.email,
    })
    fetchAll(weekDates)
  }

  const buckets = {
    'Projetos ativos': projetos.filter(p => p.status === 'Projetos ativos'),
    'A programar': projetos.filter(p => p.status === 'A programar'),
    'Propostas em elaboração': projetos.filter(p => p.status === 'Propostas em elaboração'),
    'Propostas pendentes': projetos.filter(p => p.status === 'Propostas pendentes'),
  }

  const projetosFiltradosModal = modalClienteId
    ? projetos.filter(p => p.cliente_id === modalClienteId && (p.status === 'Projetos ativos' || p.status === 'A programar'))
    : projetos.filter(p => p.status === 'Projetos ativos' || p.status === 'A programar')

  const profsFiltered = profissionais.filter(p => {
    if (filtroProf && p.id !== filtroProf) return false
    if (filtroProj) {
      const tem = alocacoes.some(a => a.profissional_id === p.id && a.projeto_id === filtroProj)
      if (!tem) return false
    }
    if (filtroCliente) {
      const tem = alocacoes.some(a => a.profissional_id === p.id && a.projetos?.cliente_id === filtroCliente)
      if (!tem) return false
    }
    return true
  })

  const stats = {
    ativos: buckets['Projetos ativos'].length,
    programar: buckets['A programar'].length,
    profs: new Set(alocacoes.map(a => a.profissional_id)).size,
    total: alocacoes.length,
  }

  const diasModal = modalDataInicio && modalDataFim
    ? getDatesInRange(modalDataInicio, modalDataFim)
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* STATS */}
      <div className="stats-row">
        <div className="stat-card"><div className="stat-label">Projetos ativos</div><div className="stat-value">{stats.ativos}</div><div className="stat-sub">em andamento</div></div>
        <div className="stat-card"><div className="stat-label">A programar</div><div className="stat-value">{stats.programar}</div><div className="stat-sub">aguardando alocação</div></div>
        <div className="stat-card"><div className="stat-label">Profissionais</div><div className="stat-value">{stats.profs}</div><div className="stat-sub">alocados esta semana</div></div>
        <div className="stat-card"><div className="stat-label">Alocações</div><div className="stat-value">{stats.total}</div><div className="stat-sub">na semana atual</div></div>
      </div>

      {/* BUCKETS */}
      <div className="buckets-row">
        {Object.entries(buckets).map(([label, items]) => (
          <div key={label} className={`bucket ${STATUS_BUCKET[label]}`}>
            <div className="bucket-header">
              <span className="bucket-title">{label === 'Projetos ativos' ? 'Ativos' : label === 'A programar' ? 'A programar' : label === 'Propostas em elaboração' ? 'Prop. elaboração' : 'Prop. pendentes'}</span>
              <span className="bucket-count">{items.length}</span>
            </div>
            <div className="bucket-body">
              {items.length === 0
                ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Nenhum projeto</span>
                : items.map(p => (
                  <div key={p.id} className="bucket-item">
                    {p.nome}<span className="cli">{p.clientes?.nome_curto || p.clientes?.nome}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* GRADE */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Grade de alocação</span>
            <div className="week-nav">
              <button onClick={prevWeek}>‹</button>
              <span className="week-label">{formatWeekLabel(weekDates)}</span>
              <button onClick={nextWeek}>›</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="filter-bar">
              <select value={filtroProf} onChange={e => setFiltroProf(e.target.value)}>
                <option value="">Todos os profissionais</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <select value={filtroCliente} onChange={e => { setFiltroCliente(e.target.value); setFiltroProj('') }}>
                <option value="">Todos os clientes</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_curto || c.nome}</option>)}
              </select>
              <select value={filtroProj} onChange={e => setFiltroProj(e.target.value)}>
                <option value="">Todos os projetos</option>
                {(filtroCliente ? projetos.filter(p => p.cliente_id === filtroCliente) : projetos).map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
              {(filtroProf || filtroCliente || filtroProj) && (
                <button className="btn btn-sm" onClick={() => { setFiltroProf(''); setFiltroCliente(''); setFiltroProj('') }}>✕ Limpar</button>
              )}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => openModal('')}>
              <i className="ti ti-plus"></i> Nova alocação
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <div className="grade-wrap">
            <table className="grade-table">
              <thead>
                <tr>
                  <th className="col-prof">Profissional</th>
                  {weekDates.map(d => <th key={d}>{getDayLabel(d)}</th>)}
                </tr>
              </thead>
              <tbody>
                {profsFiltered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Nenhum resultado para os filtros selecionados.</td></tr>
                ) : profsFiltered.map(prof => (
                  <tr key={prof.id}>
                    <td className="col-prof">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="mini-av" style={{ background: getColor(prof.nome) }}>{getInitials(prof.nome)}</div>
                        {prof.nome}
                      </div>
                    </td>
                    {weekDates.map(date => {
                      const alocs = getAlocacoesCell(prof.id, date)
                      return (
                        <td key={date}>
                          {alocs.map(a => {
                            const c = getChipColor(a.projeto_id)
                            return (
                              <span key={a.id} className="proj-chip" style={{ background: c.bg, borderColor: c.border, color: c.color }} title="Clique para remover" onClick={() => handleRemover(a.id, a.projeto_id)}>
                                {a.projetos?.nome?.split('–')[0]?.trim() || 'Projeto'}
                              </span>
                            )
                          })}
                          <button className="add-btn" onClick={() => openModal(prof.id)} title="Alocar projeto">+</button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL ALOCAÇÃO */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ width: 520 }}>
            <div className="modal-title">
              Nova alocação
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>Profissional *</label>
                <select value={modalProfId} onChange={e => setModalProfId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Cliente</label>
                <select value={modalClienteId} onChange={e => { setModalClienteId(e.target.value); setModalProjId('') }}>
                  <option value="">Todos os clientes</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_curto || c.nome}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Projeto *</label>
                <select value={modalProjId} onChange={e => setModalProjId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {projetosFiltradosModal.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} — {p.clientes?.nome_curto || p.clientes?.nome}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Data início *</label>
                  <input type="date" value={modalDataInicio} onChange={e => setModalDataInicio(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Data fim *</label>
                  <input type="date" value={modalDataFim} onChange={e => setModalDataFim(e.target.value)} />
                </div>
              </div>

              {diasModal.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    Dias úteis — desmarque para excluir
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {diasModal.map(d => {
                      const dateStr = formatDate(d)
                      const selecionado = modalDiasSelecionados.includes(dateStr)
                      return (
                        <label key={dateStr} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', padding: '4px 10px', border: `0.5px solid ${selecionado ? 'var(--cyan)' : 'var(--border)'}`, borderRadius: 5, background: selecionado ? 'var(--cyan-light)' : 'var(--gray-bg)', color: selecionado ? 'var(--navy)' : 'var(--text-muted)' }}>
                          <input type="checkbox" checked={selecionado} onChange={() => toggleDia(dateStr)} style={{ display: 'none' }} />
                          {getDayLabel(d)}
                        </label>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    {modalDiasSelecionados.length} dia(s) selecionado(s)
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAlocar} disabled={!modalProfId || !modalProjId || modalDiasSelecionados.length === 0 || saving}>
                {saving ? 'Salvando...' : `Alocar ${modalDiasSelecionados.length} dia(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
