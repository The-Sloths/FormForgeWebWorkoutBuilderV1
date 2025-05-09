// Adapted from shadcn/ui toast component
import { useState, useEffect, useCallback } from "react";
import type { ToastActionElement, ToastProps } from "./toast";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

interface State {
  toasts: ToasterToast[];
}

export function useToast() {
  const [state, setState] = useState<State>({ toasts: [] });

  const toast = useCallback(function ({ ...props }: Omit<ToasterToast, "id">) {
    const id = genId();
    const newToast = {
      ...props,
      id,
      open: true,
    };

    setState((prevState) => ({
      ...prevState,
      toasts: [newToast, ...(prevState.toasts || [])].slice(0, TOAST_LIMIT),
    }));

    return {
      id,
      update: (props: Partial<ToasterToast>) =>
        setState((prevState) => ({
          ...prevState,
          toasts: (prevState.toasts || []).map((t) =>
            t.id === id ? { ...t, ...props } : t,
          ),
        })),
      dismiss: () =>
        setState((prevState) => ({
          ...prevState,
          toasts: (prevState.toasts || []).map((t) =>
            t.id === id ? { ...t, open: false } : t,
          ),
        })),
    };
  }, []);

  const update = useCallback((id: string, props: Partial<ToasterToast>) => {
    setState((prevState) => ({
      ...prevState,
      toasts: (prevState.toasts || []).map((t) =>
        t.id === id ? { ...t, ...props } : t,
      ),
    }));
  }, []);

  const dismiss = useCallback((id?: string) => {
    setState((prevState) => ({
      ...prevState,
      toasts: (prevState.toasts || []).map((t) =>
        id === undefined || t.id === id ? { ...t, open: false } : t,
      ),
    }));
  }, []);

  useEffect(() => {
    const toasts = state.toasts || [];
    if (toasts.length === 0) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    toasts.forEach((toast) => {
      if (toast.open) {
        timeouts.push(
          setTimeout(() => {
            setState((prevState) => ({
              ...prevState,
              toasts: (prevState.toasts || []).map((t) =>
                t.id === toast.id ? { ...t, open: false } : t,
              ),
            }));
          }, 5000),
        );
      }

      if (!toast.open) {
        timeouts.push(
          setTimeout(() => {
            setState((prevState) => ({
              ...prevState,
              toasts: (prevState.toasts || []).filter((t) => t.id !== toast.id),
            }));
          }, TOAST_REMOVE_DELAY),
        );
      }
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [state.toasts]);

  return {
    toasts: state.toasts || [],
    toast,
    dismiss,
    update,
  };
}
