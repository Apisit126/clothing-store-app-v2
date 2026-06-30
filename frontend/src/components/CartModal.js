import { getCartTotal, getItemPrice } from '../utils/cart';

const formatPrice = (price) => {
    const value = Number(price) || 0;
    return value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

function CartModal({ cart, setCart, onClose, onCheckout, onConfirm }) {
    const cartTotal = getCartTotal(cart);
    const cartCount = cart.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);

    const isSameCartItem = (cartItem, item) => (
        cartItem.id === item.id
        && (cartItem.selected_size || '') === (item.selected_size || '')
        && (cartItem.selected_color || '') === (item.selected_color || '')
    );

    const confirmAction = async (message) => {
        if (onConfirm) return onConfirm(message);
        return window.confirm(message);
    };

    const decreaseQty = async (item) => {
        if (item.qty <= 1) {
            if (await confirmAction(`ลบ ${item.name} ออกจากตะกร้า?`)) {
                setCart(cart.filter((cartItem) => !isSameCartItem(cartItem, item)));
            }
            return;
        }

        setCart(cart.map((cartItem) => (
            isSameCartItem(cartItem, item) ? { ...cartItem, qty: cartItem.qty - 1 } : cartItem
        )));
    };

    const increaseQty = (item) => {
        if (item.stock && item.qty >= item.stock) {
            alert(`สินค้าในคลังมีเพียง ${item.stock} ชิ้น`);
            return;
        }

        setCart(cart.map((cartItem) => (
            isSameCartItem(cartItem, item) ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem
        )));
    };

    const removeItem = async (item) => {
        if (await confirmAction(`ลบ ${item.name} ออกจากตะกร้า?`)) {
            setCart(cart.filter((cartItem) => !isSameCartItem(cartItem, item)));
        }
    };

    const handleImageError = (event) => {
        event.currentTarget.style.display = 'none';
        event.currentTarget.parentElement.classList.add('is-empty');
    };

    return (
        <div className="cart-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cart-modal-title">
            <div className="cart-modal-dialog">
                <div className="cart-modal-panel">
                    <header className="cart-modal-header">
                        <div>
                            <span className="cart-modal-eyebrow">Shopping Bag</span>
                            <h2 id="cart-modal-title">ตะกร้าสินค้า</h2>
                        </div>
                        <div className="cart-header-actions">
                            <span className="cart-count-badge">{cartCount} ชิ้น</span>
                            <button type="button" className="cart-close-button" onClick={onClose} aria-label="ปิดตะกร้าสินค้า">
                                &times;
                            </button>
                        </div>
                    </header>

                    <div className="cart-modal-body">
                        {cart.length === 0 ? (
                            <div className="cart-empty-state">
                                <div className="cart-empty-icon">0</div>
                                <strong>ตะกร้าว่างเปล่า</strong>
                                <span>เลือกสินค้าเข้าตะกร้าก่อน แล้วกลับมาชำระเงินได้ทันที</span>
                            </div>
                        ) : (
                            <div className="cart-item-list">
                                {cart.map((item) => {
                                    const price = getItemPrice(item);
                                    const itemTotal = price * item.qty;
                                    const detailText = [
                                        item.selected_size ? `ไซซ์ ${item.selected_size}` : '',
                                        item.selected_color ? `สี ${item.selected_color}` : '',
                                    ].filter(Boolean).join(' / ');

                                    return (
                                        <article className="cart-item-card" key={`${item.id}-${item.selected_size || 'none'}-${item.selected_color || 'none'}`}>
                                            <div className="cart-item-image">
                                                {item.image_url && (
                                                    <img src={item.image_url} alt={item.name} onError={handleImageError} />
                                                )}
                                                <span>{item.name?.charAt(0) || 'C'}</span>
                                            </div>

                                            <div className="cart-item-info">
                                                <div>
                                                    <h3>{item.name}</h3>
                                                    {detailText && <p>{detailText}</p>}
                                                </div>
                                                <span className="cart-unit-price">฿{formatPrice(price)} / ชิ้น</span>
                                            </div>

                                            <div className="cart-quantity-control" aria-label={`จำนวน ${item.name}`}>
                                                <button type="button" onClick={() => decreaseQty(item)} aria-label={`ลดจำนวน ${item.name}`}>
                                                    -
                                                </button>
                                                <span>{item.qty}</span>
                                                <button type="button" onClick={() => increaseQty(item)} aria-label={`เพิ่มจำนวน ${item.name}`}>
                                                    +
                                                </button>
                                            </div>

                                            <div className="cart-item-total">
                                                <strong>฿{formatPrice(itemTotal)}</strong>
                                                <button type="button" onClick={() => removeItem(item)}>
                                                    ลบ
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <footer className="cart-modal-footer">
                        <div className="cart-summary-row">
                            <span>ยอดรวมทั้งหมด</span>
                            <strong>฿{formatPrice(cartTotal)}</strong>
                        </div>
                        <button
                            type="button"
                            className="cart-checkout-button"
                            onClick={onCheckout}
                            disabled={cart.length === 0}
                        >
                            ชำระเงินทันที
                        </button>
                    </footer>
                </div>
            </div>
        </div>
    );
}

export default CartModal;
