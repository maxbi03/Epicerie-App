function showProductModal(product) {
      const modal = document.getElementById('product-modal');
      const content = document.getElementById('modal-content');
      content.innerHTML = generateProductSheet(product);
      modal.classList.remove('hidden');
    }

    function closeProductModal() {
      const modal = document.getElementById('product-modal');
      modal.classList.add('hidden');
      currentProduct = null;

      productQuantity = 1;
      const qtyEl = document.getElementById('product-quantity');
      if (qtyEl) qtyEl.textContent = '1';
    }

    function increaseQuantity() {
      productQuantity++;
      document.getElementById('product-quantity').textContent = productQuantity;
    }

    function decreaseQuantity() {
      if (productQuantity > 1) {
        productQuantity--;
        document.getElementById('product-quantity').textContent = productQuantity;
      }
    }

    function addProductToBasket() {
      if (!currentProduct) return;

      let basket = JSON.parse(localStorage.getItem('user_basket') || "[]");
      for (let i = 0; i < productQuantity; i++) basket.push(currentProduct);
      localStorage.setItem('user_basket', JSON.stringify(basket));

      if (navigator.vibrate) navigator.vibrate([50, 100, 50]);

      closeProductModal();
      showConfirmation();
      updateCartDisplay();
    }

    function showConfirmation() {
      const confirmMsg = document.createElement('div');
      confirmMsg.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-primary text-forest-green font-bold px-6 py-3 rounded-full shadow-lg z-[300] flex items-center gap-2';
      confirmMsg.innerHTML = `
        <span class="material-symbols-outlined">check_circle</span>
        <span>Ajouté au panier !</span>
      `;
      document.body.appendChild(confirmMsg);
      setTimeout(() => confirmMsg.remove(), 2000);
    }

    function updateCartDisplay() {
      const basket = JSON.parse(localStorage.getItem('user_basket') || "[]");
      const cartItemCount = document.getElementById('cart-item-count');
      const cartTotal = document.getElementById('cart-total');

      let total = 0;
      basket.forEach(p => { total += Number(p.price) || 0; });

      if (cartItemCount) cartItemCount.textContent = basket.length;
      if (cartTotal) cartTotal.textContent = `${total.toFixed(2)} CHF`;
    }