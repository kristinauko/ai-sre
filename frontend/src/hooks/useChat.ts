import { useState, useCallback } from 'react'
import { client } from '../lib/client'

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts (plain HTTP over non-localhost).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  explanation: string
  command?: string
  output?: string
  outputSuccess?: boolean
  error?: string
  done: boolean
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)

  // Stable session ID for the lifetime of this page load.
  const [sessionId] = useState(() => uuid())

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = {
      id: uuid(),
      role: 'user',
      explanation: text,
      done: true,
    }

    const assistantId = uuid()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      explanation: '',
      done: false,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    try {
      const stream = client.chat({ message: text, sessionId })

      for await (const res of stream) {
        const p = res.payload
        if (!p) continue

        setMessages(prev => prev.map(m => {
          if (m.id !== assistantId) return m
          switch (p.case) {
            case 'explanation':
              return { ...m, explanation: m.explanation + p.value.text }
            case 'command':
              return { ...m, command: p.value.command }
            case 'output':
              return { ...m, output: p.value.text, outputSuccess: p.value.success }
            case 'error':
              return { ...m, error: p.value.message }
            case 'done':
              return { ...m, done: true }
            default:
              return m
          }
        }))
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, error: String(err), done: true }
          : m
      ))
    } finally {
      setStreaming(false)
    }
  }, [sessionId])

  return { messages, streaming, sendMessage }
}
