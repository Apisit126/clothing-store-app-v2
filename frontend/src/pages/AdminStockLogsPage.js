import { useMemo, useState } from 'react';

const dateFormatter = new Intl.DateTimeFormat('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
});

const getLocalDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const groupLogsByDay = (logs, dateField) => logs.reduce((groups, log) => {
    const rawDate = log[dateField];
    const date = rawDate ? new Date(rawDate) : null;
    const isValidDate = date && !Number.isNaN(date.getTime());
    const key = isValidDate ? getLocalDateKey(date) : 'unknown';
    const label = isValidDate ? dateFormatter.format(date) : 'ไม่ระบุวันที่';
    const time = isValidDate ? timeFormatter.format(date) : '-';
    const existingGroup = groups.find((group) => group.key === key);

    if (existingGroup) {
        existingGroup.items.push({ ...log, displayTime: time });
    } else {
        groups.push({
            key,
            label,
            items: [{ ...log, displayTime: time }],
        });
    }

    return groups;
}, []);

function AdminStockLogsPage({ stockLogs, systemLogs = [], deleteLogTarget, setDeleteLogTarget, onDeleteLog }) {
    const [activityView, setActivityView] = useState('stock');
    const groupedStockLogs = useMemo(() => groupLogsByDay(stockLogs, 'created_at'), [stockLogs]);
    const groupedSystemLogs = useMemo(() => groupLogsByDay(systemLogs, 'log_date'), [systemLogs]);

    return (
        <div className="card border-0 shadow-sm rounded-4 p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h4 className="fw-bold mb-1">ประวัติการเคลื่อนไหว</h4>
                    <small className="text-muted">ตรวจสอบประวัติสต็อกและบันทึกการทำงานของแอดมินแบบแยกตามวัน</small>
                </div>
                <div className="admin-subtabs">
                    <button
                        type="button"
                        className={activityView === 'stock' ? 'active' : ''}
                        onClick={() => setActivityView('stock')}
                    >
                        ประวัติสต็อก
                    </button>
                    <button
                        type="button"
                        className={activityView === 'system' ? 'active' : ''}
                        onClick={() => setActivityView('system')}
                    >
                        บันทึกแอดมิน
                    </button>
                </div>
            </div>

            {activityView === 'stock' && (
                <div className="activity-day-list">
                    {groupedStockLogs.length > 0 ? (
                        groupedStockLogs.map((group) => (
                            <section className="activity-day-section" key={group.key}>
                                <div className="activity-day-header">
                                    <div>
                                        <span className="activity-day-kicker">รายการของวัน</span>
                                        <h5>{group.label}</h5>
                                    </div>
                                    <span className="activity-day-count">{group.items.length} รายการ</span>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0 activity-table">
                                        <colgroup>
                                            <col className="activity-col-time" />
                                            <col className="activity-col-product" />
                                            <col className="activity-col-user" />
                                            <col className="activity-col-amount" />
                                            <col className="activity-col-remark" />
                                            <col className="activity-col-action" />
                                        </colgroup>
                                        <thead className="table-light text-muted small">
                                            <tr>
                                                <th>เวลา</th>
                                                <th>สินค้า</th>
                                                <th>ผู้ทำรายการ</th>
                                                <th className="text-center">จำนวน</th>
                                                <th>หมายเหตุ</th>
                                                <th className="text-center">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.items.map((log) => (
                                                <tr key={log.id}>
                                                    <td className="small fw-bold text-nowrap">{log.displayTime}</td>
                                                    <td><strong>{log.product_name}</strong></td>
                                                    <td><span className="badge bg-light text-dark border">{log.admin_name || 'ระบบ'}</span></td>
                                                    <td className="text-center fw-bold">
                                                        <span className={log.amount >= 0 ? 'text-success' : 'text-danger'}>{log.amount > 0 ? `+${log.amount}` : log.amount}</span>
                                                    </td>
                                                    <td className="small text-muted">{log.remark}</td>
                                                    <td className="text-center">
                                                        {!String(log.remark || '').includes('[รายการถูกลบ]') && (
                                                            <button className="btn btn-sm btn-outline-danger border-0" onClick={() => setDeleteLogTarget({ id: log.id, remark: '' })}>ลบ</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        ))
                    ) : (
                        <div className="activity-empty-state">ยังไม่มีประวัติสต็อก</div>
                    )}
                </div>
            )}

            {activityView === 'system' && (
                <div className="activity-day-list">
                    {groupedSystemLogs.length > 0 ? (
                        groupedSystemLogs.map((group) => (
                            <section className="activity-day-section" key={group.key}>
                                <div className="activity-day-header">
                                    <div>
                                        <span className="activity-day-kicker">รายการของวัน</span>
                                        <h5>{group.label}</h5>
                                    </div>
                                    <span className="activity-day-count">{group.items.length} รายการ</span>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0 activity-table">
                                        <colgroup>
                                            <col className="activity-col-time" />
                                            <col className="activity-col-system-user" />
                                            <col className="activity-col-role" />
                                            <col className="activity-col-system-action" />
                                            <col className="activity-col-system-remark" />
                                        </colgroup>
                                        <thead className="table-light text-muted small">
                                            <tr>
                                                <th>เวลา</th>
                                                <th>ผู้ทำรายการ</th>
                                                <th>สิทธิ์</th>
                                                <th>การทำงาน</th>
                                                <th>หมายเหตุ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.items.map((log) => (
                                                <tr key={log.id}>
                                                    <td className="small fw-bold text-nowrap">{log.displayTime}</td>
                                                    <td>
                                                        <strong>{log.full_name || log.username || 'ระบบ'}</strong>
                                                        {log.username && <small className="text-muted d-block">บัญชี: {log.username}</small>}
                                                    </td>
                                                    <td><span className="badge bg-light text-dark border">{log.role || '-'}</span></td>
                                                    <td className="fw-bold">{log.action}</td>
                                                    <td className="small text-muted">{log.remark || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        ))
                    ) : (
                        <div className="activity-empty-state">ยังไม่มีบันทึกแอดมิน</div>
                    )}
                </div>
            )}

            {deleteLogTarget.id && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1300 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg p-3">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="fw-bold text-danger">ยืนยันการลบรายการประวัติ</h5>
                            </div>
                            <div className="modal-body">
                                <p className="text-muted small">รายการจะถูกลบออกจากตาราง และบันทึกหมายเหตุการลบไว้แทน</p>
                                <label className="small fw-bold mb-2">ระบุเหตุผลที่ต้องการลบ *</label>
                                <textarea className="form-control border-danger-subtle" rows="3" value={deleteLogTarget.remark} onChange={(e) => setDeleteLogTarget({ ...deleteLogTarget, remark: e.target.value })}></textarea>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button className="btn btn-light rounded-pill px-4" onClick={() => setDeleteLogTarget({ id: null, remark: '' })}>ยกเลิก</button>
                                <button className="btn btn-danger rounded-pill px-4 fw-bold" onClick={onDeleteLog}>ยืนยันการลบ</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminStockLogsPage;
