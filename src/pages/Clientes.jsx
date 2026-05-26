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

const PRAZOS_PADRAO = [
  { label: 'Prazo para revisão', data: '', cor: 'verde' },
  { label: 'Prazo relatório', data: '', cor: 'amarelo' },
  { label: 'Prazo cliente', data: '', cor: 'vermelho' },
]

const COR_STYLE = {
  verde: { bg: '#eaf6f0', border: '#2e7d52', color: '#1e6e3a', dot: '#2e7d52' },
  amarelo: { bg: '#fef9e6', border: '#d4a017', color: '#7a5808', dot: '#d4a017' },
  vermelho: { bg: '#fde8e8', border: '#a32d2d', color: '#a32d2d', dot: '#a32d2d' },
  custom: { bg: '#f0ecfb', border: '#6b2fa0', color: '#5a2d9a', dot: '#6b2fa0' },
}

function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
}

const AVATAR_COLORS = ['#4a9fd4','#2e7d52','#6b2fa0','#b36b00','#a32d2d','#1a6b8a']
function getColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [projetos, setProjetos] = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState(null)

  // Modal cliente
  const [modalCliente, setModalCliente] = useState(false)
  const [editClienteId, setEditClienteId] = useState(null)
  const [formCliente, setFormCliente] = useState({ nome: '', nome_curto: '', cnpj: '', contato: '' })
  const [savingCliente, setSavingCliente] = useState(false)
  const [msgCliente, setMsgCliente] = useState('')

  // Modal projeto
  const [modalProjeto, setModalProjeto] = useState(false)
  const [editProjetoId, setEditProjetoId] = useState(null)
  const [formProjeto, setFormProjeto] = useState({ cliente_id: '', nome: '', tipo: 'FT', status: 'A programar', responsavel_id: '' })
  const [equipe, setEquipe] = useState([])
  const [prazos, setPrazos] = useState(PRAZOS_PADRAO.map(p => ({ ...p })))
  const [savingProjeto, setSavingProjeto] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: clis }, { data: projs }, { data: profs }] = await Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('projetos').select('*').order('nome'),
      supabase.from('profissionais').select('*').order('nome'),
    ])
    setClientes(clis || [])
    setProjetos(projs || [])
    setProfissionais(profs || [])
    setLoading(false)
    if (clis?.length && !clienteSelecionado) setClienteSelecionado(clis[0].id)
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.nome_curto || '').toLowerCase().includes(busca.toLowerCase())
  )

  const projetosDoCliente = projetos.filter(p => p.cliente_id === clienteSelecionado)
  const clienteAtual = clientes.find(c => c.id === clienteSelecionado)

  // CLIENTE
  function openNovoCliente() {
    setEditClienteId(null)
    setFormCliente({ nome: '', nome_curto: '', cnpj: '', contato: '' })
    setModalCliente(true)
  }

  function openEditCliente(c) {
    setEditClienteId(c.id)
    setFormCliente({ nome: c.nome, nome_curto: c.nome_curto || '', cnpj: c.cnpj || '', contato: c.contato || '' })
    setModalCliente(true)
  }

  async function handleSaveCliente(e) {
    e.preventDefault()
    setSavingCliente(true)
    if (editClienteId) {
      await supabase.from('clientes').update(formCliente).eq('id', editClienteId)
      setMsgCliente('Cliente atualizado!')
    } else {
      const { data } = await supabase.from('clientes').insert(formCliente).select().single()
      if (data) setClienteSelecionado(data.id)
      setMsgCliente('Cliente cadastrado!')
    }
    setSavingCliente(false)
    setModalCliente(false)
    fetchAll()
    setTimeout(() => setMsgCliente(''), 3000)
  }

  // PROJETO
  function openNovoProjeto() {
    setEditProjetoId(null)
    setFormProjeto({ cliente_id: clienteSelecionado, nome: '', tipo: 'FT', status: 'A programar', responsavel_id: '' })
    setEquipe([])
    setPrazos(PRAZOS_PADRAO.map(p => ({ ...p })))
    setModalProjeto(true)
  }

  function openEditProjeto(p) {
    setEditProjetoId(p.id)
    setFormProjeto({ cliente_id: p.cliente_id, nome: p.nome, tipo: p.tipo, status: p.status, responsavel_id: p.responsavel_id || '' })
    setEquipe(p.equipe || [])
    // Mescla prazos padrão com os salvos
    const padrao = PRAZOS_PADRAO.map(pd => {
      const salvo = (p.prazos || []).find(ps => ps.label === pd.label)
      return salvo ? { ...pd, data: salvo.data } : { ...pd }
    })
    const custom = (p.prazos || []).filter(ps => !PRAZOS_PADRAO.find(pd => pd.label === ps.label))
    setPrazos([...padrao, ...custom.map(c => ({ ...c, cor: 'custom' }))])
    setModalProjeto(true)
  }

  async function handleSaveProjeto(e) {
    e.preventDefault()
    setSavingProjeto(true)
    const prazosFiltrados = prazos.filter(p => p.data)
    const payload = { ...formProjeto, equipe, prazos: prazosFiltrados }

    if (editProjetoId) {
      await supabase.from('projetos').update(payload).eq('id', editProjetoId)
      await supabase.from('historico_projetos').insert({
        projeto_id: editProjetoId, tipo: 'edicao',
        descricao: `Projeto atualizado — status: ${formProjeto.status}`,
      })
    } else {
      const { data } = await supabase.from('projetos').insert(payload).select().single()
      if (data) {
        await supabase.from('historico_projetos').insert({
          projeto_id: data.id, tipo: 'criacao',
          descricao: `Projeto criado — status: ${formProjeto.status}`,
        })
      }
    }
    setSavingProjeto(false)
    setModalProjeto(false)
    fetchAll()
  }

  function toggleEquipe(id) {
    setEquipe(eq => eq.includes(id) ? eq.filter(e => e !== id) : [...eq, id])
  }

  function updatePrazo(i, field, value) {
    const novo = [...prazos]
    novo[i][field] = value
    setPrazos(novo)
  }

  function addPrazoCustom() {
    setPrazos([...prazos, { label: '', data: '', cor: 'custom' }])
  }

  function removePrazo(i) {
    setPrazos(prazos.filter((_, idx) => idx !== i))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 56px - 48px)', overflow: 'hidden' }}>
      {msgCliente && <div className="alert alert-success" style={{ margin: '0 0 8px' }}>{msgCliente}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, flex: 1, overflow: 'hidden', border: '0.5px solid var(--border)', borderRadius: 10, background: 'white' }}>

        {/* PAINEL ESQUERDO — CLIENTES */}
        <div style={{ borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              placeholder="Buscar cliente..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            />
            <button className="btn btn-primary btn-sm" onClick={openNovoCliente} title="Novo cliente">
              <i className="ti ti-plus"></i>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div className="loading">Carregando...</div>
            ) : clientesFiltrados.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>Nenhum cliente encontrado</div>
            ) : clientesFiltrados.map(c => {
              const nProjs = projetos.filter(p => p.cliente_id === c.id).length
              const ativo = clienteSelecionado === c.id
              return (
                <div
                  key={c.id}
                  onClick={() => setClienteSelecionado(c.id)}
                  style={{ padding: '10px 14px', cursor: 'pointer', background: ativo ? 'var(--cyan-light)' : 'white', borderLeft: `3px solid ${ativo ? 'var(--cyan)' : 'transparent'}`, borderBottom: '0.5px solid var(--border)', transition: 'all 0.1s' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{c.nome_curto || c.nome}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{nProjs} projeto{nProjs !== 1 ? 's' : ''}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* PAINEL DIREITO — PROJETOS */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!clienteAtual ? (
            <div className="empty"><i className="ti ti-building"></i><p>Selecione um cliente para ver seus projetos.</p></div>
          ) : (
            <>
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)' }}>{clienteAtual.nome}</div>
                  {clienteAtual.cnpj && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{clienteAtual.cnpj}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm" onClick={() => openEditCliente(clienteAtual)}>
                    <i className="ti ti-edit"></i> Editar cliente
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={openNovoProjeto}>
                    <i className="ti ti-plus"></i> Novo projeto
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {projetosDoCliente.length === 0 ? (
                  <div className="empty"><i className="ti ti-briefcase"></i><p>Nenhum projeto cadastrado para este cliente.</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {projetosDoCliente.map(p => {
                      const resp = profissionais.find(pr => pr.id === p.responsavel_id)
                      return (
                        <div key={p.id} style={{ border: '0.5px solid var(--border)', borderRadius: 8, padding: '12px 14px', background: 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{p.nome}</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <span className={`badge ${p.tipo === 'FT' ? 'badge-ft' : 'badge-tarefa'}`}>{p.tipo}</span>
                                <span className={`badge ${STATUS_BADGE[p.status] || ''}`}>{p.status}</span>
                              </div>
                            </div>
                            <button className="btn btn-sm" onClick={() => openEditProjeto(p)}><i className="ti ti-edit"></i></button>
                          </div>

                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                            {/* Responsável */}
                            {resp && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: getColor(resp.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, color: 'white' }}>{getInitials(resp.nome)}</div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Resp: <strong style={{ color: 'var(--navy)' }}>{resp.nome.split(' ')[0]}</strong></span>
                              </div>
                            )}

                            {/* Prazos */}
                            {(p.prazos || []).filter(pr => pr.data).map((pr, i) => {
                              const cor = COR_STYLE[pr.cor] || COR_STYLE.custom
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: cor.dot }}></div>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pr.label}: <strong style={{ color: cor.color }}>{formatDate(pr.data)}</strong></span>
                                </div>
                              )
                            })}
                          </div>

                          {/* Equipe */}
                          {(p.equipe || []).length > 0 && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                              {(p.equipe || []).map(profId => {
                                const prof = profissionais.find(pr => pr.id === profId)
                                if (!prof) return null
                                return (
                                  <div key={profId} title={prof.nome} style={{ width: 22, height: 22, borderRadius: '50%', background: getColor(prof.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, color: 'white' }}>{getInitials(prof.nome)}</div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL CLIENTE */}
      {modalCliente && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalCliente(false)}>
          <div className="modal">
            <div className="modal-title">
              {editClienteId ? 'Editar cliente' : 'Novo cliente'}
              <button className="btn btn-sm" onClick={() => setModalCliente(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveCliente}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Razão social *</label>
                  <input required placeholder="Ex: Gerdau S.A." value={formCliente.nome} onChange={e => setFormCliente({ ...formCliente, nome: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Nome curto</label>
                  <input placeholder="Ex: Gerdau" value={formCliente.nome_curto} onChange={e => setFormCliente({ ...formCliente, nome_curto: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>CNPJ</label>
                  <input placeholder="00.000.000/0000-00" value={formCliente.cnpj} onChange={e => setFormCliente({ ...formCliente, cnpj: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Contato principal</label>
                  <input placeholder="Nome do contato" value={formCliente.contato} onChange={e => setFormCliente({ ...formCliente, contato: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModalCliente(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={savingCliente}>
                  {savingCliente ? 'Salvando...' : editClienteId ? 'Salvar alterações' : 'Cadastrar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PROJETO */}
      {modalProjeto && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalProjeto(false)}>
          <div className="modal" style={{ width: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-title">
              {editProjetoId ? 'Editar projeto' : 'Novo projeto'}
              <button className="btn btn-sm" onClick={() => setModalProjeto(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveProjeto}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome do projeto *</label>
                  <input required placeholder="Ex: IRPJ 2024 – Revisão" value={formProjeto.nome} onChange={e => setFormProjeto({ ...formProjeto, nome: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={formProjeto.status} onChange={e => setFormProjeto({ ...formProjeto, status: e.target.value })}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <div className="radio-group">
                    <label className="radio-opt"><input type="radio" checked={formProjeto.tipo === 'FT'} onChange={() => setFormProjeto({ ...formProjeto, tipo: 'FT' })} /> FT</label>
                    <label className="radio-opt"><input type="radio" checked={formProjeto.tipo === 'Tarefa'} onChange={() => setFormProjeto({ ...formProjeto, tipo: 'Tarefa' })} /> Tarefa</label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Responsável</label>
                  <select value={formProjeto.responsavel_id} onChange={e => setFormProjeto({ ...formProjeto, responsavel_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* EQUIPE */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Equipe</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {profissionais.map(p => {
                    const sel = equipe.includes(p.id)
                    return (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', padding: '5px 10px', border: `0.5px solid ${sel ? 'var(--cyan)' : 'var(--border)'}`, borderRadius: 6, background: sel ? 'var(--cyan-light)' : 'white', userSelect: 'none' }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleEquipe(p.id)} style={{ display: 'none' }} />
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: getColor(p.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 600, color: 'white' }}>{getInitials(p.nome)}</div>
                        {p.nome.split(' ')[0]}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* PRAZOS */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Prazos</div>
                {prazos.map((p, i) => {
                  const cor = COR_STYLE[p.cor] || COR_STYLE.custom
                  const isPadrao = i < 3
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: cor.dot, flexShrink: 0 }}></div>
                      {isPadrao ? (
                        <span style={{ flex: 2, fontSize: 12, color: 'var(--navy)', fontWeight: 500 }}>{p.label}</span>
                      ) : (
                        <input placeholder="Nome do prazo" value={p.label} onChange={e => updatePrazo(i, 'label', e.target.value)} style={{ flex: 2, padding: '6px 10px', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
                      )}
                      <input type="date" value={p.data} onChange={e => updatePrazo(i, 'data', e.target.value)} style={{ flex: 1, padding: '6px 10px', border: `0.5px solid ${p.data ? cor.border : 'var(--border)'}`, borderRadius: 6, fontSize: 12, background: p.data ? cor.bg : 'white' }} />
                      {!isPadrao && <button type="button" onClick={() => removePrazo(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>}
                    </div>
                  )
                })}
                <button type="button" className="btn btn-sm" onClick={addPrazoCustom} style={{ marginTop: 4 }}>
                  + Prazo intermediário
                </button>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModalProjeto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={savingProjeto}>
                  {savingProjeto ? 'Salvando...' : editProjetoId ? 'Salvar alterações' : 'Cadastrar projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
