import { NextResponse } from 'next/server';
import { getSession, verifyToken, OTP_COOKIE } from '../../../../lib/auth';
import { getSupabaseAdmin } from '../../../../lib/supabaseServer';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 });
    }

    // Lire et vérifier le cookie OTP
    const cookieStore = await cookies();
    const otpToken = cookieStore.get(OTP_COOKIE)?.value;

    if (!otpToken) {
      return NextResponse.json(
        { error: 'Code expiré ou introuvable. Renvoyez un nouveau code.' },
        { status: 400 }
      );
    }

    const payload = await verifyToken(otpToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Code expiré. Renvoyez un nouveau code.' },
        { status: 400 }
      );
    }

    // Vérifier que le code correspond et appartient au bon utilisateur
    if (payload.userId !== session.userId) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
    }

    if (String(payload.code) !== String(code).trim()) {
      return NextResponse.json({ error: 'Code incorrect' }, { status: 400 });
    }

    // Marquer le téléphone comme vérifié
    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ phone_verified: true })
      .eq('id', session.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Supprimer le cookie OTP
    const response = NextResponse.json({ ok: true });
    response.cookies.set(OTP_COOKIE, '', { maxAge: 0, path: '/' });

    return response;
  } catch (err) {
    console.error('[verify-phone/confirm]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
