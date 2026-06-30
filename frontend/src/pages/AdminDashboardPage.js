import { Fragment, useEffect, useState } from 'react';

const formatMoney = (value) => {
    const amount = Number(value) || 0;
    return amount.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const orderStatuses = ['ทั้งหมด', 'รอชำระ', 'รอตรวจสอบ', 'กำลังจัดส่ง', 'เตรียมสินค้า', 'พร้อมรับ', 'จัดส่งแล้ว', 'ยกเลิก'];
const approvedStatuses = ['กำลังจัดส่ง', 'เตรียมสินค้า', 'พร้อมรับ', 'จัดส่งแล้ว'];
const isPickupOrder = (order) => order.shipping_method === 'รับหน้าร้าน';
const isPaymentApproved = (order) => approvedStatuses.includes(order.status);
const getApproveStatus = (order) => (isPickupOrder(order) ? 'เตรียมสินค้า' : 'กำลังจัดส่ง');
const getStatusClass = (status) => {
    if (status === 'ยกเลิก') return 'locked';
    if (status === 'รอชำระ') return 'low';
    if (status === 'รอตรวจสอบ') return 'pending';
    if (['กำลังจัดส่ง', 'เตรียมสินค้า'].includes(status)) return 'shipping';
    return 'paid';
};

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const buildOrderDocumentHtml = (order, items, mode = 'checklist') => {
    const isBill = mode === 'bill';
    const title = isBill ? `บิลคำสั่งซื้อ #${order.id}` : `ใบเช็คคำสั่งซื้อ #${order.id}`;
    const documentDate = new Date().toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const rows = items.length > 0
        ? items.map((item, index) => {
            const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
            const options = [
                item.selected_size ? `ไซซ์ ${item.selected_size}` : '',
                item.selected_color ? `สี ${item.selected_color}` : '',
            ].filter(Boolean).join(' / ');
            return `
                <tr>
                    <td class="center">${index + 1}</td>
                    ${isBill ? '' : '<td class="check">□</td>'}
                    <td>
                        <strong>${escapeHtml(item.name || 'สินค้า')}</strong>
                        ${options ? `<small>${escapeHtml(options)}</small>` : ''}
                    </td>
                    <td class="center">${escapeHtml(item.quantity || 0)}</td>
                    <td class="right">฿${formatMoney(item.price)}</td>
                    <td class="right">฿${formatMoney(itemTotal)}</td>
                </tr>
            `;
        }).join('')
        : `
            <tr>
                <td colspan="${isBill ? 5 : 6}" class="empty">ไม่พบรายการสินค้าในออเดอร์นี้</td>
            </tr>
        `;
    const checklist = isBill ? '' : `
        <section class="checklist">
            <h2>รายการตรวจสอบ</h2>
            <div class="checks">
                <span>□ ตรวจยอดชำระเงินแล้ว</span>
                <span>□ ตรวจสลิป/หลักฐานโอนเงิน</span>
                <span>□ ตรวจจำนวนสินค้า</span>
                <span>□ แพ็กสินค้าเรียบร้อย</span>
                <span>□ แนบเลขพัสดุ/เตรียมรับหน้าร้าน</span>
                <span>□ แจ้งลูกค้าแล้ว</span>
            </div>
        </section>
    `;

    return `<!doctype html>
<html lang="th">
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 32px;
            color: #20262d;
            font-family: "Prompt", "Tahoma", sans-serif;
            background: #f4f6f8;
        }
        .sheet {
            max-width: 920px;
            margin: 0 auto;
            padding: 34px;
            background: #fff;
            border: 1px solid #dce3eb;
        }
        header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding-bottom: 18px;
            border-bottom: 3px solid #20262d;
        }
        h1 { margin: 0; font-size: 28px; }
        h2 { margin: 0 0 10px; font-size: 16px; }
        p { margin: 4px 0; }
        .muted { color: #6f7480; }
        .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
            margin: 22px 0;
        }
        .box {
            min-height: 118px;
            padding: 16px;
            border: 1px solid #dfe5ec;
        }
        .receipt-proof {
            display: grid;
            gap: 8px;
        }
        .receipt-proof img {
            width: 100%;
            max-height: 260px;
            display: block;
            object-fit: contain;
            border: 1px solid #dfe5ec;
            background: #f8fafc;
        }
        .receipt-proof a {
            color: #0d63f3;
            font-size: 12px;
            overflow-wrap: anywhere;
        }
        .receipt-fallback {
            color: #6f7480;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
        }
        th, td {
            padding: 10px;
            border: 1px solid #dfe5ec;
            vertical-align: top;
            font-size: 14px;
        }
        th {
            background: #f2f5f8;
            text-align: left;
        }
        small { display: block; color: #6f7480; }
        .center { text-align: center; }
        .right { text-align: right; }
        .check { width: 44px; text-align: center; font-size: 20px; }
        .empty { padding: 22px; text-align: center; color: #6f7480; }
        .totals {
            width: 330px;
            max-width: 100%;
            margin: 20px 0 0 auto;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #edf0f3;
        }
        .grand {
            color: #0d63f3;
            font-size: 20px;
            font-weight: 800;
        }
        .checklist {
            margin-top: 24px;
            padding: 16px;
            border: 1px solid #dfe5ec;
        }
        .checks {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        .signature {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 28px;
            margin-top: 40px;
        }
        .line {
            padding-top: 34px;
            border-bottom: 1px solid #20262d;
            text-align: center;
        }
        .actions {
            max-width: 920px;
            margin: 0 auto 14px;
            text-align: right;
        }
        .actions button {
            min-height: 38px;
            border: 0;
            border-radius: 999px;
            padding: 0 16px;
            background: #20262d;
            color: #fff;
            font: inherit;
            font-weight: 700;
        }
        @media print {
            body { padding: 0; background: #fff; }
            .sheet { border: 0; max-width: none; }
            .actions { display: none; }
        }
    </style>
</head>
<body>
    <div class="actions"><button onclick="window.print()">พิมพ์เอกสาร</button></div>
    <main class="sheet">
        <header>
            <div>
                <h1>${escapeHtml(title)}</h1>
                <p class="muted">สร้างเอกสารเมื่อ ${escapeHtml(documentDate)}</p>
            </div>
            <div class="right">
                <p><strong>เลขออเดอร์:</strong> #${escapeHtml(order.id)}</p>
                <p><strong>วันที่สั่งซื้อ:</strong> ${escapeHtml(formatDateTime(order.created_at))}</p>
                <p><strong>สถานะ:</strong> ${escapeHtml(order.status || '-')}</p>
            </div>
        </header>
        <section class="grid">
            <div class="box">
                <h2>ข้อมูลลูกค้า</h2>
                <p><strong>${escapeHtml(order.full_name || order.username || 'ลูกค้าทั่วไป')}</strong></p>
                <p>ชื่อผู้ใช้: ${escapeHtml(order.username || '-')}</p>
                <p>โทร: ${escapeHtml(order.phone || '-')}</p>
            </div>
            <div class="box">
                <h2>การรับสินค้าและชำระเงิน</h2>
                <p>วิธีรับสินค้า: ${escapeHtml(order.shipping_method || '-')}</p>
                <p>ช่องทางชำระ: ${escapeHtml(order.payment_method || '-')}</p>
                <p>สถานะชำระเงิน: ${escapeHtml(order.payment_status || '-')}</p>
                <p>เลขพัสดุ: ${escapeHtml(order.tracking_no || '-')}</p>
            </div>
            <div class="box">
                <h2>ที่อยู่จัดส่ง</h2>
                <p>${escapeHtml(order.address || '-')}</p>
            </div>
            <div class="box">
                <h2>หลักฐานชำระเงิน</h2>
                ${order.receipt_image ? `
                    <div class="receipt-proof">
                        <img
                            src="${escapeHtml(order.receipt_image)}"
                            alt="หลักฐานชำระเงินคำสั่งซื้อ #${escapeHtml(order.id)}"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                        />
                        <p class="receipt-fallback" style="display:none;">ไม่สามารถโหลดรูปสลิปได้</p>
                        <a href="${escapeHtml(order.receipt_image)}" target="_blank" rel="noreferrer">เปิดรูปสลิปขนาดเต็ม</a>
                    </div>
                ` : '<p class="receipt-fallback">ยังไม่มีสลิป</p>'}
            </div>
        </section>
        <section>
            <h2>รายการสินค้า</h2>
            <table>
                <thead>
                    <tr>
                        <th class="center">ลำดับ</th>
                        ${isBill ? '' : '<th class="center">เช็ค</th>'}
                        <th>สินค้า</th>
                        <th class="center">จำนวน</th>
                        <th class="right">ราคา/ชิ้น</th>
                        <th class="right">รวม</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="totals">
                <div class="total-row"><span>ค่าสินค้า</span><strong>฿${formatMoney(order.total_price)}</strong></div>
                <div class="total-row"><span>ค่าจัดส่ง</span><strong>฿${formatMoney(order.shipping_fee)}</strong></div>
                <div class="total-row"><span>ส่วนลด</span><strong>฿${formatMoney(order.discount)}</strong></div>
                <div class="total-row grand"><span>ยอดสุทธิ</span><strong>฿${formatMoney(order.final_price ?? order.total_price)}</strong></div>
            </div>
        </section>
        ${checklist}
        <section class="signature">
            <div class="line">ผู้ตรวจ / แอดมิน</div>
            <div class="line">วันที่ตรวจ</div>
        </section>
    </main>
</body>
</html>`;
};

function AdminDashboardPage({
    orders,
    onDeleteOrder,
    onUpdateOrderStatus,
    onLoadOrderItems,
}) {
    const [trackingInputs, setTrackingInputs] = useState({});
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
    const [trackingErrors, setTrackingErrors] = useState({});
    const [savingOrderId, setSavingOrderId] = useState(null);
    const [orderItemsById, setOrderItemsById] = useState({});
    const [loadingItemsById, setLoadingItemsById] = useState({});
    const [itemErrorsById, setItemErrorsById] = useState({});
    const waitingPaymentOrders = orders.filter((order) => order.status === 'รอชำระ').length;
    const waitingReviewOrders = orders.filter((order) => order.status === 'รอตรวจสอบ').length;
    const approvedOrders = orders.filter(isPaymentApproved).length;
    const activeSalesOrders = orders.filter((order) => order.status !== 'ยกเลิก');
    const activeRevenue = activeSalesOrders.reduce((sum, order) => sum + (Number(order.final_price ?? order.total_price) || 0), 0);
    const today = new Date();
    const isSameDay = (date) => date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate();
    const isSameMonth = (date) => date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth();
    const isSameYear = (date) => date.getFullYear() === today.getFullYear();
    const sumRevenueByDate = (predicate) => activeSalesOrders.reduce((sum, order) => {
        const orderDate = order.created_at ? new Date(order.created_at) : null;
        if (!orderDate || Number.isNaN(orderDate.getTime()) || !predicate(orderDate)) return sum;
        return sum + (Number(order.final_price ?? order.total_price) || 0);
    }, 0);
    const dailyRevenue = sumRevenueByDate(isSameDay);
    const monthlyRevenue = sumRevenueByDate(isSameMonth);
    const yearlyRevenue = sumRevenueByDate(isSameYear);
    const visibleOrders = statusFilter === 'ทั้งหมด'
        ? orders
        : orders.filter((order) => (order.status || 'รอชำระ') === statusFilter);

    useEffect(() => {
        // เก็บเลขพัสดุแยกตามออเดอร์ เพื่อให้แก้ในตารางได้โดยไม่กระทบแถวอื่น
        setTrackingInputs((current) => orders.reduce((next, order) => ({
            ...next,
            [order.id]: current[order.id] ?? order.tracking_no ?? '',
        }), {}));
    }, [orders]);

    const updateTrackingInput = (orderId, value) => {
        setTrackingErrors((current) => ({ ...current, [orderId]: '' }));
        setTrackingInputs((current) => ({ ...current, [orderId]: value }));
    };

    const loadOrderItems = async (orderId) => {
        if (!onLoadOrderItems) return [];
        if (orderItemsById[orderId]) return orderItemsById[orderId];
        if (loadingItemsById[orderId]) return orderItemsById[orderId] || [];

        try {
            setLoadingItemsById((current) => ({ ...current, [orderId]: true }));
            setItemErrorsById((current) => ({ ...current, [orderId]: '' }));
            const res = await onLoadOrderItems(orderId);
            const items = Array.isArray(res.data) ? res.data : [];
            setOrderItemsById((current) => ({
                ...current,
                [orderId]: items,
            }));
            return items;
        } catch (err) {
            setItemErrorsById((current) => ({
                ...current,
                [orderId]: err.response?.data?.error || 'โหลดรายละเอียดสินค้าไม่สำเร็จ',
            }));
            return [];
        } finally {
            setLoadingItemsById((current) => ({ ...current, [orderId]: false }));
        }
    };

    const openOrderPrintDocument = async (order, mode = 'checklist') => {
        const items = await loadOrderItems(order.id);
        const documentHtml = buildOrderDocumentHtml(order, items, mode);
        const printWindow = window.open('', '_blank');

        if (!printWindow) {
            alert('ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาอนุญาต pop-up ของเบราว์เซอร์');
            return;
        }

        printWindow.document.open();
        printWindow.document.write(documentHtml);
        printWindow.document.close();
        printWindow.focus();
    };

    const downloadOrderBill = async (order) => {
        const items = await loadOrderItems(order.id);
        const documentHtml = buildOrderDocumentHtml(order, items, 'bill');
        const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bill-order-${order.id}.html`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const toggleOrderDetails = (orderId) => {
        setExpandedOrderId((current) => {
            const nextOrderId = current === orderId ? null : orderId;
            if (nextOrderId) loadOrderItems(nextOrderId);
            return nextOrderId;
        });
    };

    const runOrderStep = async (order, nextStatus) => {
        if (savingOrderId) return;
        const trackingNo = trackingInputs[order.id] || '';

        if (nextStatus === 'จัดส่งแล้ว' && !trackingNo.trim()) {
            setExpandedOrderId(order.id);
            setTrackingErrors((current) => ({
                ...current,
                [order.id]: 'กรุณากรอกเลขพัสดุก่อนเปลี่ยนเป็นจัดส่งแล้ว',
            }));
            return;
        }

        try {
            setSavingOrderId(order.id);
            const result = await onUpdateOrderStatus(order.id, trackingNo, nextStatus);
            if (result?.success) {
                setTrackingErrors((current) => ({ ...current, [order.id]: '' }));
                return;
            }
            if (!result?.success && result?.message) {
                if (result.field === 'tracking_no') {
                    setExpandedOrderId(order.id);
                    setTrackingErrors((current) => ({ ...current, [order.id]: result.message }));
                } else {
                    alert(result.message);
                }
            }
        } finally {
            setSavingOrderId(null);
        }
    };

    return (
        <div className="admin-dashboard">
            <section className="admin-hero">
                <div>
                    <span className="admin-eyebrow">Admin Overview</span>
                    <h1>Dashboard & ออเดอร์</h1>
                    <p>ดูภาพรวมคำสั่งซื้อ ยอดขาย และคลังสินค้าในที่เดียว</p>
                </div>
                <div className="admin-hero-total">
                    <span>ยอดขายรวม</span>
                    <strong>฿{formatMoney(activeRevenue)}</strong>
                </div>
            </section>

            <section className="admin-stat-grid">
                <div className="admin-stat-card">
                    <span>คำสั่งซื้อทั้งหมด</span>
                    <strong>{orders.length}</strong>
                    <small>รายการในระบบ</small>
                </div>
                <div className="admin-stat-card warning">
                    <span>รอชำระ</span>
                    <strong>{waitingPaymentOrders}</strong>
                    <small>ยังไม่มีสลิปโอนเงิน</small>
                </div>
                <div className="admin-stat-card success">
                    <span>รอตรวจสอบ</span>
                    <strong>{waitingReviewOrders}</strong>
                    <small>มีสลิปแล้ว รอยืนยันยอด</small>
                </div>
                <div className="admin-stat-card danger">
                    <span>กำลังดำเนินการ</span>
                    <strong>{approvedOrders}</strong>
                    <small>อนุมัติแล้วหรือจบออเดอร์</small>
                </div>
            </section>

            <section className="admin-stat-grid">
                <div className="admin-stat-card success">
                    <span>ยอดขายรายวัน</span>
                    <strong>฿{formatMoney(dailyRevenue)}</strong>
                    <small>ไม่นับออเดอร์ยกเลิก</small>
                </div>
                <div className="admin-stat-card success">
                    <span>ยอดขายรายเดือน</span>
                    <strong>฿{formatMoney(monthlyRevenue)}</strong>
                    <small>ไม่นับออเดอร์ยกเลิก</small>
                </div>
                <div className="admin-stat-card success">
                    <span>ยอดขายรายปี</span>
                    <strong>฿{formatMoney(yearlyRevenue)}</strong>
                    <small>ไม่นับออเดอร์ยกเลิก</small>
                </div>
            </section>

            <section className="admin-panel">
                <div className="admin-panel-header">
                    <div>
                        <h2>รายการสั่งซื้อและแจ้งชำระเงิน</h2>
                        <p>จัดการออเดอร์ล่าสุดและยืนยันยอดชำระเงิน</p>
                    </div>
                    <div className="admin-panel-tools">
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                            {orderStatuses.map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                        <span>{visibleOrders.length} ออเดอร์</span>
                    </div>
                </div>

                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ออเดอร์</th>
                                <th>ลูกค้า</th>
                                <th className="text-center">สถานะ</th>
                                <th>การรับสินค้า</th>
                                <th>เลขพัสดุ</th>
                                <th className="text-end">ยอดสุทธิ</th>
                                <th className="text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleOrders.length > 0 ? (
                                visibleOrders.map((order) => {
                                    const expanded = expandedOrderId === order.id;
                                    const currentStatus = order.status || 'รอชำระ';
                                    const canConfirmPayment = currentStatus === 'รอตรวจสอบ' && Boolean(order.receipt_image);
                                    const canSaveTracking = currentStatus === 'กำลังจัดส่ง' && !isPickupOrder(order);
                                    const canMarkReadyForPickup = currentStatus === 'เตรียมสินค้า' && isPickupOrder(order);
                                    const showTrackingInput = !isPickupOrder(order) && !['รอชำระ', 'รอตรวจสอบ', 'ยกเลิก', 'จัดส่งแล้ว'].includes(currentStatus);
                                    const isSaving = savingOrderId === order.id;
                                    const trackingError = trackingErrors[order.id];
                                    const orderItems = orderItemsById[order.id] || [];
                                    const isLoadingItems = Boolean(loadingItemsById[order.id]);
                                    const itemError = itemErrorsById[order.id];

                                    return (
                                        <Fragment key={order.id}>
                                            <tr key={order.id} className="admin-summary-row" onClick={() => toggleOrderDetails(order.id)}>
                                                <td>
                                                    <strong className="admin-order-id">#{order.id}</strong>
                                                </td>
                                                <td>
                                                    <strong>{order.username || 'ลูกค้าทั่วไป'}</strong>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`admin-status ${getStatusClass(currentStatus)}`}>
                                                        {currentStatus}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="admin-soft-badge">
                                                        {order.shipping_method || '-'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={order.tracking_no ? 'fw-bold text-dark' : 'text-muted'}>
                                                        {order.tracking_no || '-'}
                                                    </span>
                                                </td>
                                                <td className="text-end admin-money">
                                                    ฿{formatMoney(order.final_price ?? order.total_price)}
                                                </td>
                                                <td className="text-center">
                                                    <div className="admin-action-row">
                                                        {currentStatus === 'รอชำระ' && (
                                                            <span className="admin-soft-badge">รอลูกค้าแนบสลิป</span>
                                                        )}
                                                        {currentStatus === 'รอตรวจสอบ' && !order.receipt_image && (
                                                            <span className="admin-soft-badge">ไม่มีสลิป</span>
                                                        )}
                                                        {canConfirmPayment && (
                                                            <button
                                                                type="button"
                                                                className="admin-action success"
                                                                disabled={isSaving}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    runOrderStep(order, getApproveStatus(order));
                                                                }}
                                                            >
                                                                ยืนยันการชำระเงิน
                                                            </button>
                                                        )}
                                                        {canSaveTracking && (
                                                            <button
                                                                type="button"
                                                                className="admin-action primary"
                                                                disabled={isSaving}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setExpandedOrderId(order.id);
                                                                    runOrderStep(order, 'จัดส่งแล้ว');
                                                                }}
                                                            >
                                                                บันทึกเลขพัสดุ
                                                            </button>
                                                        )}
                                                        {canMarkReadyForPickup && (
                                                            <button
                                                                type="button"
                                                                className="admin-action primary"
                                                                disabled={isSaving}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    runOrderStep(order, 'พร้อมรับ');
                                                                }}
                                                            >
                                                                พร้อมรับ
                                                            </button>
                                                        )}
                                                        {['พร้อมรับ', 'จัดส่งแล้ว'].includes(currentStatus) && (
                                                            <span className="admin-soft-badge">จบออเดอร์</span>
                                                        )}
                                                        {currentStatus === 'ยกเลิก' && (
                                                            <span className="admin-soft-badge">ยกเลิกแล้ว</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {expanded && (
                                                <tr className="admin-detail-row">
                                                    <td colSpan="7">
                                                        <div className="admin-order-detail">
                                                            <div className="admin-order-items-panel">
                                                                <h3>รายละเอียดคำสั่งซื้อ</h3>
                                                                {isLoadingItems && (
                                                                    <p className="text-muted">กำลังโหลดรายการสินค้า...</p>
                                                                )}
                                                                {!isLoadingItems && itemError && (
                                                                    <p className="text-danger fw-bold">{itemError}</p>
                                                                )}
                                                                {!isLoadingItems && !itemError && orderItems.length === 0 && (
                                                                    <p className="text-muted">ไม่พบรายการสินค้าในออเดอร์นี้</p>
                                                                )}
                                                                {!isLoadingItems && !itemError && orderItems.length > 0 && (
                                                                    <div className="admin-order-items-list">
                                                                        {orderItems.map((item) => {
                                                                            const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
                                                                            return (
                                                                                <div className="admin-order-item" key={item.order_detail_id}>
                                                                                    <div className="admin-order-item-thumb">
                                                                                        {item.image_url ? (
                                                                                            <img src={item.image_url} alt={item.name || 'สินค้า'} />
                                                                                        ) : (
                                                                                            <span>{String(item.name || 'สินค้า').charAt(0)}</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div>
                                                                                        <strong>{item.name || 'สินค้า'}</strong>
                                                                                        <small>
                                                                                            จำนวน {item.quantity || 0} ชิ้น
                                                                                            {item.selected_size ? ` / ไซซ์ ${item.selected_size}` : ''}
                                                                                            {item.selected_color ? ` / สี ${item.selected_color}` : ''}
                                                                                        </small>
                                                                                    </div>
                                                                                    <div className="admin-order-item-price">
                                                                                        <strong>฿{formatMoney(itemTotal)}</strong>
                                                                                        <small>฿{formatMoney(item.price)} / ชิ้น</small>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h3>ข้อมูลจัดส่ง</h3>
                                                                <p>{order.address || '-'}</p>
                                                                <small>{order.phone || '-'}</small>
                                                            </div>
                                                            <div>
                                                                <h3>ยอดเงิน</h3>
                                                                <p>สินค้า ฿{formatMoney(order.total_price)}</p>
                                                                <p>ค่าส่ง ฿{formatMoney(order.shipping_fee)}</p>
                                                                <p>ส่วนลด ฿{formatMoney(order.discount)}</p>
                                                                <strong>สุทธิ ฿{formatMoney(order.final_price ?? order.total_price)}</strong>
                                                            </div>
                                                            <div>
                                                                <h3>สลิปโอนเงิน</h3>
                                                                {order.receipt_image ? (
                                                                    <a href={order.receipt_image} target="_blank" rel="noreferrer" className="admin-receipt-preview">
                                                                        <img src={order.receipt_image} alt={`สลิปออเดอร์ ${order.id}`} />
                                                                    </a>
                                                                ) : (
                                                                    <p className="text-muted">ไม่มีสลิป</p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h3>เลขพัสดุ</h3>
                                                                {showTrackingInput ? (
                                                                    <>
                                                                        <input
                                                                            className={`form-control form-control-sm ${trackingError ? 'is-invalid' : ''}`}
                                                                            value={trackingInputs[order.id] || ''}
                                                                            onChange={(event) => updateTrackingInput(order.id, event.target.value)}
                                                                            placeholder="กรอกเลขพัสดุ"
                                                                        />
                                                                        {trackingError && (
                                                                            <small className="text-danger fw-bold d-block mt-1">
                                                                                {trackingError}
                                                                            </small>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <p className="text-muted">ยังไม่ต้องกรอกเลขพัสดุ</p>
                                                                )}
                                                            </div>
                                                            <div className="admin-order-detail-actions">
                                                                {currentStatus === 'รอชำระ' && (
                                                                    <span className="admin-soft-badge">รอลูกค้าแนบสลิป</span>
                                                                )}
                                                                {canConfirmPayment && (
                                                                    <button className="admin-action success" disabled={isSaving} onClick={() => runOrderStep(order, getApproveStatus(order))}>
                                                                        ยืนยันการชำระเงิน
                                                                    </button>
                                                                )}
                                                                {canSaveTracking && (
                                                                    <button className="admin-action primary" disabled={isSaving} onClick={() => runOrderStep(order, 'จัดส่งแล้ว')}>
                                                                        บันทึกเลขพัสดุ
                                                                    </button>
                                                                )}
                                                                {canMarkReadyForPickup && (
                                                                    <button className="admin-action primary" disabled={isSaving} onClick={() => runOrderStep(order, 'พร้อมรับ')}>
                                                                        พร้อมรับ
                                                                    </button>
                                                                )}
                                                                {currentStatus === 'เตรียมสินค้า' && (
                                                                    <span className="admin-soft-badge">กำลังเตรียมสินค้าให้ลูกค้า</span>
                                                                )}
                                                                {currentStatus === 'พร้อมรับ' && (
                                                                    <span className="admin-soft-badge">พร้อมให้ลูกค้ารับหน้าร้าน</span>
                                                                )}
                                                                {currentStatus === 'จัดส่งแล้ว' && (
                                                                    <span className="admin-soft-badge">จบออเดอร์แล้ว</span>
                                                                )}
                                                                {currentStatus === 'ยกเลิก' && (
                                                                    <span className="admin-soft-badge">ยกเลิกและคืนสต็อกแล้ว</span>
                                                                )}
                                                                <button className="admin-action warning" onClick={() => openOrderPrintDocument(order, 'checklist')}>
                                                                    พิมพ์ใบเช็ค
                                                                </button>
                                                                <button className="admin-action primary" onClick={() => downloadOrderBill(order)}>
                                                                    ดาวน์โหลดบิล
                                                                </button>
                                                                <button className="admin-action danger" onClick={() => onDeleteOrder(order.id)}>
                                                                    ลบออเดอร์
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7">
                                        <div className="admin-empty">ยังไม่มีประวัติการสั่งซื้อในระบบ</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

        </div>
    );
}

export default AdminDashboardPage;
