// src/hooks/useToast.js
import { useState, useCallback } from 'react'

let nextId = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type = 'info', duration = 3500) => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  return { toasts, toast }
}
