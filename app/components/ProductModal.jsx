'use client';

import { useState, useEffect } from 'react';
import { X, Minus, Plus, Store, Weight, FileText, Info, ShoppingCart } from 'lucide-react';
import { getBasket, saveBasket } from '../lib/basket';
import { BoxIcon } from 'lucide-react';
import { Box } from 'lucide-react';

export default function ProductModal({ product, onClose, onAdd }) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [product]);

  if (!product) return null;

  function addToBasket() {
    if (onAdd) {
      onAdd(product, quantity);
    } else {
      const basket = getBasket();
      for (let i = 0; i < quantity; i++) basket.push(product);
      saveBasket(basket);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-black/60 z-[60] flex items-center justify-center px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-y-auto max-h-[80vh] animate-slide-up shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/10 rounded-t-3xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Fiche produit</h2>
          <button
            onClick={onClose}
            className="size-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200 transition-colors"
          ><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {product.image && (
            <div className="w-full h-52 rounded-2xl overflow-hidden bg-white border border-gray-200 dark:border-white/10">
              <img src={product.image} className="w-full h-full object-contain" alt={product.name} />
            </div>
          )}

          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{product.name}</h3>
              {product.badge && (
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                    {product.badge}
                  </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{product.category}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Prix unitaire</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {product.price.toFixed(2)} <span className="text-sm font-bold">CHF</span>
              </p>
              {product.unit && (
                <p className="text-xs text-gray-400">/ {product.unit}</p>
              )}
            </div>
            <div className={`rounded-2xl p-4 ${
              product.stock === 0 ? 'bg-red-50 dark:bg-red-900/20'
              : product.stock <= 5 ? 'bg-amber-50 dark:bg-amber-900/20'
              : 'bg-green-50 dark:bg-green-900/20'
            }`}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Disponibilité</p>
              {product.stock === 0 ? (
                <p className="text-lg font-black text-red-500">Rupture</p>
              ) : product.stock <= 5 ? (
                <p className="text-lg font-black text-amber-500">{product.stock} restant{product.stock > 1 ? 's' : ''}</p>
              ) : (
                <p className="text-lg font-black text-green-600">{product.stock} en stock</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {(product.origin || product.quantity) && (
              <div className="grid grid-cols-2 gap-3">
                {product.origin && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <Store size={20} className="text-gray-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marque / Producteur</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{product.origin}</p>
                    </div>
                  </div>
                )}
                {product.quantity && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <Box size={20} className="text-gray-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Poids / Volume</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{product.quantity}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {product.description && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <FileText size={20} className="text-gray-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{product.description}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <Info size={14} className="inline mr-1" /> Les informations nutritionnelles détaillées seront disponibles prochainement.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-white/10 p-3 rounded-b-3xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 rounded-2xl px-4 py-2">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="size-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm font-bold text-gray-700 dark:text-white text-lg active:scale-90 transition-all"
              ><Minus size={18} /></button>
              <span className="text-lg font-black text-gray-900 dark:text-white min-w-[2ch] text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(q + 1, product.stock))}
                className="size-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm font-bold text-gray-700 dark:text-white text-lg active:scale-90 transition-all"
              ><Plus size={18} /></button>
            </div>

            <button
              onClick={addToBasket}
              disabled={product.stock === 0}
              className="flex-1 min-w-0 bg-primary text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={18} />
              {product.stock === 0 ? (
                <span className="text-sm">Indisponible</span>
              ) : (
                <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-sm">Ajouter</span>
                  <span className="text-xs font-medium opacity-70">{(product.price * quantity).toFixed(2)} CHF</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
