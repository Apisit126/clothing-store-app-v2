import React, { useCallback, useEffect, useRef, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import * as authApi from './api/authApi';
import * as productsApi from './api/productsApi';
import * as adminApi from './api/adminApi';
import * as ordersApi from './api/ordersApi';
import AppNavbar from './components/AppNavbar';
import CartModal from './components/CartModal';
import CheckoutModal from './components/CheckoutModal';
import OrderHistoryModal from './components/OrderHistoryModal';
import ProfileModal from './components/ProfileModal';
import StockEditModal from './components/StockEditModal';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import StorePage from './pages/StorePage';
import { getCartTotal } from './utils/cart';

const AUTH_STORAGE_KEY = 'clothingStoreUser';
const CART_STORAGE_KEY = 'clothingStoreCart';

const emptyProduct = {
    name: '',
    description: '',
    price: '',
    image_url: '',
    image_data: '',
    image_preview: '',
    image_name: '',
    stock: '',
    stock_remark: 'สต็อกเริ่มต้น',
    category_id: '',
    category_name: '',
    has_size: 1,
    has_color: 0,
};

const emptyEditProduct = {
    id: null,
    name: '',
    price: 0,
    description: '',
    category_id: '',
    category_name: emptyProduct.category_name,
};

const emptyAddress = {
    address_id: null,
    receiver_name: '',
    phone: '',
    address_detail: '',
    subdistrict: '',
    district: '',
    province: '',
    postal_code: '',
    address_type: 'บ้าน',
    is_default: 1,
};

const DELIVERY_FEE = 50;

const getNotificationTone = (message) => {
    const text = String(message || '');

    if (/สำเร็จ|เรียบร้อย|ตั้งเป็น|แนบสลิป/.test(text)) {
        return 'success';
    }

    if (/ไม่สามารถ|ล้มเหลว|ผิดพลาด|ไม่สำเร็จ/.test(text)) {
        return 'danger';
    }

    if (/กรุณา|ไม่มี|ต้อง/.test(text)) {
        return 'warning';
    }

    return 'info';
};

function AppNotification({ notification, onClose }) {
    if (!notification) return null;

    const icon = notification.tone === 'success' ? '✓' : notification.tone === 'danger' ? '!' : '?';
    const isConfirm = notification.mode === 'confirm';

    return (
        <div className="app-notification-backdrop" role="presentation">
            <div
                className={`app-notification app-notification-${notification.tone}`}
                role={isConfirm ? 'alertdialog' : 'alert'}
                aria-modal="true"
                aria-labelledby="app-notification-title"
                aria-describedby="app-notification-message"
            >
                <span className="app-notification-icon" aria-hidden="true">{icon}</span>
                <div className="app-notification-copy">
                    <strong id="app-notification-title">แจ้งเตือน</strong>
                    <p id="app-notification-message">{notification.message}</p>
                </div>
                <div className="app-notification-actions">
                    {isConfirm && (
                        <button type="button" className="app-notification-secondary" onClick={() => onClose(false)}>
                            ยกเลิก
                        </button>
                    )}
                    <button type="button" className="app-notification-primary" onClick={() => onClose(true)} autoFocus>
                        ตกลง
                    </button>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cart, setCart] = useState(() => {
        try {
            const savedCart = localStorage.getItem(CART_STORAGE_KEY);
            const parsedCart = savedCart ? JSON.parse(savedCart) : [];
            return Array.isArray(parsedCart) ? parsedCart : [];
        } catch (err) {
            localStorage.removeItem(CART_STORAGE_KEY);
            return [];
        }
    });
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (err) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return null;
        }
    });
    const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem(AUTH_STORAGE_KEY)));
    const [isRegisterView, setIsRegisterView] = useState(false);
    const [isAdminView, setIsAdminView] = useState(false);
    const [adminPage, setAdminPage] = useState('dashboard');
    const [previewProductId, setPreviewProductId] = useState(null);
    const [notification, setNotification] = useState(null);
    const notificationResolverRef = useRef(null);

    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [registerForm, setRegisterForm] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        email: '',
        phone: '',
    });
    const [loginError, setLoginError] = useState('');
    const [registerMsg, setRegisterMsg] = useState({ type: '', text: '' });

    const [adminOrders, setAdminOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [stockLogs, setStockLogs] = useState([]);
    const [systemLogs, setSystemLogs] = useState([]);
    const [orderHistory, setOrderHistory] = useState([]);

    const [newProduct, setNewProduct] = useState(emptyProduct);
    const [editProduct, setEditProduct] = useState(emptyEditProduct);
    const [stockEdit, setStockEdit] = useState({ id: null, amount: 0, remark: '', name: '' });
    const [userEdit, setUserEdit] = useState({ id: null, username: '', password: '', full_name: '', email: '', phone: '' });
    const [deleteLogTarget, setDeleteLogTarget] = useState({ id: null, remark: '' });

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profileUsername, setProfileUsername] = useState('');
    const [profilePassword, setProfilePassword] = useState('');
    const [profileFullName, setProfileFullName] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    const [addresses, setAddresses] = useState([]);
    const [addressForm, setAddressForm] = useState(emptyAddress);
    const [shippingInfo, setShippingInfo] = useState({
        address_id: null,
        address: '',
        phone: '',
        subdistrict: '',
        district: '',
        province: '',
        postal_code: '',
        shipping_fee: DELIVERY_FEE,
        discount: 0,
        payment_method: 'โอนเงินผ่านธนาคาร',
        shipping_method: 'ส่งสินค้า',
        receipt_image_data: '',
        receipt_file_name: '',
    });

    const total = getCartTotal(cart);

    const closeNotification = useCallback((result = true) => {
        if (notificationResolverRef.current) {
            notificationResolverRef.current(result);
            notificationResolverRef.current = null;
        }

        setNotification(null);
    }, []);

    const showNotification = useCallback((message, tone, mode = 'alert') => {
        const text = String(message || '').trim();
        if (!text) return;

        if (notificationResolverRef.current) {
            notificationResolverRef.current(false);
            notificationResolverRef.current = null;
        }

        setNotification({
            id: Date.now(),
            message: text,
            tone: tone || getNotificationTone(text),
            mode,
        });
    }, []);

    const showConfirm = useCallback((message, tone = 'warning') => {
        const text = String(message || '').trim();
        if (!text) return Promise.resolve(false);

        if (notificationResolverRef.current) {
            notificationResolverRef.current(false);
        }

        return new Promise((resolve) => {
            notificationResolverRef.current = resolve;
            setNotification({
                id: Date.now(),
                message: text,
                tone,
                mode: 'confirm',
            });
        });
    }, []);

    useEffect(() => {
        const originalAlert = window.alert;
        window.alert = (message) => {
            showNotification(message);
        };

        return () => {
            window.alert = originalAlert;
        };
    }, [showNotification]);

    useEffect(() => {
        if (cart.length === 0) {
            localStorage.removeItem(CART_STORAGE_KEY);
            return;
        }

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }, [cart]);

    const fetchProducts = useCallback(async (includeInactive = false) => {
        try {
            const res = await productsApi.getProducts('', includeInactive);
            const list = Array.isArray(res.data) ? res.data : [];
            setProducts(list);
            return list;
        } catch (err) {
            console.error(err);
            return [];
        }
    }, []);

    const fetchCategories = useCallback(async (includeInactive = false) => {
        try {
            const res = await productsApi.getCategories(includeInactive);
            const list = Array.isArray(res.data) ? res.data : [];
            setCategories(list);
            return list;
        } catch (err) {
            console.error(err);
            setCategories([]);
            return [];
        }
    }, []);

    const fetchAdminOrders = async () => {
        try {
            const res = await adminApi.getAdminOrders();
            setAdminOrders(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await adminApi.getCustomers();
            setCustomers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchStockLogs = async () => {
        try {
            const res = await adminApi.getStockLogs();
            setStockLogs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSystemLogs = async () => {
        try {
            const res = await adminApi.getSystemLogs();
            setSystemLogs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setSystemLogs([]);
        }
    };

    const fetchOrderHistory = async () => {
        if (!user?.username) return;

        try {
            const res = await ordersApi.getOrderHistory(user.username);
            setOrderHistory(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setOrderHistory([]);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [fetchProducts, fetchCategories]);

    useEffect(() => {
        fetchProducts(isAdminView);
        fetchCategories(isAdminView);
    }, [fetchProducts, fetchCategories, isAdminView]);

    useEffect(() => {
        if (!isAdminView) return;

        if (adminPage === 'dashboard') fetchAdminOrders();
        if (adminPage === 'customers') fetchCustomers();
        if (adminPage === 'stock-logs') {
            fetchStockLogs();
            fetchSystemLogs();
        }
    }, [isAdminView, adminPage]);

    const handleLogin = async (event) => {
        event.preventDefault();

        try {
            const res = await authApi.login(loginForm);
            if (res.data.success) {
                setIsLoggedIn(true);
                setUser(res.data.user);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(res.data.user));
                setLoginError('');
            }
        } catch (err) {
            setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    };

    const handleRegister = async (event) => {
        event.preventDefault();

        if (registerForm.password !== registerForm.confirmPassword) {
            setRegisterMsg({ type: 'error', text: 'รหัสผ่านไม่ตรงกัน' });
            return;
        }

        try {
            const res = await authApi.register({
                username: registerForm.username,
                password: registerForm.password,
                full_name: registerForm.full_name,
                email: registerForm.email,
                phone: registerForm.phone,
            });

            if (res.data.success) {
                setRegisterMsg({ type: 'success', text: 'สมัครสมาชิกสำเร็จ กำลังกลับไปหน้า Login...' });
                setTimeout(() => {
                    setIsRegisterView(false);
                    setRegisterMsg({ type: '', text: '' });
                    setRegisterForm({ username: '', password: '', confirmPassword: '', full_name: '', email: '', phone: '' });
                }, 1200);
            }
        } catch (err) {
            setRegisterMsg({
                type: 'error',
                text: err.response?.data?.message || err.response?.data?.error || 'สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง',
            });
        }
    };

    const fetchAddresses = async () => {
        if (!user?.id) return [];

        try {
            const res = await authApi.getAddresses(user.id);
            const list = Array.isArray(res.data) ? res.data : [];
            setAddresses(list);
            return list;
        } catch (err) {
            console.error(err);
            setAddresses([]);
            return [];
        }
    };

    const applyAddressToCheckout = (address) => {
        if (!address) return;

        setShippingInfo((prev) => ({
            ...prev,
            address_id: address.address_id,
            address: address.address_detail || '',
            phone: address.phone || '',
            subdistrict: address.subdistrict || '',
            district: address.district || '',
            province: address.province || '',
            postal_code: address.postal_code || '',
        }));
    };

    const addToCart = (product) => {
        const selectedSize = product.selected_size || product.size || '';
        const selectedColor = product.selected_color || product.color || '';
        const requestedQty = Math.max(1, Number(product.qty) || 1);
        const stock = Math.max(0, Number(product.stock) || 0);
        const nextProduct = { ...product, selected_size: selectedSize, selected_color: selectedColor };
        const existing = cart.find((item) => (
            item.id === product.id
            && (item.selected_size || '') === selectedSize
            && (item.selected_color || '') === selectedColor
        ));

        if (existing) {
            const nextQty = existing.qty + requestedQty;
            if (stock > 0 && nextQty > stock) {
                alert(`สินค้าในคลังมีเพียง ${stock} ชิ้น`);
                return;
            }
            setCart(cart.map((item) => (
                item.id === product.id
                    && (item.selected_size || '') === selectedSize
                    && (item.selected_color || '') === selectedColor
                    ? { ...item, qty: nextQty }
                    : item
            )));
            return;
        }

        setCart([...cart, { ...nextProduct, qty: Math.min(requestedQty, stock || requestedQty) }]);
    };

    const handleAddProduct = async (event) => {
        event.preventDefault();

        try {
            const stockAmount = Number(newProduct.stock);
            if (!Number.isInteger(stockAmount) || stockAmount <= 0) {
                alert('กรุณากรอกสต็อกเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
                return;
            }

            if (!newProduct.category_id) {
                alert('กรุณาเลือกหมวดหมู่สินค้า');
                return;
            }

            let imageUrl = newProduct.image_url;

            if (newProduct.image_data) {
                const uploadRes = await productsApi.uploadProductImage({
                    imageData: newProduct.image_data,
                    fileName: newProduct.image_name,
                });
                imageUrl = uploadRes.data.imageUrl;
            }

            const productData = { ...newProduct };
            delete productData.image_data;
            delete productData.image_preview;
            delete productData.image_name;

            const res = await productsApi.createProduct({
                ...productData,
                image_url: imageUrl,
                user_id: user?.id,
            });
            const productId = res.data.insertId || res.data.id;

            if (productId) {
                await productsApi.updateStock({
                    product_id: productId,
                    amount: 0,
                    remark: newProduct.stock_remark,
                    user_id: user?.id,
                });
            }

            alert('เพิ่มสินค้าสำเร็จ');
            setNewProduct(emptyProduct);
            await fetchProducts(false);
            setPreviewProductId(productId);
            setIsAdminView(false);
        } catch (err) {
            alert('เพิ่มสินค้าล้มเหลว');
        }
    };

    const handleUpdateStock = async () => {
        try {
            const stockAmount = Number(stockEdit.amount);
            if (!Number.isInteger(stockAmount) || stockAmount <= 0) {
                alert('กรุณากรอกจำนวนสต็อกเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
                return;
            }
            if (!stockEdit.remark.trim()) {
                alert('กรุณากรอกหมายเหตุทุกครั้งเมื่อรับสต็อก');
                return;
            }

            await productsApi.updateStock({
                product_id: stockEdit.id,
                amount: stockAmount,
                remark: stockEdit.remark.trim(),
                user_id: user?.id,
            });

            alert('ปรับปรุงสต็อกสำเร็จ');
            setStockEdit({ id: null, amount: 0, remark: '', name: '' });
            await fetchProducts(true);
            await fetchStockLogs();
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการปรับสต็อก');
        }
    };

    const handleSaveEditProduct = async () => {
        try {
            if (!editProduct.category_id) {
                alert('กรุณาเลือกหมวดหมู่สินค้า');
                return;
            }

            let imageUrl = editProduct.image_url;

            if (editProduct.image_data) {
                const uploadRes = await productsApi.uploadProductImage({
                    imageData: editProduct.image_data,
                    fileName: editProduct.image_name,
                });
                imageUrl = uploadRes.data.imageUrl;
            }

            const productData = {
                ...editProduct,
                image_url: imageUrl,
            };
            delete productData.image_data;
            delete productData.image_preview;
            delete productData.image_name;

            const res = await productsApi.editProduct(productData);
            if (res.data.success) {
                alert('แก้ไขข้อมูลสินค้าสำเร็จ');
                setEditProduct(emptyEditProduct);
                await fetchProducts(true);
                await fetchCategories(true);
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการแก้ไขสินค้า');
        }
    };

    const handleDeleteProduct = async (product) => {
        if (!(await showConfirm(`ยืนยันการลบสินค้า: ${product.name}? สินค้าจะถูกล็อกและไม่แสดงหน้าขาย`))) return;

        try {
            await productsApi.deleteProduct(product.id);
            alert('ลบสินค้าออกจากหน้าขายเรียบร้อยแล้ว');
            await fetchProducts(true);
        } catch (err) {
            alert('ไม่สามารถลบสินค้าได้ อาจมีข้อมูลเชื่อมโยงกับออเดอร์หรือประวัติสต็อก');
        }
    };

    const handleRestoreProduct = async (product) => {
        if (!(await showConfirm(`ยืนยันเปิดใช้งานสินค้า: ${product.name}? สินค้าจะกลับไปแสดงหน้าขาย`))) return;

        try {
            try {
                await productsApi.updateProductStatus(product.id, 1);
            } catch (statusErr) {
                if (statusErr.response?.status !== 404) throw statusErr;

                await productsApi.editProduct({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    description: product.description || '',
                    image_url: product.image_url || '',
                    category_id: product.category_id || '',
                    category_name: product.category_name || '',
                    product_status: 1,
                    has_size: Number(product.has_size ?? 1),
                    has_color: Number(product.has_color ?? 0),
                });
            }

            alert('เปิดใช้งานสินค้าเรียบร้อยแล้ว สินค้าจะกลับไปแสดงหน้าขาย');
            await fetchProducts(true);
        } catch (err) {
            alert(err.response?.data?.error || 'เปิดใช้งานสินค้าไม่สำเร็จ');
        }
    };

    const handleAddCategory = async (categoryName) => {
        const cleanName = String(categoryName || '').trim();
        if (!cleanName) {
            return { success: false, message: 'กรุณากรอกชื่อประเภทสินค้า' };
        }

        try {
            await productsApi.createCategory(cleanName);
            await fetchCategories(true);
            return { success: true };
        } catch (err) {
            const isMissingRoute = err.response?.status === 404;
            return {
                success: false,
                message: isMissingRoute
                    ? 'เพิ่มประเภทสินค้าไม่ได้ เพราะ backend ยังไม่ได้รีสตาร์ทหลังอัปเดตโค้ด'
                    : err.response?.data?.error || 'เพิ่มประเภทสินค้าไม่สำเร็จ',
            };
        }
    };

    const handleUpdateCategory = async (categoryId, payload) => {
        const cleanName = String(payload.category_name || '').trim();
        if (!cleanName) {
            return { success: false, message: 'กรุณากรอกชื่อประเภทสินค้า' };
        }

        try {
            await productsApi.updateCategory(categoryId, {
                ...payload,
                category_name: cleanName,
            });
            await fetchCategories(true);
            await fetchProducts(true);
            return { success: true };
        } catch (err) {
            const isMissingRoute = err.response?.status === 404;
            return {
                success: false,
                message: isMissingRoute
                    ? 'อัปเดตประเภทสินค้าไม่ได้ เพราะ backend ยังไม่ได้รีสตาร์ทหลังอัปเดตโค้ด'
                    : err.response?.data?.error || 'อัปเดตประเภทสินค้าไม่สำเร็จ',
            };
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!(await showConfirm('ยืนยันปิดใช้งานประเภทสินค้านี้? สินค้าเดิมจะยังอยู่ แต่ประเภทนี้จะไม่แสดงเป็นตัวเลือกใหม่'))) {
            return { success: false };
        }

        try {
            await productsApi.deleteCategory(categoryId);
            await fetchCategories(true);
            return { success: true };
        } catch (err) {
            const isMissingRoute = err.response?.status === 404;
            return {
                success: false,
                message: isMissingRoute
                    ? 'ปิดใช้งานประเภทสินค้าไม่ได้ เพราะ backend ยังไม่ได้รีสตาร์ทหลังอัปเดตโค้ด'
                    : err.response?.data?.error || 'ปิดใช้งานประเภทสินค้าไม่สำเร็จ',
            };
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            alert('ไม่มีสินค้าในตะกร้า');
            return;
        }

        const list = await fetchAddresses();
        const defaultAddress = list.find((address) => Number(address.is_default) === 1) || list[0];
        applyAddressToCheckout(defaultAddress);
        setIsCartOpen(false);
        setShowCheckout(true);
    };

    const handleConfirmPayment = async () => {
        if (shippingInfo.shipping_method === 'ส่งสินค้า' && !shippingInfo.address.trim()) {
            alert('กรุณากรอกที่อยู่จัดส่ง');
            return;
        }

        if (shippingInfo.shipping_method === 'ส่งสินค้า') {
            if (!shippingInfo.subdistrict.trim() || !shippingInfo.district.trim() || !shippingInfo.province.trim() || !shippingInfo.postal_code.trim()) {
                alert('กรุณากรอกตำบล/แขวง อำเภอ/เขต จังหวัด และรหัสไปรษณีย์');
                return;
            }
        }

        if (!shippingInfo.phone.trim()) {
            alert('กรุณากรอกเบอร์โทรศัพท์');
            return;
        }

        try {
            const shippingFee = shippingInfo.shipping_method === 'รับหน้าร้าน' ? 0 : DELIVERY_FEE;
            const isPickup = shippingInfo.shipping_method === 'รับหน้าร้าน';
            const discount = Math.min(Math.max(Number(shippingInfo.discount) || 0, 0), total + shippingFee);
            const orderData = {
                user_id: user?.id || null,
                username: user?.username || 'ลูกค้าทั่วไป',
                total_price: total,
                shipping_fee: shippingFee,
                discount,
                address_id: isPickup ? null : shippingInfo.address_id,
                address: isPickup ? 'รับสินค้าเองที่หน้าร้าน' : shippingInfo.address,
                phone: shippingInfo.phone,
                subdistrict: isPickup ? '' : shippingInfo.subdistrict,
                district: isPickup ? '' : shippingInfo.district,
                province: isPickup ? '' : shippingInfo.province,
                postal_code: isPickup ? '' : shippingInfo.postal_code,
                payment_method: shippingInfo.payment_method,
                shipping_method: shippingInfo.shipping_method,
                receipt_image_data: shippingInfo.receipt_image_data,
                receipt_file_name: shippingInfo.receipt_file_name,
                cart_items: cart,
            };

            const res = await ordersApi.checkoutOrder(orderData);
            if (res.data.success) {
                alert('สั่งซื้อสำเร็จ');
                setCart([]);
                setShowCheckout(false);
                setIsCartOpen(false);
                setShippingInfo({ address_id: null, address: '', phone: '', subdistrict: '', district: '', province: '', postal_code: '', shipping_fee: DELIVERY_FEE, discount: 0, payment_method: 'โอนเงินผ่านธนาคาร', shipping_method: 'ส่งสินค้า', receipt_image_data: '', receipt_file_name: '' });
                await fetchProducts();
            }
        } catch (err) {
            alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!(await showConfirm(`ยืนยันการลบคำสั่งซื้อ #${orderId}?`))) return;

        try {
            await adminApi.deleteAdminOrder(orderId, user?.id);
            alert('ลบคำสั่งซื้อสำเร็จ');
            await fetchAdminOrders();
            await fetchSystemLogs();
        } catch (err) {
            alert('ไม่สามารถลบคำสั่งซื้อได้');
        }
    };

    const handleUpdateOrderStatus = async (orderId, trackingNo = '', status = 'รอตรวจสอบ') => {
        if (status === 'จัดส่งแล้ว' && !String(trackingNo || '').trim()) {
            return {
                success: false,
                field: 'tracking_no',
                message: 'กรุณากรอกเลขพัสดุก่อนเปลี่ยนเป็นจัดส่งแล้ว',
            };
        }

        const confirmText = `ยืนยันเปลี่ยนสถานะออเดอร์ #${orderId} เป็น "${status}"?`;
        if (!(await showConfirm(confirmText))) {
            return { success: false };
        }

        try {
            await adminApi.updateOrderStatus(orderId, status, trackingNo, user?.id);
            await fetchAdminOrders();
            await fetchSystemLogs();
            return { success: true };
        } catch (err) {
            return {
                success: false,
                field: err.response?.data?.field || 'form',
                message: err.response?.data?.error || 'ไม่สามารถอัปเดตสถานะได้',
            };
        }
    };

    const handleUploadOrderReceipt = async (orderId, payload) => {
        try {
            await ordersApi.uploadReceipt(orderId, payload);
            alert('แนบสลิปเรียบร้อยแล้ว รอแอดมินตรวจสอบ');
            await fetchOrderHistory();
            return true;
        } catch (err) {
            alert(err.response?.data?.error || 'ไม่สามารถแนบสลิปได้');
            return false;
        }
    };

    const handleCancelCustomerOrder = async (orderId) => {
        if (!(await showConfirm(`ยืนยันยกเลิกคำสั่งซื้อ #${orderId}? สินค้าจะถูกคืนเข้าสต็อก`))) return;

        try {
            await ordersApi.cancelOrder(orderId, {
                user_id: user?.id,
                username: user?.username,
            });
            alert('ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว');
            await fetchOrderHistory();
            await fetchProducts(isAdminView);
            if (isAdminView) await fetchAdminOrders();
        } catch (err) {
            alert(err.response?.data?.error || 'ยกเลิกคำสั่งซื้อไม่สำเร็จ');
        }
    };

    const handleDeleteUser = async (id, name) => {
        if (!(await showConfirm(`ยืนยันการลบสมาชิก: ${name}?`))) return;

        try {
            await adminApi.deleteUser(id);
            alert('ลบสมาชิกเรียบร้อยแล้ว');
            await fetchCustomers();
        } catch (err) {
            alert('ไม่สามารถลบสมาชิกได้');
        }
    };

    const handleToggleUserBlock = async (customer) => {
        const isActive = Number(customer.status_user ?? 1) === 1;
        const nextStatus = isActive ? 0 : 1;
        const actionText = isActive ? 'บล็อก' : 'ปลดบล็อก';

        if (!(await showConfirm(`ยืนยันการ${actionText}สมาชิก: ${customer.username}?`))) return;

        try {
            await adminApi.updateUserStatus(customer.id, nextStatus);
            alert(`${actionText}สมาชิกเรียบร้อยแล้ว`);
            await fetchCustomers();
        } catch (err) {
            if (isActive && err.response?.status === 404) {
                await adminApi.deleteUser(customer.id);
                alert('บล็อกสมาชิกเรียบร้อยแล้ว');
                await fetchCustomers();
                return;
            }

            alert(err.response?.data?.error || 'ไม่สามารถอัปเดตสถานะสมาชิกได้');
        }
    };

    const handleUpdateUser = async () => {
        try {
            await adminApi.updateUser(userEdit.id, {
                username: userEdit.username,
                password: userEdit.password,
                full_name: userEdit.full_name,
                email: userEdit.email,
                phone: userEdit.phone,
            });

            setUserEdit({ id: null, username: '', password: '', full_name: '', email: '', phone: '' });
            alert('อัปเดตข้อมูลสมาชิกสำเร็จ');
            await fetchCustomers();
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการแก้ไขสมาชิก');
        }
    };

    const handleChangeRole = async (customer) => {
        const newRole = customer.role === 'admin' ? 'user' : 'admin';
        const customerName = customer.full_name || customer.username;

        if (!(await showConfirm(`ยืนยันเปลี่ยนสิทธิ์ ${customerName} เป็น ${newRole}?`))) return;

        try {
            await adminApi.changeUserRole(customer.id, newRole);
            await fetchCustomers();
            alert(`เปลี่ยนสิทธิ์ ${customerName} เป็น ${newRole} เรียบร้อยแล้ว`);
        } catch (err) {
            alert('ไม่สามารถเปลี่ยนสิทธิ์ได้');
        }
    };

    const handleDeleteLog = async () => {
        if (!deleteLogTarget.remark.trim()) {
            alert('กรุณาระบุเหตุผลที่ต้องการลบ');
            return;
        }

        try {
            await adminApi.deleteStockLog({
                log_id: deleteLogTarget.id,
                remark: deleteLogTarget.remark,
                user_id: user?.id,
            });

            alert('ลบรายการและปรับปรุงยอดสต็อกคืนแล้ว');
            setDeleteLogTarget({ id: null, remark: '' });
            await fetchStockLogs();
            await fetchSystemLogs();
            await fetchProducts(true);
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการลบประวัติสต็อก');
        }
    };

    const openOrderHistory = async () => {
        await fetchOrderHistory();
        setIsOrderHistoryOpen(true);
    };

    const openProfile = () => {
        setProfileUsername(user?.username || '');
        setProfilePassword('');
        setProfileFullName(user?.full_name || user?.username || '');
        setProfileEmail(user?.email || '');
        setProfilePhone(user?.phone || '');
        fetchAddresses().then((list) => {
            const defaultAddress = list.find((address) => Number(address.is_default) === 1) || list[0];
            setAddressForm(defaultAddress ? { ...emptyAddress, ...defaultAddress } : {
                ...emptyAddress,
                receiver_name: user?.full_name || user?.username || '',
                phone: user?.phone || '',
            });
        });
        setIsProfileOpen(true);
    };

    const handleSaveProfile = async (event) => {
        event.preventDefault();

        if (!profileUsername.trim()) {
            alert('กรุณากรอกชื่อผู้ใช้');
            return;
        }

        try {
            const res = await authApi.updateProfile(user.id, {
                username: profileUsername,
                password: profilePassword,
                full_name: profileFullName,
                email: profileEmail,
                phone: profilePhone,
            });
            const updatedUser = res.data.user;
            setUser(updatedUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
            alert('อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว');
            setIsProfileOpen(false);
        } catch (err) {
            alert(err.response?.data?.error || 'อัปเดตข้อมูลโปรไฟล์ไม่สำเร็จ');
        }
    };

    const handleSaveAddress = async (event) => {
        event.preventDefault();

        if (!addressForm.receiver_name.trim() || !addressForm.address_detail.trim()) {
            alert('กรุณากรอกชื่อผู้รับและที่อยู่');
            return;
        }

        try {
            if (addressForm.address_id) {
                await authApi.updateAddress(user.id, addressForm.address_id, addressForm);
            } else {
                await authApi.createAddress(user.id, addressForm);
            }

            const list = await fetchAddresses();
            const defaultAddress = list.find((address) => Number(address.is_default) === 1) || list[0];
            setAddressForm(defaultAddress ? { ...emptyAddress, ...defaultAddress } : emptyAddress);
            applyAddressToCheckout(defaultAddress);
            alert('บันทึกที่อยู่สำเร็จ');
        } catch (err) {
            alert(err.response?.data?.error || 'บันทึกที่อยู่ไม่สำเร็จ');
        }
    };

    const handleSelectAddress = (address) => {
        setAddressForm({ ...emptyAddress, ...address });
    };

    const handleNewAddress = () => {
        setAddressForm({
            ...emptyAddress,
            receiver_name: user?.full_name || user?.username || '',
            phone: user?.phone || '',
            is_default: addresses.length === 0 ? 1 : 0,
        });
    };

    const handleSetDefaultAddress = async (address) => {
        try {
            await authApi.setDefaultAddress(user.id, address.address_id);
            const list = await fetchAddresses();
            const selected = list.find((item) => item.address_id === address.address_id) || address;
            setAddressForm({ ...emptyAddress, ...selected, is_default: 1 });
            applyAddressToCheckout(selected);
            alert('ตั้งเป็นที่อยู่หลักแล้ว');
        } catch (err) {
            alert(err.response?.data?.error || 'ตั้งที่อยู่หลักไม่สำเร็จ');
        }
    };

    const handleLogout = async () => {
        if (await showConfirm('ต้องการออกจากระบบใช่หรือไม่?')) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            setUser(null);
            setIsLoggedIn(false);
            setIsAdminView(false);
            setCart([]);
            setLoginForm({ username: '', password: '' });
        }
    };

    if (!isLoggedIn) {
        return (
            <>
                <AppNotification notification={notification} onClose={closeNotification} />
                <AuthPage
                    isRegisterView={isRegisterView}
                    setIsRegisterView={setIsRegisterView}
                    loginForm={loginForm}
                    setLoginForm={setLoginForm}
                    registerForm={registerForm}
                    setRegisterForm={setRegisterForm}
                    loginError={loginError}
                    registerMsg={registerMsg}
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                />
            </>
        );
    }

    return (
        <div className="bg-light min-vh-100">
            <AppNotification notification={notification} onClose={closeNotification} />

            <AppNavbar
                user={user}
                cart={cart}
                isAdminView={isAdminView}
                setIsAdminView={setIsAdminView}
                adminPage={adminPage}
                setAdminPage={setAdminPage}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenOrderHistory={openOrderHistory}
                onOpenProfile={openProfile}
                onLogout={handleLogout}
            />

            <div className="container mt-4 pb-5">
                {isAdminView ? (
                    <AdminPage
                        adminPage={adminPage}
                        setAdminPage={setAdminPage}
                        orders={adminOrders}
                        products={products}
                        categories={categories}
                        customers={customers}
                        stockLogs={stockLogs}
                        systemLogs={systemLogs}
                        newProduct={newProduct}
                        setNewProduct={setNewProduct}
                        editProduct={editProduct}
                        setEditProduct={setEditProduct}
                        userEdit={userEdit}
                        setUserEdit={setUserEdit}
                        deleteLogTarget={deleteLogTarget}
                        setDeleteLogTarget={setDeleteLogTarget}
                        onSubmit={handleAddProduct}
                        onSaveEditProduct={handleSaveEditProduct}
                        onDeleteProduct={handleDeleteProduct}
                        onRestoreProduct={handleRestoreProduct}
                        onAddCategory={handleAddCategory}
                        onUpdateCategory={handleUpdateCategory}
                        onDeleteCategory={handleDeleteCategory}
                        onDeleteOrder={handleDeleteOrder}
                        onUpdateOrderStatus={handleUpdateOrderStatus}
                        onLoadOrderItems={adminApi.getAdminOrderItems}
                        onOpenStockEdit={(product) => setStockEdit({ id: product.id, amount: 0, remark: '', name: product.name })}
                        onUpdateUser={handleUpdateUser}
                        onDeleteUser={handleDeleteUser}
                        onToggleUserBlock={handleToggleUserBlock}
                        onChangeRole={handleChangeRole}
                        onDeleteLog={handleDeleteLog}
                    />
                ) : (
                    <StorePage
                        products={products}
                        categories={categories}
                        onAddToCart={addToCart}
                        previewProductId={previewProductId}
                        onPreviewShown={() => setPreviewProductId(null)}
                    />
                )}
            </div>

            <StockEditModal stockEdit={stockEdit} setStockEdit={setStockEdit} onSave={handleUpdateStock} />

            {isCartOpen && (
                <CartModal
                    cart={cart}
                    setCart={setCart}
                    onClose={() => setIsCartOpen(false)}
                    onCheckout={handleCheckout}
                    onConfirm={showConfirm}
                />
            )}

            {showCheckout && (
                <CheckoutModal
                    total={total}
                    shippingInfo={shippingInfo}
                    setShippingInfo={setShippingInfo}
                    addresses={addresses}
                    onClose={() => setShowCheckout(false)}
                    onConfirm={handleConfirmPayment}
                />
            )}

            {isOrderHistoryOpen && (
                <OrderHistoryModal
                    orders={orderHistory}
                    username={user?.username}
                    onClose={() => setIsOrderHistoryOpen(false)}
                    onUploadReceipt={handleUploadOrderReceipt}
                    onCancelOrder={handleCancelCustomerOrder}
                />
            )}

            {isProfileOpen && (
                <ProfileModal
                    user={user}
                    username={profileUsername}
                    password={profilePassword}
                    fullName={profileFullName}
                    email={profileEmail}
                    phone={profilePhone}
                    setUsername={setProfileUsername}
                    setPassword={setProfilePassword}
                    setFullName={setProfileFullName}
                    setEmail={setProfileEmail}
                    setPhone={setProfilePhone}
                    addresses={addresses}
                    addressForm={addressForm}
                    setAddressForm={setAddressForm}
                    onSaveAddress={handleSaveAddress}
                    onSelectAddress={handleSelectAddress}
                    onNewAddress={handleNewAddress}
                    onSetDefaultAddress={handleSetDefaultAddress}
                    onSave={handleSaveProfile}
                    onClose={() => setIsProfileOpen(false)}
                />
            )}
        </div>
    );
}

export default App;
