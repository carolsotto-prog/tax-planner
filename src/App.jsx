import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Onboarding({ user, onComplete }) {
  const [nome, setNome] = useState(user.email.split('@')[0])
  const [cargo, setCargo] = useState('Advogado(a) Pleno')
  const [area, setArea] = useState('Tributário')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    await supabase.auth.updateUser({ data: { full_name: nome } })
    const { error: dbError } = await supabase.from('profissionais').upsert({
      email: user.email, nome, cargo, area,
    }, { onConflict: 'email' })
    if (dbError) { setError('Erro ao salvar. Tente novamente.'); setSaving(false); return }
    onComplete(nome)
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ width: 460 }}>
        <div className="login-logo">
          <div className="name">Azevedo Sette</div>
          <div className="sub">Advogados</div>
          <div className="app">Bem-vindo(a) ao Tax Planner!</div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
          Confirme seus dados para aparecer corretamente na equipe.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Seu nome completo *</label>
            <input required placeholder="Ex: Ana Paula Sette" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={user.email} disabled style={{ background: '#f5f7fa', color: 'var(--text-muted)' }} />
          </div>
          <div className="form-group">
            <label>Cargo</label>
            <select value={cargo} onChange={e => setCargo(e.target.value)}>
              <option>Sócio(a)</option>
              <option>Advogado(a) Sênior</option>
              <option>Advogado(a) Pleno</option>
              <option>Advogado(a) Júnior</option>
              <option>Estagiário(a)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Área</label>
            <select value={area} onChange={e => setArea(e.target.value)}>
              <option>Tributário</option>
              <option>Societário</option>
              <option>Trabalhista</option>
              <option>Contencioso</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 4 }}>
            {saving ? <><i className="ti ti-loader"></i> Salvando...</> : <><i className="ti ti-check"></i> Confirmar e entrar</>}
          </button>
        </form>
      </div>
    </div>
  )
}
