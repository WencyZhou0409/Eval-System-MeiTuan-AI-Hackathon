import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { cancelEvaluation, API_BASE } from '../api/client'

const EvalContext = createContext(null)

export function EvalProvider({ children }) {
  const [taskId, setTaskId] = useState(() => localStorage.getItem('eval_task_id') || null)
  const [status, setStatus] = useState(() => {
    const saved = localStorage.getItem('eval_status')
    return saved ? JSON.parse(saved) : null
  })
  const [events, setEvents] = useState([])
  const [liveTurns, setLiveTurns] = useState([])
  const [personaCount, setPersonaCount] = useState(1)
  // 多画像时按画像分组：{ [persona]: Turn[] }
  const [turnsByPersona, setTurnsByPersona] = useState({})
  // 各画像当前状态：{ [persona]: 'running' | 'evaluating' | 'done' }
  const [personaStatus, setPersonaStatus] = useState({})
  const eventSourceRef = useRef(null)

  // 保存到 localStorage
  useEffect(() => {
    if (taskId) localStorage.setItem('eval_task_id', taskId)
    else localStorage.removeItem('eval_task_id')
  }, [taskId])

  useEffect(() => {
    if (status) localStorage.setItem('eval_status', JSON.stringify(status))
    else localStorage.removeItem('eval_status')
  }, [status])

  // SSE 订阅
  useEffect(() => {
    if (!taskId || status?.type === 'completed' || status?.type === 'failed') return

    const es = new EventSource(`${API_BASE}/evaluation/${taskId}/stream`)
    eventSourceRef.current = es

    es.onmessage = (e) => {
      const event = JSON.parse(e.data)
      if (event.type === 'heartbeat') return

      setEvents(prev => [...prev, event])

      if (event.type === 'init') {
        setPersonaCount(event.personas?.length || 1)
      }

      if (event.type === 'turn') {
        setLiveTurns(prev => [...prev, event])
        setTurnsByPersona(prev => ({
          ...prev,
          [event.persona]: [...(prev[event.persona] || []), event],
        }))
      }

      if (event.type === 'persona_start') {
        const p = event.persona
        setPersonaStatus(prev => ({ ...prev, [p]: 'running' }))
        // 单画像时清空平铺列表
        if (event.total <= 1) setLiveTurns([])
      }

      if (event.type === 'eval_start') {
        setPersonaStatus(prev => ({ ...prev, [event.persona]: 'evaluating' }))
      }

      if (event.type === 'eval_done') {
        setPersonaStatus(prev => ({ ...prev, [event.persona]: 'done' }))
      }

      setStatus(event)

      if (event.type === 'completed' || event.type === 'failed' || event.type === 'cancelled') {
        es.close()
        if (event.type === 'completed') {
          localStorage.removeItem('eval_task_id')
        }
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => es.close()
  }, [taskId])

  const startEval = (id) => {
    setTaskId(id)
    setStatus({ type: 'init' })
    setEvents([])
    setLiveTurns([])
    setPersonaCount(1)
    setTurnsByPersona({})
    setPersonaStatus({})
  }

  const cancelEval = async () => {
    if (taskId) {
      try { await cancelEvaluation(taskId) } catch (_) {}
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setTaskId(null)
    setStatus(null)
    setEvents([])
    setLiveTurns([])
    setTurnsByPersona({})
    setPersonaStatus({})
    localStorage.removeItem('eval_task_id')
    localStorage.removeItem('eval_status')
  }

  const clearEval = () => {
    setTaskId(null)
    setStatus(null)
    setEvents([])
    setLiveTurns([])
    setTurnsByPersona({})
    setPersonaStatus({})
    localStorage.removeItem('eval_task_id')
    localStorage.removeItem('eval_status')
  }

  return (
    <EvalContext.Provider value={{ taskId, status, events, liveTurns, personaCount, turnsByPersona, personaStatus, startEval, clearEval, cancelEval }}>
      {children}
    </EvalContext.Provider>
  )
}

export function useEval() {
  return useContext(EvalContext)
}
