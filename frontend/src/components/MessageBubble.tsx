import type { Message } from '../hooks/useChat'

interface Props {
  message: Message
}

export default function MessageBubble({ message }: Props) {
  if (message.role === 'user') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '70%' }}>
        <div style={{
          background: '#2563eb', color: '#fff',
          borderRadius: '16px 16px 4px 16px',
          padding: '10px 14px', fontSize: 14,
        }}>
          {message.explanation}
        </div>
      </div>
    )
  }

  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Explanation text */}
      {(message.explanation || !message.done) && (
        <div style={{
          background: '#f3f4f6', borderRadius: '4px 16px 16px 16px',
          padding: '10px 14px', fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5,
        }}>
          {message.explanation}
          {!message.done && !message.error && (
            <span style={{ opacity: 0.4 }}> ▋</span>
          )}
        </div>
      )}

      {/* kubectl command */}
      {message.command && (
        <code style={{
          display: 'block', background: '#1e1e2e', color: '#cdd6f4',
          borderRadius: 8, padding: '8px 12px',
          fontSize: 13, fontFamily: 'monospace',
        }}>
          $ {message.command}
        </code>
      )}

      {/* kubectl output */}
      {message.output !== undefined && (
        <div>
          <pre style={{
            background: '#0f172a', color: '#94a3b8',
            borderRadius: 8, padding: '8px 12px',
            fontSize: 12, fontFamily: 'monospace',
            overflowX: 'auto', maxHeight: 300, overflowY: 'auto', margin: 0,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {message.output || '(no output)'}
          </pre>
          <span style={{
            display: 'inline-block', marginTop: 4,
            fontSize: 12, fontWeight: 600,
            color: message.outputSuccess ? '#16a34a' : '#dc2626',
          }}>
            {message.outputSuccess ? '✓ success' : '✗ failed'}
          </span>
        </div>
      )}

      {/* Error */}
      {message.error && (
        <div style={{
          background: '#fef2f2', color: '#dc2626',
          borderRadius: 8, padding: '8px 12px', fontSize: 13,
        }}>
          {message.error}
        </div>
      )}
    </div>
  )
}
