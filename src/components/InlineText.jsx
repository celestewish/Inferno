import { useEffect, useState } from 'react'

export default function InlineText({ value, onSave, className = '', multiline = false, placeholder = '' }) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    const nextValue = draft.trim()
    if (!nextValue) {
      setDraft(value)
      return
    }
    onSave(nextValue)
  }

  const handleKeyDown = (event) => {
    if (!multiline && event.key === 'Enter') {
      event.preventDefault()
      commit()
      event.currentTarget.blur()
    }
    if (event.key === 'Escape') {
      setDraft(value)
      event.currentTarget.blur()
    }
  }

  if (multiline) {
    return (
      <textarea
        className={`inline-edit ${className}`.trim()}
        value={draft}
        placeholder={placeholder}
        aria-label={placeholder || 'Edit text'}
        rows="3"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    )
  }

  return (
    <input
      className={`inline-edit ${className}`.trim()}
      value={draft}
      placeholder={placeholder}
      aria-label={placeholder || 'Edit text'}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}
