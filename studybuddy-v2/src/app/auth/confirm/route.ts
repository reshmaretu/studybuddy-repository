import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/' // Default to home or account

    if (token_hash && type) {
        const supabase = await createClient()

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            // Force the redirect to the intended 'next' destination
            const url = new URL(next, request.url)
            return NextResponse.redirect(url)
        }
    }

    // If verification fails, redirect to error page
    return NextResponse.redirect(new URL('/auth/auth-error', request.url))
}