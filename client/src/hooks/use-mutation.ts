import { useRef, useState } from 'react'
import { ApiHttpError, fieldErrors } from '@/lib/api-client'
import { generateIdempotencyKey } from '@/lib/idempotency'

/** One logical stock mutation retains its payload/key until a confirmed result. */
export function useMutation() {
  const busy = useRef(false)
  const attempt = useRef<{ payload: string; key: string } | null>(null)
  const [pending, setPending] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function run<T>(
    payload: unknown,
    action: (key: string) => Promise<T>,
    idempotent = false,
  ): Promise<T | null> {
    if (busy.current) return null
    const serialized = JSON.stringify(payload)
    if (uncertain && attempt.current?.payload !== serialized) {
      setErrors({ form: 'Resolve the previous request by retrying before changing this operation.' })
      return null
    }
    if (!attempt.current || attempt.current.payload !== serialized) {
      attempt.current = { payload: serialized, key: generateIdempotencyKey() }
    }
    busy.current = true
    setPending(true)
    setErrors({})
    try {
      const result = await action(attempt.current.key)
      attempt.current = null
      setUncertain(false)
      return result
    } catch (error) {
      const ambiguous = !(error instanceof ApiHttpError) || error.status >= 500
      setUncertain(idempotent && ambiguous)
      setErrors({
        ...fieldErrors(error),
        ...(idempotent && ambiguous ? {
          form: 'Confirmation was lost. The operation may have succeeded. Retry unchanged to retrieve its result safely.',
        } : {}),
      })
      return null
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return { run, pending, uncertain, errors, setErrors, locked: pending || uncertain }
}
