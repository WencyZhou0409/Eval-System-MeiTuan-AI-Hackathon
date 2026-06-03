export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export async function fetchInstructions() {
  const res = await fetch(`${API_BASE}/instructions`)
  return res.json()
}

export async function parseInstruction(text, id) {
  const res = await fetch(`${API_BASE}/instructions/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, id }),
  })
  return res.json()
}

export async function startEvaluation(config) {
  const res = await fetch(`${API_BASE}/evaluation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return res.json()
}

export async function getEvalStatus(taskId) {
  const res = await fetch(`${API_BASE}/evaluation/${taskId}/status`)
  return res.json()
}

export async function getEvalResult(taskId) {
  const res = await fetch(`${API_BASE}/evaluation/${taskId}/result`)
  return res.json()
}

export async function cancelEvaluation(taskId) {
  const res = await fetch(`${API_BASE}/evaluation/${taskId}/cancel`, {
    method: 'POST',
  })
  return res.json()
}

export async function fetchReports() {
  const res = await fetch(`${API_BASE}/reports`)
  return res.json()
}

export async function fetchReport(reportId) {
  const res = await fetch(`${API_BASE}/reports/${reportId}`)
  return res.json()
}
