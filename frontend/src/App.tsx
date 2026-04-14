import ChatWindow from './components/ChatWindow'
import InputBar from './components/InputBar'
import { useChat } from './hooks/useChat'

export default function App() {
  const { messages, streaming, sendMessage } = useChat()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <header style={{
        padding: '12px 24px', borderBottom: '1px solid #e5e7eb',
        fontWeight: 600, fontSize: 16, color: '#111827',
      }}>
        AI SRE
      </header>
      <ChatWindow messages={messages} />
      <InputBar onSend={sendMessage} disabled={streaming} />
    </div>
  )
}
