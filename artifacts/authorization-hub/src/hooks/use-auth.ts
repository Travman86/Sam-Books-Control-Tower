import { useQueryClient } from "@tanstack/react-query"
import { useGetAuthStatus, useLogin, useLogout, getGetAuthStatusQueryKey } from "@workspace/api-client-react"

/** Single-admin session — see artifacts/api-server/src/routes/auth.ts. */
export function useAuthStatus() {
  return useGetAuthStatus()
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  return useLogin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() })
      },
    },
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  return useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() })
        queryClient.clear()
      },
    },
  })
}
