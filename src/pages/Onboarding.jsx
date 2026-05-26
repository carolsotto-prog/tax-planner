import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Programacao from './pages/Programacao'
import Calendario from './pages/Calendario'
import Historico from './pages/Historico'
import Exportar from './pages/Exportar'
import Clientes from './pages/Clientes'
import Projetos from './pages/Projetos'
import Equipe from './pages/Equipe'

const AVATAR_COLORS = ['#4a9fd4','#2e7d52','#6b2fa0','#b36b00','#a32d2d','#1a6b8a','#3d6b2f','#8a3d6b']

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
}

function getColor(name) {
  if (!name) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('programacao')
  const [perfil, setPerfil] = useState(null)
  const [checkingPerfil, setCheckingPerfil] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkPerfil(session.user)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkPerfil(session.user)
      else { setPerfil(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkPerfil(user) {
    setCheckingPerfil(true)
    const { data } = await supabase
      .from('profissionais')
      .select('*')
      .eq('email', user.email)
      .single()
    setPerfil(data || null)
    setLoading(false)
    setCheckingPerfil(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loading || checkingPerfil) return <div className="loading"><i className="ti ti-loader"></i> Carregando...</div>
  if (!session) return <Login />
  if (!perfil) return (
    <Onboarding
      user={session.user}
      onComplete={(nome) => {
        checkPerfil(session.user)
      }}
    />
  )

  const user = session.user
  const displayName = perfil?.nome || user.user_metadata?.full_name || user.email.split('@')[0]
  const initials = getInitials(displayName)
  const avatarColor = getColor(user.email)

  const nav = [
    { section: 'Planejamento' },
    { id: 'programacao', icon: 'ti-layout-grid', label: 'Programação Semanal' },
    { id: 'calendario', icon: 'ti-calendar', label: 'Calendário' },
    { section: 'Projetos' },
    { id: 'historico', icon: 'ti-history', label: 'Histórico' },
    { id: 'exportar', icon: 'ti-file-export', label: 'Exportar' },
    { section: 'Cadastros' },
    { id: 'clientes', icon: 'ti-building', label: 'Clientes' },
    { id: 'projetos', icon: 'ti-briefcase', label: 'Projetos' },
    { id: 'equipe', icon: 'ti-users', label: 'Equipe' },
  ]

  const pages = {
    programacao: <Programacao user={user} />,
    calendario: <Calendario />,
    historico: <Historico />,
    exportar: <Exportar />,
    clientes: <Clientes />,
    projetos: <Projetos />,
    equipe: <Equipe />,
  }

  const titles = {
    programacao: 'Programação Semanal',
    calendario: 'Calendário',
    historico: 'Histórico de Projetos',
    exportar: 'Exportar Relatórios',
    clientes: 'Clientes',
    projetos: 'Projetos',
    equipe: 'Equipe',
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-name">Azevedo Sette</div>
          <div className="logo-sub">Advogados</div>
          <div className="logo-app">▸ Tax Planner</div>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item, i) =>
            item.section ? (
              <div key={i} className="nav-section">{item.section}</div>
            ) : (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <i className={`ti ${item.icon}`}></i>
                {item.label}
              </button>
            )
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar" style={{ background: avatarColor }}>{initials}</div>
          <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{displayName}</div>
            <div className="user-email">{perfil?.cargo || user.email}</div>
          </div>
          <button
            title="Sair"
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
          >
            <i className="ti ti-logout" style={{ fontSize: 16 }}></i>
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <h1 className="topbar-title">{titles[page]}</h1>
        </header>
        <main className="page-content">
          {pages[page]}
        </main>
      </div>
    </div>
  )
}
