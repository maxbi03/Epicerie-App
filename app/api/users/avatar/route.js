import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    }

    // Vérifications de sécurité
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté. Utilisez JPEG, PNG ou WebP.' }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image trop grande (max 2 Mo)' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Supprimer l'ancienne photo si elle existe
    const { data: existing } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', session.userId)
      .single();

    if (existing?.avatar_url) {
      // Extraire le nom du fichier depuis l'URL
      const oldPath = existing.avatar_url.split('/avatars/')[1];
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }
    }

    // Uploader la nouvelle photo
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const filePath = `${session.userId}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // remplace si existe déjà
      });

    if (uploadError) {
      console.error('[avatar] upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Mettre à jour avatar_url dans la table users
    const { error: dbError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', session.userId);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ avatar_url: publicUrl });
  } catch (err) {
    console.error('[avatar]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: user } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', session.userId)
      .single();

    if (user?.avatar_url) {
      const oldPath = user.avatar_url.split('/avatars/')[1];
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }
    }

    await supabase
      .from('users')
      .update({ avatar_url: null })
      .eq('id', session.userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[avatar/delete]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
