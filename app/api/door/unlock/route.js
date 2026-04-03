import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { STORE_LAT, STORE_LNG, DOOR_UNLOCK_RADIUS_M } from '../../../lib/config';
import mqtt from 'mqtt';

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'epico/door/command';
const DOOR_SECRET = process.env.DOOR_SECRET || 'secret-de-ouf';

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function publishMQTT(message) {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(MQTT_BROKER);
    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error('MQTT timeout'));
    }, 5000);

    client.on('connect', () => {
      client.publish(MQTT_TOPIC, message, (err) => {
        clearTimeout(timeout);
        client.end();
        if (err) reject(err);
        else resolve();
      });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      client.end(true);
      reject(err);
    });
  });
}

export async function POST(request) {
  try {
    // 1. Vérifier l'authentification
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const token = auth.slice(7);
    const { data: authData, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    // 2. Vérifier phone_verified
    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from('users')
      .select('phone_verified')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile?.phone_verified) {
      return NextResponse.json({ error: 'Numéro de téléphone non vérifié' }, { status: 403 });
    }

    // 3. Vérifier la position GPS
    const { lat, lng } = await request.json();
    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'Position GPS requise' }, { status: 400 });
    }

    const distance = haversineDistance(lat, lng, STORE_LAT, STORE_LNG);
    if (distance > DOOR_UNLOCK_RADIUS_M) {
      return NextResponse.json({
        error: `Vous êtes trop loin (${Math.round(distance)}m). Rapprochez-vous de l'épicerie.`,
        distance: Math.round(distance),
      }, { status: 403 });
    }

    // 4. Envoyer la commande MQTT
    await publishMQTT(`unlock:${DOOR_SECRET}`);

    console.log(`Door unlocked by ${authData.user.email} (${Math.round(distance)}m)`);

    return NextResponse.json({ status: 'ok', distance: Math.round(distance) });
  } catch (error) {
    console.error('Door unlock error:', error);
    return NextResponse.json({ error: 'Erreur lors du déverrouillage' }, { status: 500 });
  }
}
