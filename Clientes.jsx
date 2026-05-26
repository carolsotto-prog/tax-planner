import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nome: '', nome_curto: '', cnpj: '', contato: '' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*, projetos(id)').order('nome')
    setClientes(data || [])
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    if (editId) {
      await supabase.from('clientes').update(form).eq('id', editId)
      setMsg('Cliente atualizado!')
    } else {
      await supabase.from('clientes').insert(form)
      setMsg('Cliente cadastrado!')
    }
    setForm({ nome: '', nome_curto: '', cnpj: '', contato: '' })
    setEditId(null)
    setSaving(false)
    fetchClientes()
    setTimeout(() => setMsg(''), 3000)
  }

  function handleEdit(c) {
    setEditId(c.id)
    setForm({ nome: c.nome, nome_curto: c.nome_curto || '', cnpj: c.cnpj || '', contato: c.contato || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setEditId(null)
    setForm({ nome: '', nome_curto: '', cnpj: '', contato: '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-title">{editId ? 'Editar cliente' : 'Novo cliente'}</div>
        {msg && <div className="alert alert-success">{msg}</div>}
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label>Razão social *</label>
              <input required placeholder="Ex: Gerdau S.A." value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Nome curto</label>
              <input placeholder="Ex: Gerdau" value={form.nome_curto} onChange={e => setForm({ ...form, nome_curto: e.target.value })} />
            </div>
            <div className="form-group">
              <label>CNPJ</label>
              <input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Contato principal</label>
              <input placeholder="Nome do contato" value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            {editId && <button type="button" className="btn" onClick={handleCancel}>Cancelar</button>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className={`ti ${saving ? 'ti-loader' : editId ? 'ti-check' : 'ti-plus'}`}></i>
              {editId ? 'Salvar alterações' : 'Cadastrar cliente'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">
          Clientes cadastrados
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{clientes.length} clientes</span>
        </div>
        {loading ? (
          <div className="loading"><i className="ti ti-loader"></i> Carregando...</div>
        ) : clientes.length === 0 ? (
          <div className="empty"><i className="ti ti-building"></i><p>Nenhum cliente cadastrado ainda.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>CNPJ</th>
                  <th>Projetos</th>
                  <th>Contato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.nome}</strong>{c.nome_curto && c.nome_curto !== c.nome && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>({c.nome_curto})</span>}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.cnpj || '—'}</td>
                    <td>{c.projetos?.length || 0}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.contato || '—'}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => handleEdit(c)}>
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
