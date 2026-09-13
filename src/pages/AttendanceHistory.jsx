import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import { supabase } from '../supabaseClient.js'

export default function AttendanceHistory() {
  const [records, setRecords] = useState([])
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [studentId, setStudentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState('')
  const [branch, setBranch] = useState('')
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('Loading...')

  function exportPDF() {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Attendance Report', 14, 16)
    doc.setFontSize(10)

    let y = 26
    records.forEach((r) => {
      if (y > 280) {
        doc.addPage()
        y = 20
      }
      const line = `${r.attendance_date}  |  ${r.students?.full_name ?? ''} (${
        r.students?.student_id ?? ''
      })  |  ${r.subjects?.name ?? ''}  |  ${r.status}`
      doc.text(line, 14, y)
      y += 7
    })

    doc.save('attendance-report.pdf')
  }

  // Dropdown options, derived from whichever students have that field set.
  const branches = [...new Set(students.map((s) => s.branch).filter(Boolean))]
  const semesters = [...new Set(students.map((s) => s.semester).filter(Boolean))]

  function exportCSV() {
    const header = ['Date', 'Student ID', 'Student Name', 'Subject', 'Status', 'Confidence']
    const rows = records.map((r) => [
      r.attendance_date,
      r.students?.student_id ?? '',
      r.students?.full_name ?? '',
      r.subjects?.name ?? '',
      r.status,
      r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '',
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'attendance-report.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Load the filter dropdowns once.
  useEffect(() => {
    supabase
      .from('students')
      .select('id, full_name, student_id, branch, semester')
      .order('full_name')
      .then(({ data }) => setStudents(data || []))

    supabase
      .from('subjects')
      .select('id, name')
      .order('name')
      .then(({ data }) => setSubjects(data || []))
  }, [])

  // Re-run the query whenever a filter changes.
  useEffect(() => {
    let query = supabase
      .from('attendance')
      .select('*, students!inner(full_name, student_id, branch, semester), subjects(name)')
      .order('attendance_date', { ascending: false })

    if (studentId) query = query.eq('student_id', studentId)
    if (subjectId) query = query.eq('subject_id', subjectId)
    if (date) query = query.eq('attendance_date', date)
    if (branch) query = query.eq('students.branch', branch)
    if (semester) query = query.eq('students.semester', semester)

    query.then(({ data, error }) => {
      if (error) setStatus(error.message)
      else {
        setRecords(data)
        setStatus(data.length === 0 ? 'No records match these filters.' : '')
      }
    })
  }, [studentId, subjectId, date, branch, semester])

  return (
    <div>
      <h2>Attendance History</h2>

      <div className="filters">
        <label>
          Student
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">All students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.student_id})
              </option>
            ))}
          </select>
        </label>

        <label>
          Subject
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label>
          Branch
          <select value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label>
          Semester
          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">All semesters</option>
            {semesters.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status && <p className="status">{status}</p>}

      {records.length > 0 && (
        <div className="export-buttons">
          <button onClick={exportCSV} className="export-button">
            Export CSV ({records.length} records)
          </button>
          <button onClick={exportPDF} className="export-button">
            Export PDF
          </button>
        </div>
      )}

      {records.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.attendance_date}</td>
                <td>
                  {r.students?.full_name} ({r.students?.student_id})
                </td>
                <td>{r.subjects?.name}</td>
                <td>
                  <span className={`badge badge-${r.status}`}>{r.status}</span>
                </td>
                <td>{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
