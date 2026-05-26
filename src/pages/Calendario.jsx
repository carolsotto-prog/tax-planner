import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CHIP_COLORS = [
  { bg: '#e8f4fb', border: '#4a9fd4', color: '#0c447c' },
  { bg: '#eaf6f0', border: '#2e7d52', color: '#1e6e3a' },
  { bg: '#f0ecfb', border: '#6b2fa0', color: '#5a2d9a' },
  { bg: '#fef5e6', border: '#d4890a', color: '#7a4808' },
  { bg: '#fde8e8', border: '#a32d2d', color: '#a32d2d' },
]

function getChipColor(id) {
  if (!id) return CHIP_COLORS[0]
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return CHIP_COLORS[Math.abs(h) % CHIP_COLORS.length]
}

const AVATAR_COLORS = ['#4a9fd4','#2e7d52','#6b2fa0','#b36b00','#a32d2d','#1a6b8a']
function getColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function getWeekDates(base) {
  const d = new Date(base)
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

export default function Calendario() {
  const [weekBase, setWeekBase] = useState(new Date())
  const [weekDates, setWeekDates] = useState(getWeekDates(new Date()))
  const [profissionais, setProfissionais] = useState([])
  const [projetos, setProjetos] = useState([])
  const [clientes, setClientes] = useState([])
  const [alocacoes, setAlocacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroProf, setFiltroProf] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroProj, setFiltroProj] = useState('')

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
        .select('*, profissionais(id, nome), projetos(id, nome, cliente_id, clientes(nome_curto, nome))')
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

  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

  const profsFiltered = profissionais.filter(p => {
    if (filtroProf && p.id !== filtroProf) return false
    if (filtroProj || filtroCliente) {
      const temAloc = alocacoes.some(a => {
        if (a.profissional_id !== p.id) return false
        if (filtroProj && a.projeto_id !== filtroProj) return false
        if (filtroCliente && a.projetos?.cliente_id !== filtroCliente) return false
        return true
      })
      if (!temAloc) return false
    }
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="week-nav">
            <button onClick={prevWeek}>‹</button>
            <span className="week-label">{formatWeekLabel(weekDates)}</span>
            <button onClick={nextWeek}>›</button>
          </div>
          <div className="filter-bar">
            <select value={filtroProf} onChange={e => setFiltroProf(e.target.value)}>
              <option value="">Todos os profissionais</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
              <option value="">Todos os clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_curto || c.nome}</option>)}
            </select>
            <select value={filtroProj} onChange={e => setFiltroProj(e.target.value)}>
              <option value="">Todos os projetos</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {(filtroProf || filtroCliente || filtroProj) && (
              <button className="btn btn-sm" onClick={() => { setFiltroProf(''); setFiltroCliente(''); setFiltroProj('') }}>✕ Limpar</button>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading"><i className="ti ti-loader"></i> Carregando...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="grade-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th className="col-prof">Profissional</th>
                  {weekDates.map(d => (
                    <th key={d}>
                      {days[d.getDay()]} {d.getDate().toString().padStart(2,'0')}/{(d.getMonth()+1).toString().padStart(2,'0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profsFiltered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Nenhum resultado encontrado.</td></tr>
                ) : profsFiltered.map(prof => (
                  <tr key={prof.id}>
                    <td className="col-prof">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="mini-av" style={{ background: getColor(prof.nome) }}>
                          {prof.nome.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
                        </div>
                        {prof.nome}
                      </div>
                    </td>
                    {weekDates.map(date => {
                      const dateStr = formatDate(date)
                      const alocs = alocacoes.filter(a => {
                        if (a.profissional_id !== prof.id || a.data !== dateStr) return false
                        if (filtroProj && a.projeto_id !== filtroProj) return false
                        if (filtroCliente && a.projetos?.cliente_id !== filtroCliente) return false
                        return true
                      })
                      return (
                        <td key={date}>
                          {alocs.map(a => {
                            const c = getChipColor(a.projeto_id)
                            return (
                              <span key={a.id} className="proj-chip" style={{ background: c.bg, borderColor: c.border, color: c.color }}>
                                {a.projetos?.nome?.split('–')[0]?.trim() || 'Projeto'}
                              </span>
                            )
                          })}
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
    </div>
  )
}
