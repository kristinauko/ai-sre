import { useEffect, useRef } from 'react'
import type { Message } from '../hooks/useChat'
import MessageBubble from './MessageBubble'

interface Props {
  messages: Message[]
}

export default function ChatWindow({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '16px 24px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {messages.length === 0 && (
        <div style={{ margin: 'auto', color: '#9ca3af', fontSize: 14 }}>
          Ask anything about your Kubernetes cluster.
        </div>
      )}
      {messages.map(m => <MessageBubble key={m.id} message={m} />)}
      <div ref={bottomRef} />
    </div>
  )
}
