import assert from "node:assert/strict"
import test from "node:test"
import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { clearSignedOutSession } from "../src/lib/session-cache.ts"

test("sign-out immediately updates auth observers and removes private cached data", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const authKey = ["/api/auth/status"]
  client.setQueryData(authKey, { authenticated: true })
  client.setQueryData(["/api/sam-books/monitoring"], { private: true })
  client.setQueryData(["/api/management-actions"], [{ private: true }])
  const observed = []
  const observer = new QueryObserver(client, { queryKey: authKey, enabled: false })
  const unsubscribe = observer.subscribe((state) => observed.push(state.data?.authenticated))
  await clearSignedOutSession(client, authKey)
  assert.deepEqual(client.getQueryData(authKey), { authenticated: false })
  assert.equal(observed.at(-1), false)
  assert.equal(client.getQueryData(["/api/sam-books/monitoring"]), undefined)
  assert.equal(client.getQueryData(["/api/management-actions"]), undefined)
  assert.equal(client.getQueryCache().getAll().length, 1)
  unsubscribe()
  client.clear()
})

test("an in-flight authenticated read cannot repopulate the cache after sign-out", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const authKey = ["/api/auth/status"]
  client.setQueryData(authKey, { authenticated: true })
  let aborted = false
  const pending = client.fetchQuery({
    queryKey: ["/api/private-read"],
    queryFn: ({ signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => { aborted = true; reject(new Error("aborted")) })
    }),
  }).catch(() => undefined)
  await clearSignedOutSession(client, authKey)
  await pending
  assert.equal(aborted, true)
  assert.equal(client.getQueryData(["/api/private-read"]), undefined)
  assert.equal(client.getQueryData(authKey).authenticated, false)
  client.clear()
})
