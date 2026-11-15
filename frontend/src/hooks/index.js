'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import isEqual from 'lodash/isEqual';

/** Single controlled input: `<input {...field} />` */
export function useFormInput(initialValue = '') {
  const [value, setValue] = useState(initialValue);
  return { value, onChange: (e) => setValue(e.target.value) };
}

/** Form object whose initial values may arrive later (e.g. after a fetch). */
export function useForm(formValues = {}) {
  const prevRef = useRef(formValues);
  const [values, setValues] = useReducer((s, a) => ({ ...s, ...a }), formValues);

  useEffect(() => {
    if (!isEqual(formValues, prevRef.current)) setValues(formValues);
    prevRef.current = formValues;
  }, [formValues]);

  const handleChange = (e) => setValues({ [e.target.name]: e.target.value });

  return { values, handleChange };
}

/** Calls `onIntersect` when `target` scrolls into view (infinite scrolling). */
export function useIntersectionObserver({
  target,
  onIntersect,
  enabled = true,
  threshold = 1.0,
  rootMargin = '0px',
}) {
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    const el = target?.current;
    if (!enabled || !el) return;

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && callbackRef.current()),
      { rootMargin, threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, enabled, rootMargin, threshold]);
}
