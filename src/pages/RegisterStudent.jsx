import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient.js'
import { loadModels, getSingleFaceDescriptor } from '../face.js'

export default function RegisterStudent() {
  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [branch, setBranch] = useState('')
  const [semester, setSemester] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    loadModels()
  }, [])

  function handleFile(e) {
    const selected = e.target.files[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setStatus('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return setStatus('Please choose a photo first.')

    // Normalize so "st001" and "ST001" are treated as the same ID.
    const normalizedId = studentId.trim().toUpperCase()
    if (!normalizedId) return setStatus('Please enter a Student ID.')

    setSaving(true)
    setStatus('Looking for a face in the photo...')

    const descriptor = await getSingleFaceDescriptor(imgRef.current)
    if (!descriptor) {
      setStatus('No face found. Try a clearer, front-facing photo.')
      setSaving(false)
      return
    }

    setStatus('Uploading photo...')
    const filePath = `${normalizedId}-${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(filePath, file)

    if (uploadError) {
      setStatus(`Upload failed: ${uploadError.message}`)
      setSaving(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('student-photos')
      .getPublicUrl(filePath)

    setStatus('Saving student record...')
    const { error: insertError } = await supabase.from('students').insert({
      student_id: normalizedId,
      full_name: fullName,
      department: department.trim() || null,
      branch: branch.trim() || null,
      semester: semester.trim() || null,
      photo_url: urlData.publicUrl,
      face_descriptor: descriptor,
    })

    setSaving(false)

    if (insertError) {
      setStatus(
        insertError.code === '23505'
          ? `Student ID "${normalizedId}" is already registered.`
          : `Save failed: ${insertError.message}`
      )
      return
    }

    setStatus(`Registered ${fullName} successfully.`)
    setStudentId('')
    setFullName('')
    setDepartment('')
    setBranch('')
    setSemester('')
    setFile(null)
    setPreview(null)
  }

  return (
    <div>
      <h2>Register New Student</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Student ID
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          />
        </label>

        <label>
          Full Name
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>

        <label>
          Department (optional)
          <input value={department} onChange={(e) => setDepartment(e.target.value)} />
        </label>

        <label>
          Branch (optional)
          <input value={branch} onChange={(e) => setBranch(e.target.value)} />
        </label>

        <label>
          Semester (optional)
          <input value={semester} onChange={(e) => setSemester(e.target.value)} />
        </label>

        <label>
          Photo (one clear, front-facing face)
          <input
            type="file"
            accept="image/*"
            
            onChange={handleFile}
            required
          />
        </label>

        {preview && <img ref={imgRef} src={preview} alt="preview" width="180" />}

        <button type="submit" disabled={saving}>
          {saving ? 'Registering...' : 'Register Student'}
        </button>
      </form>

      {status && <p className="status">{status}</p>}
    </div>
  )
}
