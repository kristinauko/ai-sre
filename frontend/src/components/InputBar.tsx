import { useState, type KeyboardEvent } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled: boolean
}

export default function InputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const canSend = !disabled && value.trim().length > 0

  return (
    <div style={{
      borderTop: '1px solid #e5e7eb', padding: '12px 24px',
      display: 'flex', gap: 8, alignItems: 'flex-end',
    }}>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder="Ask about your cluster… (Enter to send, Shift+Enter for newline)"
        rows={2}
        style={{
          flex: 1, resize: 'none', borderRadius: 8,
          border: '1px solid #d1d5db', padding: '8px 12px',
          fontSize: 14, fontFamily: 'inherit',
          outline: 'none', lineHeight: 1.5,
        }}
      />
      <button
        onClick={submit}
        disabled={!canSend}
        style={{
          padding: '8px 18px', borderRadius: 8, border: 'none',
          background: canSend ? '#2563eb' : '#d1d5db',
          color: '#fff', fontWeight: 600, fontSize: 14,
          cursor: canSend ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s',
        }}
      >
        {disabled ? '…' : 'Send'}
      </button>
    </div>
  )
}
