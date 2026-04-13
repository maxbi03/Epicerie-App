// ─── Configuration centralisée ───

// ─── Application ───
export const APP_NAME = 'EPICO';
export const APP_DESCRIPTION = "L'épicerie ouverte 24/7";
export const APP_LOGO = '/icons/logo.png'; // chemin dans /public

// ─── Tables ───
// Changer le nom de la table ici pour basculer vers une autre table
export const PRODUCTS_TABLE = 'product_list';
export const PRODUCTS_ID = 'id';
export const SALES_TABLE = 'sales';
export const NEWS_TABLE = 'news';

// ─── Passerelle de paiement ───
// 'mollie' ou 'payrexx'
export const PAYMENT_GATEWAY = 'mollie';

// ─── Porte / Accès ───
export const STORE_LAT = 46.442282;
export const STORE_LNG = 6.896169;
export const DOOR_UNLOCK_RADIUS_M = 400; // en mètres
