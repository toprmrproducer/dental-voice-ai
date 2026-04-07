'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface FormData {
  fullName: string
  email: string
  clinicName: string
  password: string
  confirmPassword: string
}

interface FieldErrors {
  fullName?: string
  email?: string
  clinicName?: string
  password?: string
  confirmPassword?: string
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<FormData>({
    fullName: '',
    email: '',
    clinicName: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))

    // Real-time validation
    const errs: FieldErrors = { ...fieldErrors }
    if (field === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errs.email = 'Please enter a valid email'
      } else {
        delete errs.email
      }
    }
    if (field === 'password') {
      if (value && value.length < 8) {
        errs.password = 'Password must be at least 8 characters'
      } else {
        delete errs.password
      }
      if (form.confirmPassword && value !== form.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match'
      } else {
        delete errs.confirmPassword
      }
    }
    if (field === 'confirmPassword') {
      if (value && value !== form.password) {
        errs.confirmPassword = 'Passwords do not match'
      } else {
        delete errs.confirmPassword
      }
    }
    setFieldErrors(errs)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate all fields
    const errs: FieldErrors = {}
    if (!form.fullName.trim()) errs.fullName = 'Full name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email'
    if (!form.clinicName.trim()) errs.clinicName = 'Clinic name is required'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setLoading(true)

    // 1. Create Supabase auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          clinic_name: form.clinicName,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // 2. Create clinic record in backend
    if (data.session?.access_token) {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
        await fetch(`${backendUrl}/api/clinics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            owner_id: data.user?.id,
            clinic_name: form.clinicName,
            owner_name: form.fullName,
            email: form.email,
          }),
        })
      } catch {
        // Backend may not be running yet — user can set up clinic later
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  const inputStyle = {
    background: '#1A1A1A',
    border: '1px solid rgba(255,255,255,0.1)',
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-md px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={{ background: 'rgba(0,208,132,0.12)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="mt-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Set up your clinic in minutes
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl p-6" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Dr. Jane Smith"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                style={inputStyle}
              />
              {fieldErrors.fullName && (
                <p className="text-xs mt-1" style={{ color: '#f87171' }}>{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="jane@clinic.com"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                style={inputStyle}
              />
              {fieldErrors.email && (
                <p className="text-xs mt-1" style={{ color: '#f87171' }}>{fieldErrors.email}</p>
              )}
            </div>

            {/* Clinic Name */}
            <div>
              <label htmlFor="clinicName" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Clinic Name
              </label>
              <input
                id="clinicName"
                type="text"
                required
                value={form.clinicName}
                onChange={(e) => updateField('clinicName', e.target.value)}
                placeholder="Bright Smile Dental"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                style={inputStyle}
              />
              {fieldErrors.clinicName && (
                <p className="text-xs mt-1" style={{ color: '#f87171' }}>{fieldErrors.clinicName}</p>
              )}
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
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                  style={inputStyle}
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
              {fieldErrors.password && (
                <p className="text-xs mt-1" style={{ color: '#f87171' }}>{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition"
                style={inputStyle}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs mt-1" style={{ color: '#f87171' }}>{fieldErrors.confirmPassword}</p>
              )}
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
                'Create Account'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-medium transition hover:underline" style={{ color: '#00D084' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
