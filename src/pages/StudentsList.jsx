import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient.js'

export default function StudentsList({ isAdmin, onSelectStudent }) {
  const [students, setStudents] = useState([])
  const [showInactive, setShowInactive] = useState(false)
  const [status, setStatus] = useState('Loading...')

  function loadStudents() {
    supabase
      .from('students')
      .select('*')
      .eq('status', showInactive ? 'inactive' : 'active')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setStatus(error.message)
        else {
          setStudents(data)
          setStatus(
            data.length === 0
              ? showInactive
                ? 'No deactivated students.'
                : 'No students registered yet.'
              : ''
          )
        }
      })
  }

  useEffect(loadStudents, [showInactive])

  async function handleDeactivate(student) {
    if (!confirm(`Deactivate ${student.full_name}? Their attendance history stays intact.`)) return
    const { error } = await supabase
      .from('students')
      .update({ status: 'inactive' })
      .eq('id', student.id)
    if (error) setStatus(`Could not deactivate: ${error.message}`)
    else loadStudents()
  }

  async function handleReactivate(student) {
    const { error } = await supabase
      .from('students')
      .update({ status: 'active' })
      .eq('id', student.id)
    if (error) setStatus(`Could not reactivate: ${error.message}`)
    else loadStudents()
  }

  return (
    <div>
      <h2>Registered Students</h2>

      {isAdmin && (
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show deactivated students
        </label>
      )}

      {status && <p className="status">{status}</p>}

      {students.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Student ID</th>
              <th>Name</th>
              <th>Branch</th>
              <th>Semester</th>
              <th>Registered</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>
                  <img src={s.photo_url} width="48" alt={s.full_name} />
                </td>
                <td>{s.student_id}</td>
                <td>
                  <button className="link" onClick={() => onSelectStudent(s.id)}>
                    {s.full_name}
                  </button>
                </td>
                <td>{s.branch || '—'}</td>
                <td>{s.semester || '—'}</td>
                <td>{new Date(s.created_at).toLocaleDateString()}</td>
                {isAdmin && (
                  <td>
                    {showInactive ? (
                      <button onClick={() => handleReactivate(s)}>Reactivate</button>
                    ) : (
                      <button onClick={() => handleDeactivate(s)}>Deactivate</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
