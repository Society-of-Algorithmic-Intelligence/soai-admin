import { LoginForm } from '@/components/login-form'

export default function Login() {
  return (
    <div className="min-h-screen bg-[#003d7b] flex flex-col items-center justify-center px-4">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <img
          src={import.meta.env.BASE_URL + 'SoAI_logo.svg'}
          alt="SoAI"
          className="h-10 brightness-0 invert"
        />
        <div className="text-center">
          <div className="text-xs font-bold tracking-[0.2em] text-white/90 uppercase mb-1">
            Administration Portal
          </div>
          <p className="text-xs text-white/45 tracking-wide">
            Society of Algorithmic Intelligence
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>

      <p className="mt-8 text-[11px] text-white/30 tracking-wide">
        Restricted access — authorized personnel only
      </p>
    </div>
  )
}
