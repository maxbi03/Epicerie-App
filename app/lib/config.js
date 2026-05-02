// ─── Configuration centralisée ───

// ─── Application ───
export const APP_NAME = 'EPICO';
export const APP_DESCRIPTION = "L'épicerie ouverte 24/7";
export const APP_LOGO = '/icons/logo.png?v=2'; // chemin dans /public

// ─── Informations légales ───
export const APP_ADDRESS = 'Route de Jongny 1, 1805 Jongny, VD';
export const APP_IDE     = 'CHE-XXX.XXX.XXX TVA'; // à remplacer par le numéro IDE réel
export const APP_TVA_RATE  = 0.026; // 2.6 % alimentation CH (depuis 2024)
export const APP_TVA_LABEL = '2.6%';

// ─── Tables ───
// Changer le nom de la table ici pour basculer vers une autre table
export const PRODUCTS_TABLE = 'product_list';
export const PRODUCTS_ID = 'id';
export const SALES_TABLE = 'sales';
export const NEWS_TABLE = 'news';
export const BULK_ORDERS_TABLE = 'bulk_orders';

// ─── Passerelle de paiement ───
// 'mollie' ou 'payrexx'
export const PAYMENT_GATEWAY = 'mollie';

// ─── Porte / Accès ───
export const STORE_LAT = 46.442282;
export const STORE_LNG = 6.896169;
export const DOOR_UNLOCK_RADIUS_M = 400; // en mètres
