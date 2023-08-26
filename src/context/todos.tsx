"use client"

import {
  addTodo,
  completeTodo,
  deleteTodo,
  resetTimer,
  undoCompleteTodo,
} from "@/actions/todo"
import { Todo } from "@prisma/client"
import {
  ReactNode,
  createContext,
  experimental_useOptimistic as useOptimistic,
  useContext,
  MouseEvent,
  useMemo,
  useCallback,
} from "react"

interface TodosContext {
  items: Todo[]
  add: (data: FormData) => void
  complete: (event: MouseEvent<HTMLButtonElement>) => void
  undoComplete: (id: string) => void
  remove: (id: string) => void
  reset: (id: string) => void
}

const todosContext = createContext<TodosContext | undefined>(undefined)

interface Action {
  type: string
  payload: any
}

function reducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case "add_todo":
      return [...state, action.payload]
    case "complete_todo":
      return state.map((item) => {
        if (item.id === action.payload.id) {
          item.completedAt = new Date()
        }

        return item
      })
    case "undo_complete_todo":
      return state.map((item) => {
        if (item.id === action.payload.id) {
          item.completedAt = null
        }

        return item
      })
    case "delete_todo":
      return state.filter(({ id }) => id !== action.payload.id)
    case "reset_timer":
      return state.map((item) => {
        if (item.id === action.payload.id) {
          item.createdAt = new Date()
        }

        return item
      })
  }

  throw Error("Unknown action.")
}

interface Props {
  children: ReactNode
  initialItems: Todo[]
}

export const TodosProvider = ({ children, initialItems }: Props) => {
  const [items, addOptimisticItems] = useOptimistic(initialItems, reducer)

  const add = useCallback(
    async (data: FormData) => {
      try {
        addOptimisticItems({
          type: "add_todo",
          payload: {
            id: crypto.randomUUID(),
            text: data.get("text"),
            createdAt: new Date(),
          },
        })
        await addTodo(data)
      } catch {}
    },
    [addOptimisticItems]
  )

  const complete = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      const id = event.currentTarget.value

      try {
        addOptimisticItems({
          type: "complete_todo",
          payload: { id },
        })
        await completeTodo(id)
      } catch {}
    },
    [addOptimisticItems]
  )

  const undoComplete = useCallback(
    async (id: string) => {
      try {
        addOptimisticItems({
          type: "undo_complete_todo",
          payload: { id },
        })
        await undoCompleteTodo(id)
      } catch {}
    },
    [addOptimisticItems]
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        addOptimisticItems({
          type: "delete_todo",
          payload: { id },
        })
        await deleteTodo(id)
      } catch {}
    },
    [addOptimisticItems]
  )

  const reset = useCallback(
    async (id: string) => {
      try {
        addOptimisticItems({
          type: "reset_timer",
          payload: { id },
        })
        await resetTimer(id)
      } catch {}
    },
    [addOptimisticItems]
  )

  const value = useMemo(
    () => ({
      items,
      add,
      complete,
      undoComplete,
      remove,
      reset,
    }),
    [add, complete, items, remove, reset, undoComplete]
  )

  return <todosContext.Provider value={value}>{children}</todosContext.Provider>
}

export const useTodos = () => {
  const context = useContext(todosContext)

  if (typeof context === "undefined") {
    throw new Error("Context should be used within provider")
  }

  return context
}
