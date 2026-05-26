import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

export default function Exportar() {
  const [de, setDe] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [ate, setAte] = useState(() => new Date().toISOString().split('T')[0])
  const [profissional, setProfissional] = useState('')
  const [cliente, setCliente] = useState('')
  const [profissionais, setProfissionais] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState('')

  useEffect(() => {
    supabase.from('profissionais').select('*').order('nome').then(({ data }) => setProfissionais(data || []))
    supabase.from('clientes').select('*').order('nome').then(({ data }) => setClientes(data || []))
  }, [])

  async function exportAlocacoes() {
    setLoading('alocacoes')
    let query = supabase
      .from('alocacoes')
      .select('data, profissionais(nome, email, cargo), projetos(nome, tipo, clientes(nome, nome_curto))')
      .gte('data', de)
      .lte('data', ate)
      .order('data')

    const { data } = await query
    if (!data || data.length === 0) { alert('Nenhum dado encontrado.'); setLoading(''); return }

    let rows = data
    if (profissional) rows = rows.filter(r => r.profissionais?.email && profissional && r.profissionais?.nome === profissionais.find(p => p.id === profissional)?.nome)
    if (cliente) rows = rows.filter(r => r.projetos?.clientes?.nome === clientes.find(c => c.id === cliente)?.nome)

    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
      'Data': r.data,
      'Profissional': r.profissionais?.nome || '',
      'Email': r.profissionais?.email || '',
      'Cargo': r.profissionais?.cargo || '',
      'Cliente': r.projetos?.clientes?.nome_curto || r.projetos?.clientes?.nome || '',
      'Projeto': r.projetos?.nome || '',
      'Tipo (FT/Tarefa)': r.projetos?.tipo || '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Alocações')
    XLSX.writeFile(wb, `tax-planner-alocacoes-${de}-${ate}.xlsx`)
    setLoading('')
  }

  async function exportHistorico() {
    setLoading('historico')
    const { data } = await supabase
      .from('historico_projetos')
      .select('created_at, tipo, descricao, usuario_email, projetos(nome, tipo, clientes(nome, nome_curto))')
      .gte('created_at', de)
      .lte('created_at', ate + 'T23:59:59')
      .order('created_at', { ascending: false })

    if (!data || data.length === 0) { alert('Nenhum dado encontrado.'); setLoading(''); return }

    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
      'Data/Hora': r.created_at,
      'Cliente': r.projetos?.clientes?.nome_curto || r.projetos?.clientes?.nome || '',
      'Projeto': r.projetos?.nome || '',
      'Tipo Projeto': r.projetos?.tipo || '',
      'Evento': r.tipo,
      'Descrição': r.descricao || '',
      'Usuário': r.usuario_email || '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico')
    XLSX.writeFile(wb, `tax-planner-historico-${de}-${ate}.xlsx`)
    setLoading('')
  }

  async function exportPorProfissional() {
    setLoading('profissional')
    const { data } = await supabase
      .from('alocacoes')
      .select('data, profissionais(nome, cargo), projetos(nome, tipo, clientes(nome_curto, nome))')
      .gte('data', de)
      .lte('data', ate)
      .order('profissionais(nome)')

    if (!data || data.length === 0) { alert('Nenhum dado encontrado.'); setLoading(''); return }

    const wb = XLSX.utils.book_new()
    const porProf = {}
    data.forEach(r => {
      const nome = r.profissionais?.nome || 'Sem nome'
      if (!porProf[nome]) porProf[nome] = []
      porProf[nome].push({
        'Data': r.data,
        'Cliente': r.projetos?.clientes?.nome_curto || r.projetos?.clientes?.nome || '',
        'Projeto': r.projetos?.nome || '',
        'Tipo (FT/Tarefa)': r.projetos?.tipo || '',
      })
    })
    Object.entries(porProf).forEach(([nome, rows]) => {
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31))
    })
    XLSX.writeFile(wb, `tax-planner-por-profissional-${de}-${ate}.xlsx`)
    setLoading('')
  }

  async function exportPorCliente() {
    setLoading('cliente')
    const { data } = await supabase
      .from('alocacoes')
      .select('data, profissionais(nome), projetos(nome, tipo, status, clientes(nome, nome_curto))')
      .gte('data', de)
      .lte('data', ate)
      .order('data')

    if (!data || data.length === 0) { alert('Nenhum dado encontrado.'); setLoading(''); return }

    const wb = XLSX.utils.book_new()
    const porCliente = {}
    data.forEach(r => {
      const nome = r.projetos?.clientes?.nome_curto || r.projetos?.clientes?.nome || 'Sem cliente'
      if (!porCliente[nome]) porCliente[nome] = []
      porCliente[nome].push({
        'Data': r.data,
        'Projeto': r.projetos?.nome || '',
        'Tipo': r.projetos?.tipo || '',
        'Status': r.projetos?.status || '',
        'Profissional': r.profissionais?.nome || '',
      })
    })
    Object.entries(porCliente).forEach(([nome, rows]) => {
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31))
    })
    XLSX.writeFile(wb, `tax-planner-por-cliente-${de}-${ate}.xlsx`)
    setLoading('')
  }

  const reports = [
    { id: 'alocacoes', icon: 'ti-table', title: 'Alocações por dia', desc: 'Cada linha = um dia trabalhado. Inclui data, profissional, cliente, projeto e FT/Tarefa.', fn: exportAlocacoes },
    { id: 'historico', icon: 'ti-timeline', title: 'Histórico de projetos', desc: 'Todos os eventos registrados: criações, alocações, mudanças de status.', fn: exportHistorico },
    { id: 'profissional', icon: 'ti-user-check', title: 'Por profissional (lançamento)', desc: 'Uma aba por profissional, otimizado para lançamento no sistema interno. Inclui FT/Tarefa.', fn: exportPorProfissional },
    { id: 'cliente', icon: 'ti-building', title: 'Resumo por cliente', desc: 'Uma aba por cliente com todos os projetos, profissionais e dias trabalhados.', fn: exportPorCliente },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-title">Filtros do relatório</div>
        <div className="form-grid">
          <div className="form-group">
            <label>Período — de</label>
            <input type="date" value={de} onChange={e => setDe(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Período — até</label>
            <input type="date" value={ate} onChange={e => setAte(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Profissional (opcional)</label>
            <select value={profissional} onChange={e => setProfissional(e.target.value)}>
              <option value="">Todos</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Cliente (opcional)</label>
            <select value={cliente} onChange={e => setCliente(e.target.value)}>
              <option value="">Todos</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_curto || c.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="export-grid">
        {reports.map(r => (
          <div key={r.id} className="export-card">
            <div className="export-icon"><i className={`ti ${r.icon}`} style={{ fontSize: 20 }}></i></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>{r.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>{r.desc}</div>
            <button className="btn btn-cyan btn-sm" onClick={r.fn} disabled={loading === r.id}>
              <i className={`ti ${loading === r.id ? 'ti-loader' : 'ti-download'}`}></i>
              {loading === r.id ? 'Gerando...' : 'Exportar Excel'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
