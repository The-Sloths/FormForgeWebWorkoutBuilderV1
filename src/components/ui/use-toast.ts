// Adapted from shadcn/ui toast component
// @ts-nocheck
import { useState, useEffect, useCallback } from "react"
import type { ToastActionElement, ToastProps } from "./toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

function toastReducer(state: State, action: Action): State {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId || action.toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

export function useToast() {
  const [state, dispatch] = useState<State>({ toasts: [] })

  const toast = useCallback(
    function ({ ...props }: Omit<ToasterToast, "id">) {
      const id = genId()

      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: {
          ...props,
          id,
          open: true,
        },
      })

      return {
        id,
        update: (props: ToasterToast) =>
          dispatch({
            type: actionTypes.UPDATE_TOAST,
            toast: { ...props, id },
          }),
        dismiss: () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id }),
      }
    },
    [dispatch]
  )

  const update = useCallback(
    (id: string, props: Partial<ToasterToast>) => {
      dispatch({
        type: actionTypes.UPDATE_TOAST,
        toast: { ...props, id },
      })
    },
    [dispatch]
  )

  const dismiss = useCallback(
    (id?: string) => {
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })
    },
    [dispatch]
  )

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = []

    state.toasts.forEach((toast) => {
      if (toast.open) {
        timeouts.push(
          setTimeout(() => {
            dispatch({
              type: actionTypes.DISMISS_TOAST,
              toastId: toast.id,
            })
          }, 5000)
        )
      }

      if (!toast.open && !(toast as any).unmountOnHide) {
        timeouts.push(
          setTimeout(() => {
            dispatch({
              type: actionTypes.REMOVE_TOAST,
              toastId: toast.id,
            })
          }, TOAST_REMOVE_DELAY)
        )
      }
    })

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout))
    }
  }, [state.toasts, dispatch])

  return {
    toasts: state.toasts,
    toast,
    dismiss,
    update,
  }
}