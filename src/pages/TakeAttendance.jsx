import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient.js'
import { loadModels, getAllFaceDescriptors, distance } from '../face.js'

// Lower = stricter matching. 0.5 is a reasonable starting point;
// tune it up or down after testing with your own photos.
const MATCH_THRESHOLD = 0.5

// Matches below this confidence get flagged for the teacher to double-check.
const LOW_CONFIDENCE_THRESHOLD = 0.7

export default function TakeAttendance() {
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [allStudents, setAllStudents] = useState([])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('')
  const [scanning, setScanning] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    loadModels()
    supabase
      .from('subjects')
      .select('*')
      .order('name')
      .then(({ data }) => setSubjects(data || []))
  }, [])

  function handleFile(e) {
    const selected = e.target.files[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setResults([])
    setStatus('')
  }

  async function handleScan() {
    setScanning(true)
    setStatus('Loading registered students...')

    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('status', 'active')
    if (error) {
      setStatus(`Could not load students: ${error.message}`)
      setScanning(false)
      return
    }
    setAllStudents(students)

    setStatus('Detecting faces in the photo...')
    const faceDescriptors = await getAllFaceDescriptors(imgRef.current)

    if (faceDescriptors.length === 0) {
      setStatus('No faces detected in this photo.')
      setScanning(false)
      return
    }

    // For each face found, find the closest registered student (if any).
    const matched = faceDescriptors.map((faceDescriptor) => {
      let best = null
      for (const student of students) {
        const d = distance(faceDescriptor, student.face_descriptor)
        if (d < MATCH_THRESHOLD && (!best || d < best.dist)) {
          best = { student, dist: d }
        }
      }
      return best
        ? { student: best.student, confidence: 1 - best.dist, status: 'present' }
        : { student: null, confidence: null, status: 'unknown' }
    })

    // Any registered student not matched to a face is absent.
    const presentIds = new Set(matched.filter((m) => m.student).map((m) => m.student.id))
    const absent = students
      .filter((s) => !presentIds.has(s.id))
      .map((s) => ({ student: s, confidence: null, status: 'absent' }))

    setResults([...matched, ...absent])
    setStatus('')
    setScanning(false)
  }

  // Teacher overriding an AI decision (e.g. rejecting a shaky match).
  function handleStatusChange(index, newStatus) {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, status: newStatus } : r))
    )
  }

  // Teacher manually pointing an unmatched face at a real registered student.
  function handleAssign(index, studentId) {
    if (!studentId) return
    const student = allStudents.find((s) => s.id === studentId)
    setResults((prev) =>
      prev.map((r, i) =>
        i === index ? { student, confidence: null, status: 'present', manual: true } : r
      )
    )
  }

  async function handleSave() {
    setStatus('Saving attendance...')
    const today = new Date().toISOString().slice(0, 10)

    const rows = results
      .filter((r) => r.student)
      .map((r) => ({
        student_id: r.student.id,
        subject_id: subjectId,
        attendance_date: today,
        status: r.status,
        confidence: r.confidence,
      }))

    const { error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'student_id,subject_id,attendance_date' })

    setStatus(error ? `Save failed: ${error.message}` : `Attendance saved for ${today}.`)
  }

  return (
    <div>
      <h2>Take Attendance</h2>

      <label>
        Subject
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Select a subject...</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <input type="file" accept="image/*" onChange={handleFile} />
      {preview && <img ref={imgRef} src={preview} alt="classroom" width="360" />}
      {file && (
        <button onClick={handleScan} disabled={scanning || !subjectId}>
          {scanning ? 'Scanning...' : 'Scan Faces'}
        </button>
      )}
      {file && !subjectId && <p className="status">Pick a subject first.</p>}

      {results.length > 0 && (
        <>
          <p className="status">
            Review the results below before saving — change any status the AI got
            wrong, or assign an unrecognized face to a student.
          </p>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Status</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const lowConfidence =
                  r.confidence != null && r.confidence < LOW_CONFIDENCE_THRESHOLD

                return (
                  <tr key={i}>
                    <td>
                      {r.student ? (
                        r.student.full_name
                      ) : (
                        <select defaultValue="" onChange={(e) => handleAssign(i, e.target.value)}>
                          <option value="">Unknown face — assign to student...</option>
                          {allStudents.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.full_name} ({s.student_id})
                            </option>
                          ))}
                        </select>
                      )}
                      {lowConfidence && <span className="warning-badge"> ⚠ verify</span>}
                    </td>
                    <td>{r.student ? r.student.student_id : '—'}</td>
                    <td>
                      {r.student ? (
                        <select value={r.status} onChange={(e) => handleStatusChange(i, e.target.value)}>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      ) : (
                        <span className={`badge badge-${r.status}`}>{r.status}</span>
                      )}
                    </td>
                    <td>
                      {r.manual
                        ? 'Manually verified'
                        : r.confidence != null
                        ? `${Math.round(r.confidence * 100)}%`
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button onClick={handleSave}>Confirm &amp; Save Attendance</button>
        </>
      )}

      {status && <p className="status">{status}</p>}
    </div>
  )
}
