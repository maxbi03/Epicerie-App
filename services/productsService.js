// productsService.js
import { supabase } from './supabaseClient.js';

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products_with_stock')   // 👈 on lit la VIEW
    .select(`
      id,
      name,
      category,
      producer,
      description,
      price_chf,
      image_url,
      stock_shelf,
      stock_back,
      stock_total
    `)
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    producer: p.producer,
    description: p.description ?? '',
    price: Number(p.price_chf),
    image: p.image_url ?? '',
    stockShelf: p.stock_shelf ?? 0,
    stockBack: p.stock_back ?? 0,
    stock: p.stock_total ?? 0  // 👈 IMPORTANT
  }));
}