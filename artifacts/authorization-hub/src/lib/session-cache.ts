import { hashKey, type QueryClient, type QueryKey } from "@tanstack/react-query"

/** Keep the observed auth query alive so AuthGate updates without a reload. */
export async function clearSignedOutSession(client: QueryClient, authKey: QueryKey) {
  await client.cancelQueries()
  client.setQueryData(authKey, { authenticated: false })
  const authHash = hashKey(authKey)
  client.removeQueries({ predicate: (query) => query.queryHash !== authHash })
}
