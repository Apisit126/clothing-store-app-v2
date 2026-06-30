import { useEffect, useMemo, useState } from 'react';

const emptyThaiAddressData = {
    provinces: [],
    districts: [],
    subDistricts: [],
};

const getPublicJsonPath = (fileName) => `${process.env.PUBLIC_URL || ''}/api-thai/json/${fileName}`;
const getName = (item) => item?.name_th || '';
const getZipCode = (item) => (item?.zip_code ? String(item.zip_code) : '');

function ProfileModal({
    user,
    username,
    password,
    fullName,
    email,
    phone,
    setUsername,
    setPassword,
    setFullName,
    setEmail,
    setPhone,
    addresses,
    addressForm,
    setAddressForm,
    onSaveAddress,
    onSelectAddress,
    onNewAddress,
    onSetDefaultAddress,
    onSave,
    onClose,
}) {
    const [activeTab, setActiveTab] = useState('account');
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [thaiAddressData, setThaiAddressData] = useState(emptyThaiAddressData);
    const [isThaiAddressLoading, setIsThaiAddressLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        Promise.all([
            fetch(getPublicJsonPath('provinces.json')).then((response) => response.json()),
            fetch(getPublicJsonPath('districts.json')).then((response) => response.json()),
            fetch(getPublicJsonPath('sub_districts.json')).then((response) => response.json()),
        ])
            .then(([provinces, districts, subDistricts]) => {
                if (!isMounted) return;
                setThaiAddressData({
                    provinces: provinces.filter((province) => !province.deleted_at),
                    districts: districts.filter((district) => !district.deleted_at),
                    subDistricts: subDistricts.filter((subDistrict) => !subDistrict.deleted_at),
                });
            })
            .catch(() => {
                if (isMounted) setThaiAddressData(emptyThaiAddressData);
            })
            .finally(() => {
                if (isMounted) setIsThaiAddressLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const selectedProvince = useMemo(
        () => thaiAddressData.provinces.find((province) => getName(province) === addressForm.province),
        [addressForm.province, thaiAddressData.provinces]
    );

    const districtChoices = useMemo(
        () => selectedProvince ? thaiAddressData.districts.filter((district) => district.province_id === selectedProvince.id) : [],
        [selectedProvince, thaiAddressData.districts]
    );

    const selectedDistrict = useMemo(
        () => districtChoices.find((district) => getName(district) === addressForm.district),
        [addressForm.district, districtChoices]
    );

    const subDistrictChoices = useMemo(
        () => selectedDistrict ? thaiAddressData.subDistricts.filter((subDistrict) => subDistrict.district_id === selectedDistrict.id) : [],
        [selectedDistrict, thaiAddressData.subDistricts]
    );

    const postalCodeChoices = useMemo(() => {
        const postalCodes = subDistrictChoices.map(getZipCode).filter(Boolean);
        return [...new Set(postalCodes)];
    }, [subDistrictChoices]);

    const hasThaiAddressData = thaiAddressData.provinces.length > 0;
    const addressList = Array.isArray(addresses) ? addresses : [];
    const addressCount = addressList.length;
    const displayName = fullName || user?.full_name || username || user?.username || 'ลูกค้า';
    const initials = (displayName || 'U').trim().charAt(0).toUpperCase();
    const defaultAddress = addressList.find((address) => Number(address.is_default) === 1);

    const handleProvinceChange = (provinceName) => {
        setAddressForm({
            ...addressForm,
            province: provinceName,
            district: '',
            subdistrict: '',
            postal_code: '',
        });
    };

    const handleDistrictChange = (districtName) => {
        setAddressForm({
            ...addressForm,
            district: districtName,
            subdistrict: '',
            postal_code: '',
        });
    };

    const handleSubDistrictChange = (subDistrictName) => {
        const selectedSubDistrict = subDistrictChoices.find((subDistrict) => getName(subDistrict) === subDistrictName);
        setAddressForm({
            ...addressForm,
            subdistrict: subDistrictName,
            postal_code: getZipCode(selectedSubDistrict),
        });
    };

    const handleNewAddress = () => {
        onNewAddress();
        setShowAddressForm(true);
    };

    const handleEditAddress = (address) => {
        onSelectAddress(address);
        setShowAddressForm(true);
    };

    return (
        <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
            <div className="profile-modal-dialog">
                <div className="profile-modal-panel">
                    <header className="profile-modal-header">
                        <div className="profile-header-copy">
                            <span className="profile-eyebrow">My Account</span>
                            <h2 id="profile-modal-title">โปรไฟล์ของฉัน</h2>
                            <p>จัดการข้อมูลบัญชี รหัสผ่าน และที่อยู่สำหรับจัดส่งสินค้า</p>
                        </div>
                        <button type="button" className="profile-close-button" onClick={onClose} aria-label="ปิดโปรไฟล์">
                            &times;
                        </button>
                    </header>

                    <div className="profile-modal-body">
                        <aside className="profile-summary-card">
                            <div className="profile-avatar">{initials}</div>
                            <div>
                                <strong>{displayName}</strong>
                                <span>{email || 'ยังไม่ได้ระบุอีเมล'}</span>
                            </div>
                            <div className="profile-summary-grid">
                                <div>
                                    <span>ชื่อผู้ใช้</span>
                                    <strong>{username || user?.username || '-'}</strong>
                                </div>
                                <div>
                                    <span>ที่อยู่</span>
                                    <strong>{addressCount} รายการ</strong>
                                </div>
                            </div>
                            <div className="profile-default-address">
                                <span>ที่อยู่หลัก</span>
                                <p>{defaultAddress ? `${defaultAddress.receiver_name} - ${defaultAddress.province || ''}` : 'ยังไม่ได้ตั้งค่าที่อยู่หลัก'}</p>
                            </div>
                        </aside>

                        <section className="profile-content-card">
                            <div className="profile-tabs" role="tablist" aria-label="เลือกเมนูโปรไฟล์">
                                <button type="button" className={activeTab === 'account' ? 'active' : ''} onClick={() => setActiveTab('account')}>
                                    บัญชีผู้ใช้
                                </button>
                                <button type="button" className={activeTab === 'address' ? 'active' : ''} onClick={() => setActiveTab('address')}>
                                    ที่อยู่จัดส่ง
                                </button>
                            </div>

                            {activeTab === 'account' ? (
                                <div className="profile-section">
                                    <div className="profile-section-heading">
                                        <div>
                                            <span>Account details</span>
                                            <h3>ข้อมูลบัญชี</h3>
                                        </div>
                                        {!showAccountForm && (
                                            <button type="button" className="profile-secondary-button" onClick={() => setShowAccountForm(true)}>
                                                แก้ไขบัญชี
                                            </button>
                                        )}
                                    </div>

                                    <form onSubmit={onSave} className="profile-form">
                                        <label>
                                            <span>ชื่อผู้ใช้</span>
                                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!showAccountForm} />
                                        </label>
                                        <label>
                                            <span>ชื่อ-นามสกุล</span>
                                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!showAccountForm} />
                                        </label>
                                        <label>
                                            <span>อีเมล</span>
                                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!showAccountForm} />
                                        </label>
                                        <label>
                                            <span>เบอร์โทร</span>
                                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!showAccountForm} />
                                        </label>
                                        {showAccountForm && (
                                            <label className="profile-form-wide">
                                                <span>รหัสผ่านใหม่</span>
                                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="ปล่อยว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน" />
                                            </label>
                                        )}
                                        {showAccountForm && (
                                            <div className="profile-actions profile-form-wide">
                                                <button type="button" className="profile-ghost-button" onClick={() => setShowAccountForm(false)}>
                                                    ยกเลิก
                                                </button>
                                                <button type="submit" className="profile-primary-button">
                                                    บันทึกบัญชี
                                                </button>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            ) : (
                                <div className="profile-address-layout">
                                    <div className="profile-address-list">
                                        <div className="profile-section-heading">
                                            <div>
                                                <span>Delivery</span>
                                                <h3>ที่อยู่ของฉัน</h3>
                                            </div>
                                            <button type="button" className="profile-secondary-button" onClick={handleNewAddress}>
                                                เพิ่มใหม่
                                            </button>
                                        </div>

                                        <div className="profile-address-stack">
                                            {addressCount === 0 ? (
                                                <div className="profile-empty-state">ยังไม่มีที่อยู่</div>
                                            ) : (
                                                addressList.map((address) => (
                                                    <article className="profile-address-card" key={address.address_id}>
                                                        <div>
                                                            <strong>{address.receiver_name}</strong>
                                                            <p>{address.address_detail}</p>
                                                            <span>{[address.subdistrict, address.district, address.province, address.postal_code].filter(Boolean).join(' ')}</span>
                                                            {Number(address.is_default) === 1 && <em>ที่อยู่หลัก</em>}
                                                        </div>
                                                        <button type="button" onClick={() => handleEditAddress(address)}>
                                                            แก้ไข
                                                        </button>
                                                    </article>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="profile-address-editor">
                                        {showAddressForm ? (
                                            <form onSubmit={onSaveAddress} className="profile-form">
                                                <label>
                                                    <span>ชื่อผู้รับ</span>
                                                    <input value={addressForm.receiver_name} onChange={(e) => setAddressForm({ ...addressForm, receiver_name: e.target.value })} required />
                                                </label>
                                                <label>
                                                    <span>เบอร์โทร</span>
                                                    <input value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} />
                                                </label>
                                                <label className="profile-form-wide">
                                                    <span>ที่อยู่</span>
                                                    <textarea rows="3" value={addressForm.address_detail} onChange={(e) => setAddressForm({ ...addressForm, address_detail: e.target.value })} required />
                                                </label>
                                                <label>
                                                    <span>จังหวัด</span>
                                                    <select
                                                        value={addressForm.province}
                                                        onChange={(e) => handleProvinceChange(e.target.value)}
                                                        disabled={isThaiAddressLoading || !hasThaiAddressData}
                                                        required
                                                    >
                                                        <option value="">{isThaiAddressLoading ? 'กำลังโหลดจังหวัด' : 'เลือกจังหวัด'}</option>
                                                        {addressForm.province && !thaiAddressData.provinces.some((province) => getName(province) === addressForm.province) && (
                                                            <option value={addressForm.province}>{addressForm.province}</option>
                                                        )}
                                                        {thaiAddressData.provinces.map((province) => (
                                                            <option key={province.id} value={getName(province)}>{getName(province)}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label>
                                                    <span>อำเภอ/เขต</span>
                                                    <select
                                                        value={addressForm.district}
                                                        onChange={(e) => handleDistrictChange(e.target.value)}
                                                        disabled={!selectedProvince}
                                                        required
                                                    >
                                                        <option value="">{selectedProvince ? 'เลือกอำเภอ/เขต' : 'เลือกจังหวัดก่อน'}</option>
                                                        {addressForm.district && !districtChoices.some((district) => getName(district) === addressForm.district) && (
                                                            <option value={addressForm.district}>{addressForm.district}</option>
                                                        )}
                                                        {districtChoices.map((district) => (
                                                            <option key={district.id} value={getName(district)}>{getName(district)}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label>
                                                    <span>ตำบล/แขวง</span>
                                                    <select
                                                        value={addressForm.subdistrict}
                                                        onChange={(e) => handleSubDistrictChange(e.target.value)}
                                                        disabled={!selectedDistrict}
                                                        required
                                                    >
                                                        <option value="">{selectedDistrict ? 'เลือกตำบล/แขวง' : 'เลือกอำเภอ/เขตก่อน'}</option>
                                                        {addressForm.subdistrict && !subDistrictChoices.some((subDistrict) => getName(subDistrict) === addressForm.subdistrict) && (
                                                            <option value={addressForm.subdistrict}>{addressForm.subdistrict}</option>
                                                        )}
                                                        {subDistrictChoices.map((subDistrict) => (
                                                            <option key={subDistrict.id} value={getName(subDistrict)}>{getName(subDistrict)}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label>
                                                    <span>รหัสไปรษณีย์</span>
                                                    <select
                                                        value={addressForm.postal_code}
                                                        onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                                                        disabled={!selectedDistrict}
                                                        required
                                                    >
                                                        <option value="">{selectedDistrict ? 'เลือกรหัสไปรษณีย์' : 'เลือกอำเภอ/เขตก่อน'}</option>
                                                        {addressForm.postal_code && !postalCodeChoices.includes(String(addressForm.postal_code)) && (
                                                            <option value={addressForm.postal_code}>{addressForm.postal_code}</option>
                                                        )}
                                                        {postalCodeChoices.map((postalCode) => (
                                                            <option key={postalCode} value={postalCode}>{postalCode}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label>
                                                    <span>ประเภทที่อยู่</span>
                                                    <input value={addressForm.address_type} onChange={(e) => setAddressForm({ ...addressForm, address_type: e.target.value })} placeholder="บ้าน / ที่ทำงาน" />
                                                </label>
                                                <label className="profile-check-row">
                                                    <input
                                                        type="checkbox"
                                                        checked={Number(addressForm.is_default) === 1}
                                                        onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked ? 1 : 0 })}
                                                    />
                                                    <span>ตั้งเป็นที่อยู่หลัก</span>
                                                </label>
                                                <div className="profile-actions profile-form-wide">
                                                    {addressForm.address_id && Number(addressForm.is_default) !== 1 && (
                                                        <button type="button" className="profile-ghost-button" onClick={() => onSetDefaultAddress(addressForm)}>
                                                            ใช้เป็นที่อยู่หลัก
                                                        </button>
                                                    )}
                                                    <button type="button" className="profile-ghost-button" onClick={() => setShowAddressForm(false)}>
                                                        ยกเลิก
                                                    </button>
                                                    <button type="submit" className="profile-primary-button">
                                                        บันทึกที่อยู่
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="profile-empty-state is-editor">
                                                กดเพิ่มใหม่หรือแก้ไขเพื่อกรอกข้อมูลที่อยู่
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfileModal;
