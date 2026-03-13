function updateCartDisplay() {
  const basket = JSON.parse(localStorage.getItem('user_basket') || "[]");
  const cartItemCount = document.getElementById('cart-item-count');
  const cartTotal = document.getElementById('cart-total');

  if (cartItemCount) {
    if (basket.length > 0) {
      cartItemCount.textContent = basket.length;
      cartItemCount.classList.remove('hidden'); // ← affiche la bulle
    } else {
      cartItemCount.classList.add('hidden');    // ← cache si vide
    }
  }

  let total = 0;
  basket.forEach(p => { total += Number(p.price) || 0; });
  if (cartTotal) cartTotal.textContent = `${total.toFixed(2)} CHF`;
}