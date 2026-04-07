'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={{ background: 'rgba(0,208,132,0.12)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            Dental Voice AI
          </h1>
          <p className="mt-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Sign in to your clinic dashboard
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl p-6" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                style={{
                  background: '#1A1A1A',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(0,208,132,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                  style={{
                    background: '#1A1A1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(0,208,132,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                  style={{ accentColor: '#00D084' }}
                />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs transition hover:underline"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              style={{ background: '#00D084', color: '#000' }}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="w-full h-11 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2.5"
            style={{
              background: '#161616',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium transition hover:underline" style={{ color: '#00D084' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
