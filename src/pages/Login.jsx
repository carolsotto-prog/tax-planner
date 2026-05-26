import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMsg('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email ou senha incorretos.')
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://tax-planner-blush.vercel.app'
        }
      })
      if (error) setError(error.message)
      else setMsg('Conta criada! Verifique seu email para confirmar o cadastro.')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="name">Azevedo Sette</div>
          <div className="sub">Advogados</div>
          <div className="app">Tax Planner — Consultoria Tributária</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email" required
              placeholder="seu@azevedosette.com.br"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password" required
              placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#6b7a94' }}>
          {mode === 'login' ? (
            <>Primeira vez? <button style={{ background: 'none', border: 'none', color: '#4a9fd4', cursor: 'pointer', fontSize: 12 }} onClick={() => { setMode('signup'); setError(''); setMsg('') }}>Criar conta</button></>
          ) : (
            <>Já tem conta? <button style={{ background: 'none', border: 'none', color: '#4a9fd4', cursor: 'pointer', fontSize: 12 }} onClick={() => { setMode('login'); setError(''); setMsg('') }}>Entrar</button></>
          )}
        </p>
      </div>
    </div>
  )
}
