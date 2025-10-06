import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { requestLoginCode, verifyLoginCode, setAuthToken } from "@/lib/api"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [stage, setStage] = useState<'email'|'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestLoginCode(email.trim())
      setStage('code')
    } catch (err: any) {
      setError(err?.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await verifyLoginCode(email.trim(), code.trim())
      setAuthToken(res.token)
      navigate('/members', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email to receive a verification code
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === 'email' ? (
            <form onSubmit={onSendCode}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                {error && (
                  <FieldDescription className="text-red-600">{error}</FieldDescription>
                )}
                <Field>
                  <Button type="submit" disabled={loading || !email.trim()}>
                    {loading ? 'Sending…' : 'Send Code'}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          ) : (
            <form onSubmit={onVerify}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="code">Verification Code</FieldLabel>
                  <Input
                    id="code"
                    type="text"
                    placeholder="6-digit code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Field>
                {error && (
                  <FieldDescription className="text-red-600">{error}</FieldDescription>
                )}
                <Field>
                  <Button type="submit" disabled={loading || !code.trim()}>
                    {loading ? 'Verifying…' : 'Verify'}
                  </Button>
                </Field>
                <Field>
                  <Button variant="outline" type="button" onClick={() => setStage('email')}>
                    Use a different email
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
