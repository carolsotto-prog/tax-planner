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

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    if (editId) {
      await supabase.from('projetos').update(form).eq('id', editId)
      await supabase.from('historico_projetos').insert({
        projeto_id: editId,
        tipo: 'edicao',
        descricao: `Status alterado para: ${form.status}`,
      })
      setMsg('Projeto atualizado!')
    } else {
      const { data } = await supabase.from('projetos').insert(form).select().single()
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
    setEditId(null)
    setSaving(false)
    fetchProjetos()
    setTimeout(() => setMsg(''), 3000)
  }

  function handleEdit(p) {
    setEditId(p.id)
    setForm({ cliente_id: p.cliente_id, nome: p.nome, tipo: p.tipo, status: p.status })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setEditId(null)
    setForm({ cliente_id: '', nome: '', tipo: 'FT', status: 'A programar' })
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
                <label className="radio-opt">
                  <input type="radio" checked={form.tipo === 'FT'} onChange={() => setForm({ ...form, tipo: 'FT' })} /> FT
                </label>
                <label className="radio-opt">
                  <input type="radio" checked={form.tipo === 'Tarefa'} onChange={() => setForm({ ...form, tipo: 'Tarefa' })} /> Tarefa
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            {editId && <button type="button" className="btn" onClick={handleCancel}>Cancelar</button>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className={`ti ${saving ? 'ti-loader' : editId ? 'ti-check' : 'ti-plus'}`}></i>
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
          <div className="loading"><i className="ti ti-loader"></i> Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="empty"><i className="ti ti-briefcase"></i><p>Nenhum projeto encontrado.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Projeto</th><th>Cliente</th><th>Tipo</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.nome}</strong></td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.clientes?.nome_curto || p.clientes?.nome || '—'}</td>
                    <td><span className={`badge ${p.tipo === 'FT' ? 'badge-ft' : 'badge-tarefa'}`}>{p.tipo}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[p.status] || ''}`}>{p.status}</span></td>
                    <td>
                      <button className="btn btn-sm" onClick={() => handleEdit(p)}>
                        <i className="ti ti-edit"></i> Editar
                      </button>
                    </td>
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
