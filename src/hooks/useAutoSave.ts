import { useEffect, useRef } from 'react';
import { useResumeStore } from './useResumeStore';

const STORAGE_KEY = 'resume-editor-data';

export function useAutoSave() {
  const data = useResumeStore((s) => s.data);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, 500);
    return () => clearTimeout(timer.current);
  }, [data]);
}
