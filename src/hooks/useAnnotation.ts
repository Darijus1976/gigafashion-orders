import { useState, useCallback } from 'react'

interface HistoryState {
  json: string
  timestamp: number
}

interface UseAnnotationReturn {
  // History
  history: HistoryState[]
  currentIndex: number
  
  // Actions
  saveState: (canvasJson: string) => void
  undo: () => HistoryState | null
  redo: () => HistoryState | null
  clearHistory: () => void
  
  // Status
  canUndo: boolean
  canRedo: boolean
  historyLength: number
}

const MAX_HISTORY_SIZE = 20

export function useAnnotation(): UseAnnotationReturn {
  const [history, setHistory] = useState<HistoryState[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  
  // Save current canvas state to history
  const saveState = useCallback((canvasJson: string) => {
    setHistory((prev: HistoryState[]) => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1)
      
      // Add new state
      const newState: HistoryState = {
        json: canvasJson,
        timestamp: Date.now(),
      }
      
      newHistory.push(newState)
      
      // Keep only last MAX_HISTORY_SIZE states
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift()
      }
      
      return newHistory
    })
    
    // Update current index
    setCurrentIndex((prev: number) => {
      const newIndex = Math.min(prev + 1, MAX_HISTORY_SIZE - 1)
      return newIndex
    })
  }, [currentIndex])
  
  // Undo - go back one step
  const undo = useCallback((): HistoryState | null => {
    if (currentIndex <= 0) {
      return null
    }
    
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    return history[newIndex] || null
  }, [currentIndex, history])
  
  // Redo - go forward one step
  const redo = useCallback((): HistoryState | null => {
    if (currentIndex >= history.length - 1) {
      return null
    }
    
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    return history[newIndex] || null
  }, [currentIndex, history])
  
  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
  }, [])
  
  // Calculate status
  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1
  const historyLength = history.length
  
  return {
    history,
    currentIndex,
    saveState,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    historyLength,
  }
}
