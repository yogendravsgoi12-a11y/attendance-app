import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Subjects({ isAdmin }) {
  const [subjects, setSubjects] = useState([])
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  function loadSubjects() {
    supabase
      .from('subjects')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error) setStatus(error.message)
        else setSubjects(data)
      })
  }

  useEffect(loadSubjects, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return

    const { error } = await supabase.from('subjects').insert({ name: name.trim() })

    if (error) {
      setStatus(error.code === '23505' ? `"${name}" already exists.` : error.message)
      return
    }

    setName('')
    setStatus('')
    loadSubjects()
  }

  function startEditing(subject) {
    setEditingId(subject.id)
    setEditingName(subject.name)
  }

  async function handleRename(id) {
    if (!editingName.trim()) return

    const { error } = await supabase
      .from('subjects')
      .update({ name: editingName.trim() })
      .eq('id', id)

    if (error) {
      setStatus(error.code === '23505' ? `"${editingName}" already exists.` : error.message)
      return
    }

    setEditingId(null)
    setStatus('')
    loadSubjects()
  }

  async function handleDelete(subject) {
    if (!confirm(`Delete "${subject.name}"?`)) return

    const { error } = await supabase.from('subjects').delete().eq('id', subject.id)

    if (error) {
      setStatus(
        error.code === '23503'
          ? `Can't delete "${subject.name}" — it already has attendance records.`
          : error.message
      )
      return
    }

    setStatus('')
    loadSubjects()
  }

  return (
    <div>
      <h2>Subjects</h2>

      <form onSubmit={handleAdd}>
        <label>
          New subject name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mathematics"
          />
        </label>
        <button type="submit">Add Subject</button>
      </form>

      {status && <p className="status">{status}</p>}

      <ul className="subject-list">
        {subjects.map((s) => (
          <li key={s.id}>
            {editingId === s.id ? (
              <>
                <input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                <button onClick={() => handleRename(s.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span>{s.name}</span>
                <button onClick={() => startEditing(s)}>Rename</button>
                {isAdmin && <button onClick={() => handleDelete(s)}>Delete</button>}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
