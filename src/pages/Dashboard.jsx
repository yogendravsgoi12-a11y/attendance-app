import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Dashboard() {
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalSubjects, setTotalSubjects] = useState(0)
  const [todayPresent, setTodayPresent] = useState(0)
  const [todayAbsent, setTodayAbsent] = useState(0)
  const [sessions, setSessions] = useState([])
  const [status, setStatus] = useState('Loading...')

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
      supabase.from('attendance').select('status').eq('attendance_date', today),
      supabase
        .from('attendance')
        .select('attendance_date, status, subjects(name)')
        .gte('attendance_date', thirtyDaysAgo)
        .order('attendance_date', { ascending: false }),
    ]).then(([studentsRes, subjectsRes, todayRes, recentRes]) => {
      setTotalStudents(studentsRes.count || 0)
      setTotalSubjects(subjectsRes.count || 0)

      const todayRecords = todayRes.data || []
      setTodayPresent(todayRecords.filter((r) => r.status === 'present').length)
      setTodayAbsent(todayRecords.filter((r) => r.status === 'absent').length)

      // A "session" is one subject taught on one day — group the raw
      // attendance rows by (date, subject) and count present/absent.
      const grouped = {}
      for (const r of recentRes.data || []) {
        const subjectName = r.subjects?.name || 'Unknown'
        const key = `${r.attendance_date}__${subjectName}`
        if (!grouped[key]) {
          grouped[key] = { date: r.attendance_date, subject: subjectName, present: 0, absent: 0 }
        }
        if (r.status === 'present') grouped[key].present += 1
        else if (r.status === 'absent') grouped[key].absent += 1
      }
      setSessions(Object.values(grouped))

      setStatus('')
    })
  }, [])

  const todayTotal = todayPresent + todayAbsent
  const presentPct = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0

  return (
    <div>
      <h2>Dashboard</h2>
      {status && <p className="status">{status}</p>}

      <div className="summary-cards">
        <div>
          <strong>{totalStudents}</strong>
          <span>Total Students</span>
        </div>
        <div>
          <strong>{totalSubjects}</strong>
          <span>Subjects</span>
        </div>
        <div>
          <strong>{todayPresent}</strong>
          <span>Present Today</span>
        </div>
        <div>
          <strong>{todayAbsent}</strong>
          <span>Absent Today</span>
        </div>
      </div>

      {todayTotal > 0 ? (
        <>
          <h3>Today's Attendance — {presentPct}% present</h3>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${presentPct}%` }} />
          </div>
        </>
      ) : (
        <p className="status">No attendance taken yet today.</p>
      )}

      <h3>Recent Sessions (last 30 days)</h3>
      {sessions.length === 0 ? (
        <p className="status">No sessions recorded yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Present</th>
              <th>Absent</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={i}>
                <td>{s.date}</td>
                <td>{s.subject}</td>
                <td>{s.present}</td>
                <td>{s.absent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
