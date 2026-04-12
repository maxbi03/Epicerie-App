import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { getSession } from '../../../lib/auth';
import { STORE_LAT, STORE_LNG, DOOR_UNLOCK_RADIUS_M } from '../../../lib/config';
import mqtt from 'mqtt';

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'epico/door/command';
const MQTT_STATUS_TOPIC = process.env.MQTT_STATUS_TOPIC || 'epico/door/status';
const DOOR_SECRET = process.env.DOOR_SECRET || 'secret-de-ouf';
const DOOR_CONFIRM_TIMEOUT = 10000; // 10s max pour attendre la confirmation ESP32

async function logTraffic(user, name, success) {
  try {
    const { error } = await getSupabaseAdmin()
      .from('traffic')
      .insert({ user_id: user, user_name: name, success });
    if (error) console.error('Failed to log traffic:', error);
  } catch (err) {
    console.error('Failed to log traffic:', err);
  }
}

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

function unlockDoorWithConfirmation() {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(MQTT_BROKER);
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        client.end(true);
        reject(new Error('Erreur lors de la communication avec le système de la porte. Veuillez réessayer.'));
      }
    }, DOOR_CONFIRM_TIMEOUT);

    client.on('connect', () => {
      // 1. S'abonner au topic status pour écouter la confirmation
      client.subscribe(MQTT_STATUS_TOPIC, (err) => {
        if (err) {
          clearTimeout(timeout);
          settled = true;
          client.end(true);
          return reject(new Error('Erreur abonnement MQTT status'));
        }

        // 2. Publier la commande d'ouverture
        client.publish(MQTT_TOPIC, `unlock:${DOOR_SECRET}`, (pubErr) => {
          if (pubErr) {
            clearTimeout(timeout);
            settled = true;
            client.end(true);
            return reject(pubErr);
          }
          // Maintenant on attend la réponse de l'ESP32 sur le topic status...
        });
      });
    });

    // 3. Écouter les messages sur le topic status
    client.on('message', (topic, message) => {
      if (topic === MQTT_STATUS_TOPIC && !settled) {
        const msg = message.toString();
        try {
          const data = JSON.parse(msg);
          if (data.status === 'open') {
            // L'ESP32 confirme que la porte est ouverte
            settled = true;
            clearTimeout(timeout);
            client.end();
            resolve({ confirmed: true });
          } else if (data.status === 'error') {
            settled = true;
            clearTimeout(timeout);
            client.end();
            reject(new Error('ESP32 a signalé une erreur'));
          }
        } catch {
          // Message non-JSON, vérifier en texte brut
          if (msg === 'unlocked' || msg.includes('open')) {
            settled = true;
            clearTimeout(timeout);
            client.end();
            resolve({ confirmed: true });
          }
        }
      }
    });

    client.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        client.end(true);
        reject(err);
      }
    });
  });
}

export async function POST(request) {
  try {
    // 1. Vérifier l'authentification via cookie JWT
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 2. Vérifier phone_verified et récupérer le nom
    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from('users')
      .select('phone_verified, name')
      .eq('id', session.userId)
      .single();

    const userName = profile?.name || session.email;

    if (profileError || !profile?.phone_verified) {
      await logTraffic(session.userId, userName, false);
      return NextResponse.json({ error: 'Numéro de téléphone non vérifié' }, { status: 403 });
    }

    // 3. Vérifier la position GPS
    const { lat, lng } = await request.json();
    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'Position GPS requise' }, { status: 400 });
    }

    const distance = haversineDistance(lat, lng, STORE_LAT, STORE_LNG);
    if (distance > DOOR_UNLOCK_RADIUS_M) {
      await logTraffic(session.userId, userName, false);
      return NextResponse.json({
        error: `Vous êtes trop loin (${Math.round(distance)}m). Rapprochez-vous de l'épicerie.`,
        distance: Math.round(distance),
      }, { status: 403 });
    }

    // 4. Envoyer la commande MQTT et attendre la confirmation de l'ESP32
    let success = false;
    try {
      const result = await unlockDoorWithConfirmation();
      success = result.confirmed;
    } catch (mqttError) {
      console.error('MQTT error:', mqttError.message);
      await logTraffic(session.userId, userName, false);
      return NextResponse.json({ error: mqttError.message || 'Erreur MQTT' }, { status: 500 });
    }

    // Log en fire-and-forget pour ne pas bloquer la réponse
    logTraffic(session.userId, userName, success);
    console.log(`Door unlocked (confirmed by ESP32) by ${session.email} (${Math.round(distance)}m)`);

    return NextResponse.json({ status: 'ok', confirmed: success, distance: Math.round(distance) });
  } catch (error) {
    console.error('Door unlock error:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors du déverrouillage' }, { status: 500 });
  }
}
