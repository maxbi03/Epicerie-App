import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/adminUtils';
import { storeUploadedProductImage } from '../../../../lib/productImages';

// POST /api/admin/products/image — upload direct d'un fichier image (multipart).
// Ne modifie aucun produit : renvoie juste l'URL locale à mettre dans image_url.
export async function POST(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('image');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
  }

  try {
    const image_url = await storeUploadedProductImage(file);
    return NextResponse.json({ image_url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
