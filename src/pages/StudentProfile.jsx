import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import { supabase } from '../supabaseClient.js'

// Fetches an image URL and converts it to a base64 data URL, since
// jsPDF needs the raw image data rather than just a link to it.
async function toDataURL(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function StudentProfile({ studentId, onBack }) {
  const [student, setStudent] = useState(null)
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('Loading...')
  const [generating, setGenerating] = useState(false)

  async function downloadIDCard() {
    setGenerating(true)
    try {
      const photoDataUrl = await toDataURL(student.photo_url)
      const format = photoDataUrl.match(/data:image\/(\w+);/)[1].toUpperCase()

      // Standard credit-card size (85.6mm x 54mm), landscape.
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] })

      // Card background + border
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, 85.6, 54, 'F')
      doc.setDrawColor(200, 206, 214)
      doc.setLineWidth(0.4)
      doc.rect(0.4, 0.4, 84.8, 53.2, 'S')

      // Header band + green accent stripe (mirrors the app's brand colors)
      doc.setFillColor(22, 34, 63)
      doc.rect(0, 0, 85.6, 14, 'F')
      doc.setFillColor(47, 104, 68)
      doc.rect(0, 14, 85.6, 1.2, 'F')
      doc.rect(0, 52.4, 85.6, 1.6, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.text('VSGOI', 4, 6.3)
      doc.setFontSize(5.3)
      doc.setFont(undefined, 'normal')
      doc.text('Dr. Virendra Swarup Group of Education', 4, 10.4)

      // Framed photo (navy backing creates a thin border ring)
      doc.setFillColor(22, 34, 63)
      doc.rect(3, 18, 23, 23, 'F')
      doc.addImage(photoDataUrl, format, 4, 19, 21, 21)

      // Name + divider
      doc.setTextColor(20, 20, 20)
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.text(student.full_name, 30, 22)
      doc.setDrawColor(220, 226, 233)
      doc.setLineWidth(0.3)
      doc.line(30, 24.5, 81, 24.5)

      // Student ID
      doc.setFont(undefined, 'normal')
      doc.setFontSize(6.2)
      doc.setTextColor(110, 118, 132)
      doc.text('Student ID', 30, 29.5)
      doc.setFont(undefined, 'bold')
      doc.setFontSize(9)
      doc.setTextColor(22, 34, 63)
      doc.text(student.student_id, 30, 33.3)

      // Branch / Semester
      doc.setFont(undefined, 'normal')
      doc.setFontSize(6.2)
      doc.setTextColor(110, 118, 132)
      doc.text('Branch / Semester', 30, 38.3)
      doc.setFont(undefined, 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(22, 34, 63)
      doc.text(`${student.branch || '—'}  ·  Sem ${student.semester || '—'}`, 30, 42.1)

      doc.save(`${student.student_id}-id-card.pdf`)
    } catch (err) {
      setStatus(`Could not generate ID card: ${err.message}`)
    }
    setGenerating(false)
  }

  useEffect(() => {
    if (!studentId) return

    supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()
      .then(({ data, error }) => {
        if (error) setStatus(error.message)
        else setStudent(data)
      })

    supabase
      .from('attendance')
      .select('*, subjects(name)')
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false })
      .then(({ data, error }) => {
        if (error) setStatus(error.message)
        else {
          setRecords(data)
          setStatus('')
        }
      })
  }, [studentId])

  if (!student) return <p className="status">{status}</p>

  const total = records.length
  const present = records.filter((r) => r.status === 'present').length
  const absent = total - present
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0

  // Group records by subject name for the subject-wise table.
  const bySubject = {}
  for (const r of records) {
    const name = r.subjects?.name || 'Unknown'
    if (!bySubject[name]) bySubject[name] = { total: 0, present: 0 }
    bySubject[name].total += 1
    if (r.status === 'present') bySubject[name].present += 1
  }

  return (
    <div>
      <button className="link" onClick={onBack}>
        ← Back to Students
      </button>
      <button onClick={downloadIDCard} disabled={generating} className="id-card-button">
        {generating ? 'Generating...' : 'Download ID Card'}
      </button>

      <div className="profile-header">
        <img src={student.photo_url} width="72" alt={student.full_name} />
        <div>
          <h2>{student.full_name}</h2>
          <p>Student ID: {student.student_id}</p>
        </div>
      </div>

      <div className="summary-cards">
        <div>
          <strong>{total}</strong>
          <span>Total Classes</span>
        </div>
        <div>
          <strong>{present}</strong>
          <span>Present</span>
        </div>
        <div>
          <strong>{absent}</strong>
          <span>Absent</span>
        </div>
        <div>
          <strong>{percentage}%</strong>
          <span>Attendance</span>
        </div>
      </div>

      <h3>Subject-wise</h3>
      {Object.keys(bySubject).length === 0 ? (
        <p className="status">No attendance recorded yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Total</th>
              <th>Present</th>
              <th>Absent</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(bySubject).map(([name, s]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{s.total}</td>
                <td>{s.present}</td>
                <td>{s.total - s.present}</td>
                <td>{Math.round((s.present / s.total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Date-wise</h3>
      {records.length === 0 ? (
        <p className="status">No attendance recorded yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.attendance_date}</td>
                <td>{r.subjects?.name}</td>
                <td>
                  <span className={`badge badge-${r.status}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
