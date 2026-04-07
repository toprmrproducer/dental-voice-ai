'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="mt-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl p-6" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ background: 'rgba(0,208,132,0.12)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Check your email</h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                We sent a password reset link to <strong className="text-white">{email}</strong>
              </p>
              <Link
                href="/login"
                className="text-sm font-medium transition hover:underline"
                style={{ color: '#00D084' }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                />
              </div>

              {error && (
                <div className="px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

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
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Link href="/login" className="font-medium transition hover:underline" style={{ color: '#00D084' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
