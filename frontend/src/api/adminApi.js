import apiClient from './client';

export const getAdminOrders = () => apiClient.get('/api/admin/orders');

export const getAdminOrderItems = (orderId) => apiClient.get(`/api/admin/order-items/${orderId}`);

export const deleteAdminOrder = (orderId, userId) => apiClient.post('/api/admin/orders/delete', {
    order_id: orderId,
    user_id: userId,
});

export const updateOrderStatus = (orderId, status, trackingNo = '', userId = null) => apiClient.put(`/api/orders/${orderId}/status`, {
    status,
    tracking_no: trackingNo,
    user_id: userId,
});

export const getCustomers = () => apiClient.get('/api/admin/customers');

export const changeUserRole = (userId, newRole) => apiClient.post('/api/admin/change-role', {
    user_id: userId,
    new_role: newRole,
});

export const deleteUser = (userId) => apiClient.delete(`/api/admin/users/${userId}`);

export const updateUser = (userId, payload) => apiClient.put(`/api/admin/users/${userId}`, payload);

export const updateUserStatus = (userId, statusUser) => apiClient.patch(`/api/admin/users/${userId}/status`, {
    status_user: statusUser,
});

export const getStockLogs = () => apiClient.get('/api/admin/stock-logs');

export const getSystemLogs = () => apiClient.get('/api/admin/system-logs');

export const deleteStockLog = (payload) => apiClient.post('/api/admin/stock-logs/delete', payload);
