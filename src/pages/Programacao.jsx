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

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function formatDisplay(date) {
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  return `${days[date.getDay()]} ${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}`
}

function formatWeekLabel(dates) {
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  const start = dates[0]
  const end = dates[4]
  return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`
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
  const [alocacoes, setAlocacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filtroProf, setFiltroProf] = useState('')
  const [filtroProj, setFiltroProj] = useState('')
  const [modalProj, setModalProj] = useState('')

  useEffect(() => {
    const dates = getWeekDates(weekBase)
    setWeekDates(dates)
    fetchAll(dates)
  }, [weekBase])

  async function fetchAll(dates) {
    setLoading(true)
    const [{ data: profs }, { data: projs }, { data: alocs }] = await Promise.all([
      supabase.from('profissionais').select('*').order('nome'),
      supabase.from('projetos').select('*, clientes(nome, nome_curto)').order('nome'),
      supabase.from('alocacoes').select('*, profissionais(nome), projetos(nome, cliente_id, clientes(nome_curto, nome))')
        .gte('data', formatDate(dates[0]))
        .lte('data', formatDate(dates[4]))
    ])
    setProfissionais(profs || [])
    setProjetos(projs || [])
    setAlocacoes(alocs || [])
    setLoading(false)
  }

  function prevWeek() { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d) }
  function nextWeek() { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d) }

  function getAlocacoesCell(profId, date) {
    const dateStr = formatDate(date)
    return alocacoes.filter(a => a.profissional_id === profId && a.data === dateStr)
  }

  async function handleAlocar() {
    if (!modal || !modalProj) return
    const { error } = await supabase.from('alocacoes').insert({
      profissional_id: modal.profId,
      projeto_id: modalProj,
      data: formatDate(modal.date),
    })
    if (!error) {
      await supabase.from('historico_projetos').insert({
        projeto_id: modalProj,
        tipo: 'alocacao',
        descricao: `Alocado em ${formatDate(modal.date)}`,
        usuario_email: user?.email,
      })
      setModal(null)
      setModalProj('')
      fetchAll(weekDates)
    }
  }

  async function handleRemover(alocId, projId) {
    await supabase.from('alocacoes').delete().eq('id', alocId)
    await supabase.from('historico_projetos').insert({
      projeto_id: projId,
      tipo: 'remocao',
      descricao: `Alocação removida`,
      usuario_email: user?.email,
    })
    fetchAll(weekDates)
  }

  const buckets = {
    'Projetos ativos': projetos.filter(p => p.status === 'Projetos ativos'),
    'A programar': projetos.filter(p => p.status === 'A programar'),
    'Propostas em elaboração': projetos.filter(p => p.status === 'Propostas em elaboração'),
    'Propostas pendentes': projetos.filter(p => p.status === 'Propostas pendentes'),
  }

  const profsFiltered = profissionais.filter(p => {
    if (filtroProf && p.id !== filtroProf) return false
    if (filtroProj) {
      const temProj = alocacoes.some(a => a.profissional_id === p.id && a.projeto_id === filtroProj)
      if (!temProj) return false
    }
    return true
  })

  const stats = {
    ativos: buckets['Projetos ativos'].length,
    programar: buckets['A programar'].length,
    profs: new Set(alocacoes.map(a => a.profissional_id)).size,
    total: alocacoes.length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* STATS */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Projetos ativos</div>
          <div className="stat-value">{stats.ativos}</div>
          <div className="stat-sub">em andamento</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">A programar</div>
          <div className="stat-value">{stats.programar}</div>
          <div className="stat-sub">aguardando alocação</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Profissionais</div>
          <div className="stat-value">{stats.profs}</div>
          <div className="stat-sub">alocados esta semana</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Alocações</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">na semana atual</div>
        </div>
      </div>

      {/* BUCKETS */}
      <div className="buckets-row">
        {Object.entries(buckets).map(([label, items]) => (
          <div key={label} className={`bucket ${STATUS_BUCKET[label]}`}>
            <div className="bucket-header">
              <span className="bucket-title">{label === 'Projetos ativos' ? 'Projetos ativos' : label === 'A programar' ? 'A programar' : label === 'Propostas em elaboração' ? 'Prop. em elaboração' : 'Propostas pendentes'}</span>
              <span className="bucket-count">{items.length}</span>
            </div>
            <div className="bucket-body">
              {items.length === 0 ? <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 0' }}>Nenhum projeto</span> : items.map(p => (
                <div key={p.id} className="bucket-item">
                  {p.nome}
                  <span className="cli">{p.clientes?.nome_curto || p.clientes?.nome}</span>
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
          <div className="filter-bar">
            <label>Filtrar:</label>
            <select value={filtroProf} onChange={e => setFiltroProf(e.target.value)}>
              <option value="">Todos os profissionais</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select value={filtroProj} onChange={e => setFiltroProj(e.target.value)}>
              <option value="">Todos os projetos</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {(filtroProf || filtroProj) && (
              <button className="btn btn-sm" onClick={() => { setFiltroProf(''); setFiltroProj('') }}>✕ Limpar</button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading"><i className="ti ti-loader"></i> Carregando...</div>
        ) : (
          <div className="grade-wrap">
            <table className="grade-table">
              <thead>
                <tr>
                  <th className="col-prof">Profissional</th>
                  {weekDates.map(d => <th key={d}>{formatDisplay(d)}</th>)}
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
                              <span
                                key={a.id}
                                className="proj-chip"
                                style={{ background: c.bg, borderColor: c.border, color: c.color }}
                                title="Clique para remover"
                                onClick={() => handleRemover(a.id, a.projeto_id)}
                              >
                                {a.projetos?.nome?.split('–')[0]?.trim() || 'Projeto'}
                              </span>
                            )
                          })}
                          <button
                            className="add-btn"
                            onClick={() => setModal({ profId: prof.id, date })}
                            title="Adicionar projeto"
                          >+</button>
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

      {/* MODAL ALOCAR */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-title">
              Alocar projeto
              <button className="btn btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
              {profissionais.find(p => p.id === modal.profId)?.nome} · {formatDisplay(modal.date)}
            </div>
            <div className="form-group">
              <label>Selecione o projeto</label>
              <select value={modalProj} onChange={e => setModalProj(e.target.value)}>
                <option value="">Selecione...</option>
                {projetos.filter(p => p.status === 'Projetos ativos' || p.status === 'A programar').map(p => (
                  <option key={p.id} value={p.id}>{p.nome} — {p.clientes?.nome_curto || p.clientes?.nome}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAlocar} disabled={!modalProj}>
                <i className="ti ti-check"></i> Confirmar alocação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
