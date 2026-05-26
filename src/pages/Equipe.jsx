import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AVATAR_COLORS = ['#4a9fd4','#2e7d52','#6b2fa0','#b36b00','#a32d2d','#1a6b8a','#3d6b2f','#8a3d6b']

function getColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
}

export default function Equipe() {
  const [profissionais, setProfissionais] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nome: '', email: '', cargo: 'Advogado(a) Pleno', area: 'Tributário' })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchProfissionais() }, [])

  async function fetchProfissionais() {
    setLoading(true)
    const { data } = await supabase.from('profissionais').select('*').order('nome')
    setProfissionais(data || [])
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    if (editId) {
      await supabase.from('profissionais').update(form).eq('id', editId)
      setMsg('Profissional atualizado!')
    } else {
      await supabase.from('profissionais').insert(form)
      setMsg('Profissional cadastrado!')
    }
    setForm({ nome: '', email: '', cargo: 'Advogado(a) Pleno', area: 'Tributário' })
    setEditId(null)
    setSaving(false)
    fetchProfissionais()
    setTimeout(() => setMsg(''), 3000)
  }

  function handleEdit(p) {
    setEditId(p.id)
    setForm({ nome: p.nome, email: p.email, cargo: p.cargo || '', area: p.area || 'Tributário' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-title">{editId ? 'Editar profissional' : 'Cadastrar profissional'}</div>
        {msg && <div className="alert alert-success">{msg}</div>}
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome completo *</label>
              <input required placeholder="Ex: Ana Paula Sette" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input required type="email" placeholder="ana@azevedosette.com.br" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Cargo</label>
              <select value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}>
                <option>Sócio(a)</option>
                <option>Advogado(a) Sênior</option>
                <option>Advogado(a) Pleno</option>
                <option>Advogado(a) Júnior</option>
                <option>Estagiário(a)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Área</label>
              <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}>
                <option>Tributário</option>
                <option>Societário</option>
                <option>Trabalhista</option>
                <option>Contencioso</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            {editId && <button type="button" className="btn" onClick={() => { setEditId(null); setForm({ nome: '', email: '', cargo: 'Advogado(a) Pleno', area: 'Tributário' }) }}>Cancelar</button>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className={`ti ${saving ? 'ti-loader' : editId ? 'ti-check' : 'ti-plus'}`}></i>
              {editId ? 'Salvar alterações' : 'Cadastrar profissional'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">
          Equipe de consultoria tributária
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{profissionais.length} profissionais</span>
        </div>
        {loading ? (
          <div className="loading"><i className="ti ti-loader"></i> Carregando...</div>
        ) : profissionais.length === 0 ? (
          <div className="empty"><i className="ti ti-users"></i><p>Nenhum profissional cadastrado ainda.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Profissional</th><th>Cargo</th><th>Área</th><th>Email</th><th></th></tr>
              </thead>
              <tbody>
                {profissionais.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="mini-av" style={{ background: getColor(p.nome), width: 28, height: 28, fontSize: 11 }}>{getInitials(p.nome)}</div>
                        <strong>{p.nome}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.cargo || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.area || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.email}</td>
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
