import * as React from "react"
import { useState } from "react"
import { Radar, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLoginMutation } from "@/hooks/use-auth"

export default function Login() {
  const [password, setPassword] = useState("")
  const login = useLoginMutation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login.mutate({ data: { password } })
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Radar className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-xl">Control Tower</CardTitle>
            <CardDescription>Sign in to continue.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Admin password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {login.isError && (
              <p className="text-sm text-destructive">
                {login.error instanceof Error ? login.error.message : "Sign-in failed."}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={login.isPending || !password}>
              {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
