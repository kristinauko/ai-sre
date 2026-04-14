import { useState, useCallback } from 'react'
import { client } from '../lib/client'

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
  const [sessionId] = useState(() => crypto.randomUUID())

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      explanation: text,
      done: true,
    }

    const assistantId = crypto.randomUUID()
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
