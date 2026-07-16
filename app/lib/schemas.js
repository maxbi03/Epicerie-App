/**
 * Schémas zod centralisés pour la validation des routes API.
 * Zod valide la FORME (présence, type) — la logique métier (unicité en DB,
 * recalculs, filtrage fin par ligne) reste dans les routes, inchangée.
 *
 * Piège zod : `.min(1, 'message')` seul ne couvre QUE le cas "présent mais
 * vide" — si le champ est complètement absent du body, zod renvoie un message
 * générique anglais ("Invalid input: expected string, received undefined")
 * au lieu du message custom. Les helpers ci-dessous (`requiredString`,
 * `requiredArray`, `uuid`) passent systématiquement le message aussi sur le
 * type de base (`{ error: message }`) pour couvrir absent ET invalide.
 */
import { z } from 'zod';
import { validatePassword } from './password';
import { validatePhone } from './phone';
import { COUNTRY_CODES } from './countries';

const requiredString = (message) => z.string({ error: message }).trim().min(1, message);
const requiredArray = (itemSchema, message) => z.array(itemSchema, { error: message }).min(1, message);
const uuid = (label = 'ID') => z.string({ error: `${label} requis.` }).uuid(`${label} invalide.`);
const id = () => z.union([uuid(), z.coerce.number()]); // uuid (la plupart des tables) ou number (sales)

const passwordField = () => z.string({ error: 'Mot de passe requis.' }).superRefine((val, ctx) => {
  const error = validatePassword(val);
  if (error) ctx.addIssue({ code: 'custom', message: error });
});

const phoneField = () => z.string({ error: 'Numéro de téléphone requis.' }).superRefine((val, ctx) => {
  const error = validatePhone(val);
  if (error) ctx.addIssue({ code: 'custom', message: error });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string({ error: 'Nom requis (2 caractères minimum).' }).trim().min(2, 'Nom requis (2 caractères minimum).'),
  email: z.email('Format d\'email invalide.').max(254, 'Email trop long.'),
  phone: phoneField(),
  password: passwordField(),
  address: z.string().nullish(),
  postal_code: z.string().nullish(),
  city: z.string().nullish(),
  country: z.enum([...COUNTRY_CODES], 'Pays invalide.'),
  address_from_topo: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: requiredString('Email et mot de passe requis.'),
  password: requiredString('Email et mot de passe requis.'),
});

export const changePasswordSchema = z.object({
  currentPassword: requiredString('Champs requis manquants'),
  newPassword: passwordField(),
});

export const verifyPhoneSendSchema = z.object({
  newPhone: z.string().optional(),
});

export const verifyPhoneConfirmSchema = z.object({
  code: requiredString('Code invalide (6 chiffres attendus).').regex(/^\d{6}$/, 'Code invalide (6 chiffres attendus).'),
});

// ─── Checkout / porte ──────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  items: requiredArray(z.object({
    id: id(),
    quantity: z.coerce.number({ error: 'Quantité invalide' }).int().positive(),
  }), 'Panier vide'),
});

export const checkoutVerifySchema = z.object({
  paymentId: requiredString('Missing payment ID'),
});

export const doorUnlockSchema = z.object({
  // Pas de coerce : un lat/lng manquant ou null doit être rejeté, pas
  // silencieusement converti en 0 (Number(null) === 0).
  lat: z.number({ error: 'Position GPS requise' }),
  lng: z.number({ error: 'Position GPS requise' }),
});

// ─── Utilisateur ─────────────────────────────────────────────────────────────

export const userPatchSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().nullish(),
  postal_code: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().optional(),
  address_verified: z.union([z.boolean(), z.number()]).optional(),
});

export const deleteAccountSchema = z.object({
  password: requiredString('Mot de passe requis'),
});

// ─── Listes sauvegardées / signalements ───────────────────────────────────────

export const savedListCreateSchema = z.object({
  name: requiredString('Nom requis'),
  items: requiredArray(z.any(), 'Liste vide'),
});

export const savedListDeleteSchema = z.object({
  id: uuid(),
});

export const reportCreateSchema = z.object({
  type: z.enum(['product_missing', 'product_damaged', 'store_dirty', 'technical', 'other'], 'Type de signalement invalide'),
  description: z.string().nullish(),
  user_id: uuid().nullish(),
});

// ─── Admin — produits ──────────────────────────────────────────────────────

export const adminProductCreateSchema = z.object({
  name: z.string().nullish(),
  barcode: z.string().nullish(),
  price_chf: z.coerce.number().optional().default(0),
  quantity: z.string().nullish(),
  category: z.string().nullish(),
  image_url: z.string().nullish(),
  producer: z.string().nullish(),
  description: z.string().nullish(),
  badge: z.string().nullish(),
  stock_shelf: z.coerce.number().optional(),
  expiry_date: z.string().nullish(),
  discount_percent: z.union([z.string(), z.number()]).nullish(),
  discount_until: z.string().nullish(),
});

export const adminProductUpdateSchema = z.object({
  id: uuid(),
  _manual_toggle: z.boolean().optional(),
}).catchall(z.any()); // les champs modifiables sont filtrés par ALLOWED dans la route

export const adminProductDeleteSchema = z.object({
  id: uuid(),
});

export const adminProductStockAdjustSchema = z.object({
  type: z.literal('delivery', 'Type inconnu'),
  items: requiredArray(z.object({
    id: z.any(),
    qty: z.any(),
  }), 'Aucun article fourni'),
});

export const adminStocksBulkUpdateSchema = z.object({
  updates: requiredArray(z.object({
    id: uuid(),
    stock_shelf: z.coerce.number(),
  }), 'Liste de mises à jour requise'),
});

// ─── Admin — producteurs ───────────────────────────────────────────────────

export const adminProducerCreateSchema = z.object({
  name: requiredString('Nom, email et mot de passe requis'),
  contact_name: z.string().nullish(),
  email: z.email('Nom, email et mot de passe requis'),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  description: z.string().nullish(),
  password: requiredString('Nom, email et mot de passe requis'),
});

export const adminProducerUpdateSchema = z.object({
  id: uuid(),
  password: z.string().optional(),
}).catchall(z.any());

export const adminProducerDeleteSchema = z.object({
  id: uuid(),
});

// ─── Admin — news ──────────────────────────────────────────────────────────

export const adminNewsCreateSchema = z.object({
  category: z.string().nullish(),
  type: z.string().nullish(),
  title: requiredString('Le titre est requis'),
  subtitle: z.string().nullish(),
  content: z.string().nullish(),
  image1: z.string().nullish(),
  image2: z.string().nullish(),
  link: z.string().nullish(),
  link_name: z.string().nullish(),
});

export const adminNewsUpdateSchema = z.object({
  id: uuid(),
}).catchall(z.any());

export const adminNewsDeleteSchema = z.object({
  id: uuid(),
});

// ─── Admin — commandes groupées ────────────────────────────────────────────

export const adminBulkOrderCreateSchema = z.object({
  contact_name: requiredString('Le nom du contact est requis.'),
  contact_email: z.string().nullish(),
  contact_phone: z.string().nullish(),
  event_description: z.string().nullish(),
  event_date: z.string().nullish(),
  items: requiredArray(z.any(), 'Au moins un produit est requis.'),
  subtotal: z.coerce.number({ error: 'Montant invalide.' }),
  discount_rate: z.coerce.number().optional(),
  total: z.coerce.number({ error: 'Montant invalide.' }),
});

export const adminBulkOrderUpdateSchema = z.object({
  id: uuid(),
}).catchall(z.any());

export const adminBulkOrderDeleteSchema = z.object({
  id: uuid(),
});

// ─── Admin — signalements ──────────────────────────────────────────────────

export const adminReportUpdateSchema = z.object({
  id: uuid(),
  status: z.enum(['pending', 'resolved'], 'Paramètres invalides'),
});

export const adminReportDeleteSchema = z.object({
  id: uuid(),
});

// ─── Admin — utilisateurs / propositions producteur ────────────────────────

export const adminUserActionSchema = z.object({
  action: requiredString('Action requise'),
  userId: uuid().optional(),
});

export const adminProducerRequestUpdateSchema = z.object({
  id: uuid(),
  type: z.string().optional(),
  status: requiredString('id et status requis'),
  admin_note: z.string().nullish(),
});

// ─── Producteur ────────────────────────────────────────────────────────────

export const producerDeliveryCreateSchema = z.object({
  items: requiredArray(z.object({
    product_id: z.any(),
    quantity: z.any(),
  }), 'Articles requis'),
  notes: z.string().nullish(),
});

export const producerInvoiceCreateSchema = z.object({
  delivery_id: uuid().nullish(),
  items: requiredArray(z.object({
    quantity: z.any(),
    price_unit: z.any(),
  }), 'Articles requis'),
  notes: z.string().nullish(),
});

export const producerInvoiceUpdateSchema = z.object({
  id: uuid(),
  status: z.enum(['draft', 'sent'], 'Statut invalide'),
});

export const producerProposalCreateSchema = z.object({
  type: z.enum(['new_product', 'price_change'], 'Type invalide (new_product ou price_change)'),
  product_id: z.string().nullish(),
  data: z.record(z.string(), z.any()).refine((d) => Object.keys(d).length > 0, 'Données requises'),
});
