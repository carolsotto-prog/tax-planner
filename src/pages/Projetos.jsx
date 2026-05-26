import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_OPTIONS = [
  'Propostas em elaboração',
  'Propostas pendentes',
  'A programar',
  'Projetos ativos',
]

const STATUS_BADGE = {
  'Projetos ativos': 'badge-ativo',
  'A programar': 'badge-prog',
  'Propostas em elaboração': 'badge-elab',
  'Propostas pendentes': 'badge-pend',
}

export default function Projetos() {
  const [projetos, setProjetos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ cliente_id: '', nome: '', tipo: 'FT', status: 'A programar' })
  const [prazos, setPrazos] = useState([{ label: 'Prazo final', data: '' }])
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    fetchProjetos()
    fetchClientes()
  }, [])

  async function fetchProjetos() {
    setLoading(true)
    const { data } = await supabase
      .from('projetos')
      .select('*, clientes(nome, nome_curto)')
      .order('created_at', { ascending: false })
    setProjetos(data || [])
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nome, nome_curto').order('nome')
    setClientes(data || [])
  }

  function addPrazo() {
    setPrazos([...prazos, { label: '', data: '' }])
  }

  function removePrazo(i) {
    setPrazos(prazos.filter((_, idx) => idx !== i))
  }

  function updatePrazo(i, field, value) {
    const novo = [...prazos]
    novo[i][field] = value
    setPrazos(novo)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    const prazosFiltrados = prazos.filter(p => p.label && p.data)
    const payload = { ...form, prazos: prazosFiltrados }

    if (editId) {
      await supabase.from('projetos').update(payload).eq('id', editId)
      await supabase.from('historico_projetos').insert({
        projeto_id: editId,
        tipo: 'edicao',
        descricao: `Status alterado para: ${form.status}`,
      })
      setMsg('Projeto atualizado!')
    } else {
      const { data } = await supabase.from('projetos').insert(payload).select().single()
      if (data) {
        await supabase.from('historico_projetos').insert({
          projeto_id: data.id,
          tipo: 'criacao',
          descricao: `Projeto criado com status: ${form.status}`,
        })
      }
      setMsg('Projeto cadastrado!')
    }

    setForm({ cliente_id: '', nome: '', tipo: 'FT', status: 'A programar' })
    setPrazos([{ label: 'Prazo final', data: '' }])
    setEditId(null)
    setSaving(false)
    fetchProjetos()
    setTimeout(() => setMsg(''), 3000)
  }

  function handleEdit(p) {
    setEditId(p.id)
    setForm({ cliente_id: p.cliente_id, nome: p.nome, tipo: p.tipo, status: p.status })
    setPrazos(p.prazos?.length ? p.prazos : [{ label: 'Prazo final', data: '' }])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setEditId(null)
    setForm({ cliente_id: '', nome: '', tipo: 'FT', status: 'A programar' })
    setPrazos([{ label: 'Prazo final', data: '' }])
  }

  function formatDate(d) {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  function prazoProximo(prazos) {
    if (!prazos?.length) return null
    const hoje = new Date()
    const amanha = new Date(hoje)
    amanha.setDate(hoje.getDate() + 1)
    return prazos.find(p => {
      const d = new Date(p.data)
      return d <= amanha
    })
  }

  const filtered = filtro ? projetos.filter(p => p.status === filtro) : projetos

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-title">{editId ? 'Editar projeto' : 'Novo projeto'}</div>
        {msg && <div className="alert alert-success">{msg}</div>}
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label>Cliente *</label>
              <select required value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">Selecione o cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_curto || c.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Nome do projeto *</label>
              <input required placeholder="Ex: IRPJ 2024 – Revisão" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <div className="radio-group">
                <label className="radio-opt"><input type="radio" checked={form.tipo === 'FT'} onChange={() => setForm({ ...form, tipo: 'FT' })} /> FT</label>
                <label className="radio-opt"><input type="radio" checked={form.tipo === 'Tarefa'} onChange={() => setForm({ ...form, tipo: 'Tarefa' })} /> Tarefa</label>
              </div>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 20, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Prazos</div>
            {prazos.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                <input
                  placeholder="Nome do prazo (ex: Prazo de revisão)"
                  value={p.label}
                  onChange={e => updatePrazo(i, 'label', e.target.value)}
                  style={{ flex: 2, padding: '8px 12px', border: '0.5px solid var(--border)', borderRadius: 7, fontSize: 13 }}
                />
                <input
                  type="date"
                  value={p.data}
                  onChange={e => updatePrazo(i, 'data', e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '0.5px solid var(--border)', borderRadius: 7, fontSize: 13 }}
                />
                {prazos.length > 1 && (
                  <button type="button" onClick={() => removePrazo(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={addPrazo} style={{ marginTop: 4 }}>
              + Adicionar prazo
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            {editId && <button type="button" className="btn" onClick={handleCancel}>Cancelar</button>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {editId ? 'Salvar alterações' : 'Cadastrar projeto'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">
          Projetos cadastrados
          <div className="filter-bar">
            <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="empty"><i className="ti ti-briefcase"></i><p>Nenhum projeto encontrado.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Projeto</th><th>Cliente</th><th>Tipo</th><th>Status</th><th>Prazos</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const alerta = prazoProximo(p.prazos)
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.nome}</strong>
                        {alerta && <span style={{ marginLeft: 6, fontSize: 10, background: '#fde8e8', color: '#a32d2d', padding: '2px 6px', borderRadius: 4 }}>⚠ {alerta.label} vence em breve</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.clientes?.nome_curto || p.clientes?.nome || '—'}</td>
                      <td><span className={`badge ${p.tipo === 'FT' ? 'badge-ft' : 'badge-tarefa'}`}>{p.tipo}</span></td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] || ''}`}>{p.status}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {p.prazos?.length ? p.prazos.map((pr, i) => (
                          <div key={i}>{pr.label}: <strong>{formatDate(pr.data)}</strong></div>
                        )) : '—'}
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={() => handleEdit(p)}>
                          <i className="ti ti-edit"></i> Editar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
