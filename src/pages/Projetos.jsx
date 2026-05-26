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

function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function Projetos() {
  const [clientes, setClientes] = useState([])
  const [projetos, setProjetos] = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [loading, setLoading] = useState(true)
  const [clienteAberto, setClienteAberto] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ cliente_id: '', nome: '', tipo: 'FT', status: 'A programar' })
  const [equipe, setEquipe] = useState([])
  const [prazos, setPrazos] = useState([{ label: 'Prazo final', data: '' }])
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: clis }, { data: projs }, { data: profs }] = await Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('projetos').select('*, clientes(nome, nome_curto)').order('nome'),
      supabase.from('profissionais').select('*').order('nome'),
    ])
    setClientes(clis || [])
    setProjetos(projs || [])
    setProfissionais(profs || [])
    setLoading(false)
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

  function toggleEquipe(id) {
    setEquipe(eq => eq.includes(id) ? eq.filter(e => e !== id) : [...eq, id])
  }

  function openNovo(clienteId) {
    setEditId(null)
    setForm({ cliente_id: clienteId, nome: '', tipo: 'FT', status: 'A programar' })
    setEquipe([])
    setPrazos([{ label: 'Prazo final', data: '' }])
    setModal(true)
  }

  function openEdit(p) {
    setEditId(p.id)
    setForm({ cliente_id: p.cliente_id, nome: p.nome, tipo: p.tipo, status: p.status })
    setEquipe(p.equipe || [])
    setPrazos(p.prazos?.length ? p.prazos : [{ label: 'Prazo final', data: '' }])
    setModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const prazosFiltrados = prazos.filter(p => p.label && p.data)
    const payload = { ...form, equipe, prazos: prazosFiltrados }

    if (editId) {
      await supabase.from('projetos').update(payload).eq('id', editId)
      await supabase.from('historico_projetos').insert({
        projeto_id: editId, tipo: 'edicao',
        descricao: `Projeto atualizado — status: ${form.status}`,
      })
      setMsg('Projeto atualizado!')
    } else {
      const { data } = await supabase.from('projetos').insert(payload).select().single()
      if (data) {
        await supabase.from('historico_projetos').insert({
          projeto_id: data.id, tipo: 'criacao',
          descricao: `Projeto criado — status: ${form.status}`,
        })
      }
      setMsg('Projeto cadastrado!')
    }
    setSaving(false)
    setModal(false)
    fetchAll()
    setTimeout(() => setMsg(''), 3000)
  }

  const projetosPorCliente = (clienteId) =>
    projetos.filter(p => p.cliente_id === clienteId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {msg && <div className="alert alert-success">{msg}</div>}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : clientes.length === 0 ? (
        <div className="empty card"><i className="ti ti-building"></i><p>Nenhum cliente cadastrado. Cadastre clientes primeiro.</p></div>
      ) : (
        clientes.map(c => {
          const projs = projetosPorCliente(c.id)
          const aberto = clienteAberto === c.id
          return (
            <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: aberto ? '#f0f8fe' : 'white', borderBottom: aberto ? '0.5px solid var(--border)' : 'none' }}
                onClick={() => setClienteAberto(aberto ? null : c.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className={`ti ${aberto ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ color: 'var(--cyan)', fontSize: 14 }}></i>
                  <strong style={{ fontSize: 14, color: 'var(--navy)' }}>{c.nome_curto || c.nome}</strong>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{projs.length} projeto{projs.length !== 1 ? 's' : ''}</span>
                </div>
                <button className="btn btn-sm btn-primary" onClick={e => { e.stopPropagation(); openNovo(c.id) }}>
                  <i className="ti ti-plus"></i> Novo projeto
                </button>
              </div>

              {aberto && (
                <div>
                  {projs.length === 0 ? (
                    <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum projeto cadastrado para este cliente.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px 16px', background: 'var(--gray-bg)', color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left', borderBottom: '0.5px solid var(--border)' }}>Projeto</th>
                          <th style={{ padding: '8px 16px', background: 'var(--gray-bg)', color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left', borderBottom: '0.5px solid var(--border)' }}>Tipo</th>
                          <th style={{ padding: '8px 16px', background: 'var(--gray-bg)', color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left', borderBottom: '0.5px solid var(--border)' }}>Status</th>
                          <th style={{ padding: '8px 16px', background: 'var(--gray-bg)', color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left', borderBottom: '0.5px solid var(--border)' }}>Prazos</th>
                          <th style={{ padding: '8px 16px', background: 'var(--gray-bg)', color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left', borderBottom: '0.5px solid var(--border)' }}>Equipe</th>
                          <th style={{ padding: '8px 16px', background: 'var(--gray-bg)', borderBottom: '0.5px solid var(--border)' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {projs.map(p => (
                          <tr key={p.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                            <td style={{ padding: '10px 16px' }}><strong>{p.nome}</strong></td>
                            <td style={{ padding: '10px 16px' }}><span className={`badge ${p.tipo === 'FT' ? 'badge-ft' : 'badge-tarefa'}`}>{p.tipo}</span></td>
                            <td style={{ padding: '10px 16px' }}><span className={`badge ${STATUS_BADGE[p.status] || ''}`}>{p.status}</span></td>
                            <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                              {p.prazos?.length ? p.prazos.map((pr, i) => (
                                <div key={i}>{pr.label}: <strong style={{ color: 'var(--navy)' }}>{formatDate(pr.data)}</strong></div>
                              )) : '—'}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {(p.equipe || []).slice(0, 4).map(profId => {
                                  const prof = profissionais.find(pr => pr.id === profId)
                                  if (!prof) return null
                                  const initials = prof.nome.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
                                  return (
                                    <div key={profId} title={prof.nome} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: 'white' }}>{initials}</div>
                                  )
                                })}
                                {(p.equipe || []).length > 4 && <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gray-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--text-muted)' }}>+{p.equipe.length - 4}</div>}
                              </div>
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <button className="btn btn-sm" onClick={() => openEdit(p)}><i className="ti ti-edit"></i> Editar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ width: 560 }}>
            <div className="modal-title">
              {editId ? 'Editar projeto' : 'Novo projeto'}
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Cliente *</label>
                  <select required value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                    <option value="">Selecione</option>
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

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Equipe</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {profissionais.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', padding: '5px 10px', border: `0.5px solid ${equipe.includes(p.id) ? 'var(--cyan)' : 'var(--border)'}`, borderRadius: 6, background: equipe.includes(p.id) ? 'var(--cyan-light)' : 'white' }}>
                      <input type="checkbox" checked={equipe.includes(p.id)} onChange={() => toggleEquipe(p.id)} style={{ display: 'none' }} />
                      {p.nome.split(' ')[0]}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Prazos</div>
                {prazos.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input placeholder="Nome (ex: Prazo de revisão)" value={p.label} onChange={e => updatePrazo(i, 'label', e.target.value)} style={{ flex: 2, padding: '7px 10px', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
                    <input type="date" value={p.data} onChange={e => updatePrazo(i, 'data', e.target.value)} style={{ flex: 1, padding: '7px 10px', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
                    {prazos.length > 1 && <button type="button" onClick={() => removePrazo(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>}
                  </div>
                ))}
                <button type="button" className="btn btn-sm" onClick={addPrazo}>+ Adicionar prazo</button>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : editId ? 'Salvar alterações' : 'Cadastrar projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
