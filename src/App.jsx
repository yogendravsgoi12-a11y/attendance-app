import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RegisterStudent from './pages/RegisterStudent.jsx'
import TakeAttendance from './pages/TakeAttendance.jsx'
import StudentsList from './pages/StudentsList.jsx'
import Subjects from './pages/Subjects.jsx'
import AttendanceHistory from './pages/AttendanceHistory.jsx'
import StudentProfile from './pages/StudentProfile.jsx'

const TABS = {
  dashboard: { label: 'Dashboard', Page: Dashboard },
  register: { label: 'Register Student', Page: RegisterStudent },
  attendance: { label: 'Take Attendance', Page: TakeAttendance },
  students: { label: 'Students', Page: StudentsList },
  subjects: { label: 'Subjects', Page: Subjects },
  history: { label: 'Attendance History', Page: AttendanceHistory },
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [viewingStudentId, setViewingStudentId] = useState(null)

  // Keep session in sync with Supabase Auth (handles login, logout, refresh).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Once we know who's logged in, look up their role (admin/teacher).
  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [session])

  if (loading)
    return (
      <div className="auth-screen">
        <p className="status">Loading...</p>
      </div>
    )
  if (!session) return <Login />

  const { Page } = TABS[tab]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">VSGOI</div>
          <div>
            <div className="brand-college">Dr. Virendra Swarup Group of Education</div>
            <div className="brand-tagline">Attendance System</div>
          </div>
        </div>

        <nav className="sidenav">
          {Object.entries(TABS).map(([key, { label }]) => (
            <button
              key={key}
              className={!viewingStudentId && tab === key ? 'active' : ''}
              onClick={() => {
                setTab(key)
                setViewingStudentId(null)
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="email">{session.user.email}</div>
          {profile && <span className="role-badge">{profile.role}</span>}
          <button onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
      </aside>

      <main className="content">
        {viewingStudentId ? (
          <StudentProfile studentId={viewingStudentId} onBack={() => setViewingStudentId(null)} />
        ) : (
          <Page isAdmin={profile?.role === 'admin'} onSelectStudent={setViewingStudentId} />
        )}
      </main>
    </div>
  )
}
