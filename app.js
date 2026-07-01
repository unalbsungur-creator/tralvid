var pendingAttachments = [];
// ==================== HAFIZA ENTEGRASYONU ====================
var initialComplaints = [
    { id: 1, kw: 'KW17', quarter: 'Q2', user: 'ÜNAL BÜYÜKSUNGUR', date: '2025-04-25', timeout: 'Hayır', sn: 'Hayır', booking: '1283842', subbooking: '1283945', adult: 1, child: 0, infant: 0, bdate: '2025-04-25', adate: '2025-04-16', veranstalter: 'HOLIDAY CHECK TOURISTIC', partner: 'IC', Verursacher: 'Acente Operasyon', region: 'ANTALYA', airport: 'AYT', servis: 'Transfer', hotel: 'ADALYA ELITE LARA', transfertype: 'VIP', ptr: 'Transfer ( yok )', pde: 'Transfer ( kein Transfer gebucht )', pen: 'Transfer (no transfer booked)', result: 'Haksız', price: 0, currency: 'EUR', notes: '' },
    { id: 2, kw: 'KW19', quarter: 'Q2', user: 'ÜNAL BÜYÜKSUNGUR', date: '2025-05-08', timeout: 'Hayır', sn: 'Hayır', booking: '1727784', subbooking: '1286238', adult: 3, child: 0, infant: 0, bdate: '2025-05-06', adate: '2025-04-21', veranstalter: 'HOLIDAY CHECK TOURISTIC', partner: 'IC', Verursacher: 'Otel', region: 'ANTALYA', airport: 'AYT', servis: 'Transfer', hotel: 'AKRA HOTEL', transfertype: 'VIP', ptr: 'Transfer ( yok )', pde: 'Transfer (zum falschen Hotel gebracht)', pen: 'Transfer (taken to the wrong hotel)', result: 'Haklı', price: 125, currency: 'EUR', notes: 'Özel transfer şikayeti 125€ iade' }
];

var initialInvoices = [
    { id: 1, faturaNo: 'HDA2025000005763', tarih: '2025-05-08', partner: 'SWT', booking: '1295423', tutar: 18, doviz: 'EUR', durum: 'Kabul edildi', kabul: 'Evet', iadeTutar: 18, iadeDate: '2025-05-15', kesinti: 'Taksi masrafı mutabık' },
    { id: 2, faturaNo: 'HDS2025000000049', tarih: '2025-05-24', partner: 'HDS AYT OPERATIONS', booking: '1268795', tutar: 100, doviz: 'EUR', durum: 'İtiraz edildi', kabul: 'Hayır', iadeTutar: 0, iadeDate: '', kesinti: 'Sorumluluk kabul edilmiyor' }
];

if (!localStorage.getItem('tralvid_pages_complaints')) {
    localStorage.setItem('tralvid_pages_complaints', JSON.stringify(initialComplaints));
}
if (!localStorage.getItem('tralvid_pages_invoices')) {
    localStorage.setItem('tralvid_pages_invoices', JSON.stringify(initialInvoices));
}

var complaints = JSON.parse(localStorage.getItem('tralvid_pages_complaints')) || [];
var invoices = JSON.parse(localStorage.getItem('tralvid_pages_invoices')) || [];
var hotelPartners = JSON.parse(localStorage.getItem('tralvid_hotels')) || [];
var activityLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
var USERS = JSON.parse(localStorage.getItem('tralvid_users')) || {
    admin: { password: "123", role: "admin" },
    personel: { password: "123", role: "user" }
};

var currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');

var complaintEditMode = false;
var editingComplaintId = null;

function syncStorage() {
    localStorage.setItem('tralvid_pages_complaints', JSON.stringify(complaints));
    localStorage.setItem('tralvid_pages_invoices', JSON.stringify(invoices));
}

function addLog(action) {

    activityLogs.unshift({
        user: currentUser ? currentUser.username : '-',
        action: action,
        date: new Date().toLocaleString('tr-TR')
    });

    localStorage.setItem(
        'activityLogs',
        JSON.stringify(activityLogs)
    );
}

function applyPermissions() {
    if (!currentUser) return;
    var badge = document.getElementById('user-badge');
    if (badge) {
        badge.textContent = currentUser.username + ' (' + currentUser.role + ')';
    }
    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(function (el) {
            el.style.display = 'inline-block';
        });
        return;
    }
    document.querySelectorAll('.admin-only').forEach(function (el) {
        el.style.display = 'none';
    });
}

function login() {
    var user = document.getElementById('loginUser').value.trim();
    var pass = document.getElementById('loginPass').value.trim();

    if (!USERS[user]) {
        alert('Kullanıcı bulunamadı');
        return;
    }
    if (USERS[user].password !== pass) {
        alert('Şifre hatalı');
        return;
    }

    currentUser = {
        username: user,
        role: USERS[user].role,
        language: USERS[user].language || 'TR'
    };

    console.log(
        'LOGIN USER:',
        USERS[user]
    );

    sessionStorage.setItem(
        'currentUser',
        JSON.stringify(currentUser)
    );

    window.currentLanguage =
        currentUser.language;


    document.getElementById('login-modal').style.display = 'none';

    applyPermissions();

    initSessionTimeout();

    renderDashboard();
    renderRecordsTable();
    renderAccounting();

    showPage(
        localStorage.getItem('activePage') || 'dashboard'
    );

    showToast('Giriş başarılı');
}

function logout() {
    sessionStorage.removeItem('currentUser');
    location.reload();
}

// ==================== UTILITIES & FORMATTING ====================
function getKW(dateStr) {

    var date = new Date(dateStr);

    date.setHours(0, 0, 0, 0);

    date.setDate(
        date.getDate() + 3 - ((date.getDay() + 6) % 7)
    );

    var week1 = new Date(date.getFullYear(), 0, 4);

    var weekNo = 1 + Math.round(
        (
            (
                date.getTime() -
                week1.getTime()
            ) / 86400000
            - 3
            + ((week1.getDay() + 6) % 7)
        ) / 7
    );

    return 'KW' + String(weekNo).padStart(2, '0');
}

function getQuarter(dateStr) {
    var d = new Date(dateStr); if (isNaN(d.getTime())) return 'Q2';
    return 'Q' + Math.ceil((d.getMonth() + 1) / 3);
}

function fmt(n) { var num = parseFloat(n) || 0; return num % 1 === 0 ? num.toString() : num.toFixed(2); }
function truncate(str, len) { if (!str) return '—'; return str.length > len ? str.substring(0, len) + '…' : str; }

function countBy(arr, key) {
    var result = {};
    for (var i = 0; i < arr.length; i++) {
        var v = arr[i][key] || 'Diğer';
        result[v] = (result[v] || 0) + 1;
    }
    return result;
}

function showToast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    document.getElementById('toast-msg').textContent = msg;
    el.style.display = 'block';
    setTimeout(function () { el.style.display = 'none'; }, 3000);
}

function autoCalculateTimeFields() {
    var dVal = document.getElementById('c-date').value;
    if (dVal) {
        document.getElementById('c-kw').value = getKW(dVal);
        document.getElementById('c-quarter').value = getQuarter(dVal);
    }
}

// ==================== NAVİGASYON MODÜLÜ ====================
function showPage(page) {

    console.trace('SHOWPAGE =>', page);

    var pages = ['dashboard', 'records', 'accounting', 'users', 'data'];

    localStorage.setItem('activePage', page);

    for (var i = 0; i < pages.length; i++) {
        var pEl = document.getElementById('page-' + pages[i]);
        var nEl = document.getElementById('nav-' + pages[i]);
        if (pEl) pEl.classList.remove('active');
        if (nEl) nEl.classList.remove('active');
    }
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('nav-' + page).classList.add('active');

    if (page === 'dashboard') renderDashboard();
    if (page === 'records') renderRecordsTable();
    if (page === 'accounting') renderAccounting();
    if (page === 'users') renderUsers();
    if (page === 'data') renderDataManager();
}

// ==================== MODAL CONTROLS ====================
function openComplaintModal() {

    closeInvoiceModal();
    closeDetailModal();

    loadComplaintSubjects();

    loadSimpleDropdown(
        'c-veranstalter',
        'operators',
        'Operatör seçiniz...'
    );

    loadSimpleDropdown(
        'c-region',
        'regions',
        'Bölge seçiniz...'
    );

    loadSimpleDropdown(
        'c-airport',
        'airports',
        'Havalimanı seçiniz...'
    );

    loadSimpleDropdown(
        'c-service',
        'services',
        'Hizmet seçiniz...'
    );

    loadTransferTypeDropdown();

    var today = new Date().toISOString().split('T')[0];

    document.getElementById('c-date').value = today;

    if (document.getElementById('c-bdate')) {
        document.getElementById('c-bdate').value = today;
    }

    document.getElementById('c-adate').value = today;
    document.getElementById('c-ddate').value = today;

    document.getElementById('c-user').value =
        currentUser.username;

    autoCalculateTimeFields();

    toggleDefenseUnit();

    if (document.getElementById('c-timeout')) {
        document.getElementById('c-timeout').value = '';
    }

    document.getElementById('complaint-modal-overlay')
        .classList.add('open');
    console.log(
        document.getElementById("c-booking")
    );
}

function loadComplaintSubjects() {

    var reasonsTR =
        JSON.parse(
            localStorage.getItem('reasonsTR') || '[]'
        );

    var tr =
        document.getElementById('c-ptr');

    var tr2 =
        document.getElementById('c-ptr2');

    var tr3 =
        document.getElementById('c-ptr3');

    if (!tr) return;

    tr.innerHTML =
        '<option value="">Şikayet konusu seçiniz...</option>';

    if (tr2) {
        tr2.innerHTML =
            '<option value="">Şikayet konusu seçiniz...</option>';
    }

    if (tr3) {
        tr3.innerHTML =
            '<option value="">Şikayet konusu seçiniz...</option>';
    }

    for (var i = 0; i < reasonsTR.length; i++) {

        var option =
            '<option value="' + reasonsTR[i] + '">' +
            reasonsTR[i] +
            '</option>';

        tr.innerHTML += option;

        if (tr2) {
            tr2.innerHTML += option;
        }

        if (tr3) {
            tr3.innerHTML += option;
        }

    }

}

function loadTransferTypeDropdown() {

    var select =
        document.getElementById('c-transfertype');

    if (!select) return;

    var types =
        JSON.parse(
            localStorage.getItem('transferTypes')
        ) || [];

    select.innerHTML = '';

    var firstOption =
        document.createElement('option');

    firstOption.value = '';
    firstOption.textContent =
        'Transfer türü seçiniz...';

    select.appendChild(firstOption);

    types.forEach(function (type) {

        var option =
            document.createElement('option');

        option.value = type;
        option.textContent = type;

        select.appendChild(option);

    });

}

function loadSimpleDropdown(selectId, storageKey, placeholder) {

    var select =
        document.getElementById(selectId);

    if (!select) return;

    var items =
        JSON.parse(
            localStorage.getItem(storageKey)
        ) || [];

    console.log(
        'STORAGE KEY:',
        storageKey
    );

    console.log(
        'ITEMS:',
        items
    );

    console.log(
        'ITEM SAYISI:',
        items.length
    );

    select.innerHTML = '';

    var first =
        document.createElement('option');

    first.value = '';
    first.textContent =
        placeholder || 'Seçiniz...';

    select.appendChild(first);

    items.forEach(function (item) {

        var option =
            document.createElement('option');

        option.value = item.trim();
        option.textContent = item.trim();

        select.appendChild(option);

    });

}

function closeComplaintModal() {
    document.getElementById(
        'complaint-modal-overlay'
    ).classList.remove('open');
}

function openInvoiceModal() {

    closeComplaintModal();
    closeDetailModal();

    var today = new Date().toISOString().split('T')[0];

    document.getElementById('inv-date').value = today;

    document.getElementById('invoice-modal-overlay').classList.add('open');
}
function closeInvoiceModal() {
    document.getElementById('invoice-modal-overlay')
        .classList.remove('open');
}

function toggleDefenseUnit() {

    var area =
        document.getElementById('defense-unit-area');

    var value =
        document.getElementById(
            'c-defense-required'
        ).value;

    if (document.getElementById('c-sn')) {
        document.getElementById('c-sn').value = value;
    }

    var fileArea =
        document.getElementById('defense-file-area');

    if (fileArea) {
        fileArea.style.display =
            value === 'Evet' ? 'block' : 'none';
    }

    if (!area) return;

    if (value === 'Evet') {

        area.style.display = 'block';

    } else {

        area.style.display = 'none';

        document.getElementById(
            'c-defense-unit'
        ).value = '';
    }
}

function clearComplaintForm() {

    document.getElementById('c-defense-required').value = 'Hayır';

    document.getElementById('c-defense-unit').value = '';

    toggleDefenseUnit();
}

function closeDetailModal() {

    complaintEditMode = false;

    document.getElementById('detail-modal-overlay')
        .classList.remove('open');

}
// ================= FILE STORAGE (IndexedDB) =================

var fileDB = null;

var request = indexedDB.open('TRALVID_FILES', 2);

request.onupgradeneeded = function (event) {

    fileDB = event.target.result;

    if (!fileDB.objectStoreNames.contains('attachments')) {

        fileDB.createObjectStore(
            'attachments',
            { keyPath: 'id' }
        );

    }

    if (!fileDB.objectStoreNames.contains('reservations')) {

        fileDB.createObjectStore(
            'reservations',
            {
                keyPath: 'booking'
            }
        );

    }

    if (!fileDB.objectStoreNames.contains('flights')) {

        fileDB.createObjectStore(
            'flights',
            {
                keyPath: 'booking'
            }
        );

    }

    if (!fileDB.objectStoreNames.contains('transfers')) {

        fileDB.createObjectStore(
            'transfers',
            {
                keyPath: 'booking'
            }
        );

    }

    if (!fileDB.objectStoreNames.contains('passengers')) {

        fileDB.createObjectStore(
            'passengers',
            {
                autoIncrement: true
            }
        );

    }

};

request.onsuccess = function (event) {

    fileDB = event.target.result;

    console.log('IndexedDB hazır');

};

request.onerror = function (event) {

    console.error(
        'IndexedDB hatası:',
        event.target.error
    );

};

function saveAttachment(id, file) {

    return new Promise(function (resolve, reject) {

        var reader = new FileReader();

        reader.onload = function (e) {

            var tx =
                fileDB.transaction(
                    ['attachments'],
                    'readwrite'
                );

            var store =
                tx.objectStore('attachments');

            store.put({

                id: id,
                name: file.name,
                type: file.type,
                size: file.size,
                content: e.target.result

            });

            tx.oncomplete = function () {

                resolve();

            };

            tx.onerror = function () {

                reject();

            };

        };

        reader.readAsDataURL(file);

    });

}

function getAttachment(id) {

    return new Promise(function (resolve, reject) {

        var tx =
            fileDB.transaction(
                ['attachments'],
                'readonly'
            );

        var store =
            tx.objectStore('attachments');

        var req =
            store.get(id);

        req.onsuccess = function () {

            resolve(req.result);

        };

        req.onerror = function () {

            reject();

        };

    });

}

// ================= SESSION TIMEOUT =================

var SESSION_TIMEOUT = 30 * 60 * 1000;
var SESSION_WARNING = 28 * 60 * 1000;

var sessionTimer;
var warningTimer;

function resetSessionTimer() {

    clearTimeout(sessionTimer);
    clearTimeout(warningTimer);

    warningTimer = setTimeout(function () {

        if (confirm(
            'Oturumunuz 2 dakika içinde sonlanacak.\n\nDevam etmek istiyor musunuz?'
        )) {

            resetSessionTimer();

        }

    }, SESSION_WARNING);

    sessionTimer = setTimeout(function () {

        alert('Oturum süresi doldu. Güvenlik nedeniyle çıkış yapılıyor.');

        sessionStorage.removeItem('currentUser');

        location.reload();

    }, SESSION_TIMEOUT);
}

function initSessionTimeout() {

    [
        'mousemove',
        'click',
        'keydown',
        'scroll',
        'touchstart'
    ].forEach(function (eventName) {

        document.addEventListener(
            eventName,
            resetSessionTimer
        );

    });

    resetSessionTimer();
}

// ======================================================
// TRALVID MTR V2
// FIELD MAPPING ENGINE
// ======================================================

const FIELD_MAP = {

    bookingNumber: [

        "Booking",
        "Booking Number",
        "Reservation",
        "Reservation No",
        "Voucher",
        "Voucher Number",
        "Master Voucher",
        "Booking Ref",
        "Rezervasyon No",
        "Rez No",

        "Bu.-Nr.",
        "Buch.-Nr.",
        "Asıl Voucher"

    ],

    subBooking: [
        "Sub Booking",
        "SubBooking",
        "Alt Rezervasyon",
        "Alt Rezervasyon No",
        "Sub Reservation"
    ],

    operator: [
        "Operator",
        "Tour Operator",
        "Tur Operatörü",
        "Operatör",
        "Veranstalter"
    ],

    agency: [
        "Agency",
        "Acente"
    ],

    market: [
        "Market",
        "Source Market"
    ],

    hotel: [
        "Hotel",
        "Hotel Name",
        "Otel",
        "Accommodation",
        "Otel Adı"
    ],

    actualHotel: [
        "Actual Hotel",
        "Gerçek Otel"
    ],

    region: [
        "Region",
        "Bölge",
        "Hotel Region"
    ],

    airport: [
        "Airport",
        "Arrival Airport",
        "Havalimanı"
    ],

    checkIn: [
        "Check In",
        "Check-In",
        "Arrival Date",
        "Giriş Tarihi",
        "Hinreise"
    ],

    checkOut: [
        "Check Out",
        "Check-Out",
        "Departure Date",
        "Çıkış Tarihi",
        "Rückreise"
    ],

    nights: [
        "Night",
        "Nights",
        "Gece",
        "Geceleme",
        "Gün"
    ],

    board: [
        "Board",
        "Board Type",
        "Pansiyon"
    ],

    roomType: [
        "Room Type",
        "Room Type Name",
        "Oda Tipi",
        "Oda Tipi Tanımı"
    ],

    roomNo: [
        "Room",
        "Room No",
        "Oda"
    ],

    roomCount: [
        "Room Count",
        "Oda Sayısı"
    ],

    adult: [
        "Adult",
        "Adults",
        "Yetişkin"
    ],

    child: [
        "Child",
        "Children",
        "Çocuk"
    ],

    infant: [
        "Infant",
        "Bebek"
    ],

    transferType: [
        "Transfer Type",
        "Transfer",
        "Transfer Türü",
        "Transfer-Art"
    ],

    transferSupplier: [
        "Transfer Veranstalter",
        "Transfer Supplier",
        "Supplier"
    ],

    transferBookingNumber: [
        "Transfer Vorgangs-Nr.",
        "Transfer Booking Number",
        "Transfer Ref"
    ],

    title: [
        "Anrede",
        "Title"
    ],

    lastName: [
        "Name",
        "Last Name",
        "Surname"
    ],

    firstName: [
        "Vorname",
        "First Name"
    ],

    age: [
        "Alter",
        "Age"
    ],

    arrivalAirline: [
        "Hinflug Flugges.",
        "Arrival Airline"
    ],

    arrivalFlightNo: [
        "Hinflug Flug-Nr.",
        "Arrival Flight"
    ],

    arrivalAirportFrom: [
        "Hinflug Von",
        "Arrival From"
    ],

    arrivalAirportTo: [
        "Hinflug Nach",
        "Arrival To"
    ],

    arrivalDepartureTime: [
        "Hinflug Abflugzeit"
    ],

    arrivalArrivalTime: [
        "Hinflug Ankunftszeit"
    ],

    departureAirline: [
        "Rückflug Flugges.",
        "Departure Airline"
    ],

    departureFlightNo: [
        "Rückflug Flug-Nr."
    ],

    departureAirportFrom: [
        "Rückflug Von"
    ],

    departureAirportTo: [
        "Rückflug Nach"
    ],

    departureDepartureTime: [
        "Rückflug Abflugzeit"
    ],

    departureArrivalTime: [
        "Rückflug Ankunftszeit"
    ],

    country: [
        "Hotel Land",
        "Country"
    ],

    hotelCode: [
        "Otel"
    ]

};

// ======================================================
// TRALVID IMPORT PROFILES
// ======================================================

const IMPORT_PROFILES = {

    operation: {

        headers: [

            "Buch.-Nr.",
            "Transfer-Art",
            "Transfer Veranstalter",
            "Transfer Vorgangs-Nr.",
            "Hotel",
            "Hotel Region",
            "Hinflug Flug-Nr.",
            "Rückflug Flug-Nr.",
            "Vorname",
            "Name"

        ]

    },

    reservation: {

        headers: [

            "Asıl Voucher",
            "Voucher",
            "Otel",
            "Otel Adı",
            "Operatör",
            "Pansiyon",
            "Oda",
            "Oda Tipi Tanmı",
            "Giriş Tarihi",
            "Çıkış Tarihi"

        ]

    }

};

// ======================================================
// IMPORT PROFILE DETECTOR
// ======================================================

function detectImportProfile(headers) {

    var list =
        headers
            .filter(function (h) {

                return h !== undefined &&
                    h !== null &&
                    String(h).trim() !== "";

            })
            .map(function (h) {

                return String(h).trim();

            });

    var bestProfile = null;
    var bestScore = 0;

    for (var profile in IMPORT_PROFILES) {

        var score = 0;

        IMPORT_PROFILES[profile].headers
            .forEach(function (field) {

                if (list.includes(field)) {

                    score++;

                }

            });

        console.log(
            profile,
            score + "/" +
            IMPORT_PROFILES[profile].headers.length
        );

        if (score > bestScore) {

            bestScore = score;
            bestProfile = profile;

        }

    }

    if (bestScore === 0) {

        return null;

    }

    return bestProfile;

}

// ======================================================
// DETECT DATA GROUPS
// ======================================================

function detectDataGroups(headers) {

    var groups = {

        reservation: false,

        flight: false,

        transfer: false,

        passenger: false

    };

    headers.forEach(function (header) {

        var field =
            getMappedField(header);

        switch (field) {

            // ---------------- Reservation ----------------

            case "hotel":
            case "checkIn":
            case "checkOut":
            case "board":
            case "roomType":
            case "roomNo":
            case "roomCount":
            case "region":
            case "country":

                groups.reservation = true;
                break;

            // ---------------- Flight ----------------

            case "arrivalFlightNo":
            case "departureFlightNo":
            case "arrivalAirline":
            case "departureAirline":

                groups.flight = true;
                break;

            // ---------------- Transfer ----------------

            case "transferType":
            case "transferSupplier":
            case "transferBookingNumber":

                groups.transfer = true;
                break;

            // ---------------- Passenger ----------------

            case "title":
            case "firstName":
            case "lastName":
            case "age":

                groups.passenger = true;
                break;

        }

    });

    console.log(
        "DATA GROUPS",
        groups
    );

    return groups;

}

// ======================================================
// HEADER ROW DETECTOR
// ======================================================

function findHeaderRow(rows) {

    var maxRows =
        Math.min(rows.length, 15);

    for (var i = 0; i < maxRows; i++) {

        var row = rows[i];

        if (!row || !row.length)
            continue;

        var profile =
            detectImportProfile(row);

        if (profile) {

            console.log(
                "HEADER ROW:",
                i,
                "PROFILE:",
                profile
            );

            return {

                index: i,

                profile: profile

            };

        }

    }

    return null;

}



// ======================================================
// MTR FIELD FINDER
// ======================================================

// ======================================================
// HEADER NORMALIZER
// ======================================================

function normalizeHeader(text) {

    if (!text)
        return "";

    return String(text)
        .toUpperCase()
        .replace(/\./g, "")
        .replace(/-/g, "")
        .replace(/\s+/g, "")
        .trim();

}

function getMappedField(header) {

    if (!header)
        return null;

    var search =
        normalizeHeader(header);

    for (var field in FIELD_MAP) {

        var aliases =
            FIELD_MAP[field];

        for (var i = 0; i < aliases.length; i++) {

            if (

                normalizeHeader(
                    aliases[i]
                ) === search

            ) {

                return field;

            }

        }

    }

    return null;

}

// ======================================================
// MTR ROW MAPPER
// Excel Satırını TRALVID MTR Formatına Çevirir
// ======================================================

// ======================================================
// EMPTY MTR OBJECT
// ======================================================

function createEmptyMTR() {

    return {

        bookingNumber: "",
        subBooking: "",

        operator: "",
        agency: "",
        market: "",

        hotel: "",
        actualHotel: "",
        hotelCode: "",

        region: "",
        country: "",
        airport: "",

        checkIn: "",
        checkOut: "",
        nights: "",
        board: "",

        roomNo: "",
        roomType: "",
        roomCount: "",

        adult: 0,
        child: 0,
        infant: 0,

        transferType: "",
        transferSupplier: "",
        transferBookingNumber: "",

        title: "",
        firstName: "",
        lastName: "",
        age: "",

        arrivalAirline: "",
        arrivalFlightNo: "",
        arrivalAirportFrom: "",
        arrivalAirportTo: "",
        arrivalDepartureTime: "",
        arrivalArrivalTime: "",

        departureAirline: "",
        departureFlightNo: "",
        departureAirportFrom: "",
        departureAirportTo: "",
        departureDepartureTime: "",
        departureArrivalTime: ""

    };

}

function mapExcelRow(headers, row) {

    var mtr = createEmptyMTR();

    headers.forEach(function (header, index) {

        var field =
            getMappedField(header);

        if (field) {

            mtr[field] = row[index];

        }

    });

    return mtr;

}

// ======================================================
// BUILD TRALVID COLLECTIONS FROM MTR
// ======================================================

// ======================================================
// DETERMINE SERVICE SCOPE
// ======================================================

function determineServiceScope(mtr) {

    var hasHotel =
        String(
            mtr.hotel || ""
        ).trim() !== "";

    var hasTransfer =

        String(
            mtr.transferBookingNumber || ""
        ).trim() !== ""

        ||

        String(
            mtr.transferType || ""
        ).trim() !== ""

        ||

        String(
            mtr.transferSupplier || ""
        ).trim() !== "";

    if (hasHotel && hasTransfer)
        return "AT";

    if (hasHotel)
        return "OA";

    if (hasTransfer)
        return "OT";

    return "";

}

function buildCollectionsFromMTR(mtr) {

    return {

        reservation: {

            serviceScope:
                determineServiceScope(mtr),

            booking:
                mtr.bookingNumber,
            subBooking: mtr.subBooking,

            operator: mtr.operator,

            hotel: mtr.hotel,
            actualHotel: mtr.actualHotel,
            hotelCode: mtr.hotelCode,

            region: mtr.region,
            country: mtr.country,

            checkIn: mtr.checkIn,
            checkOut: mtr.checkOut,

            nights: Number(mtr.nights || 0),

            board: mtr.board,

            roomNo: mtr.roomNo,
            roomType: mtr.roomType,
            roomCount: Number(mtr.roomCount || 0),

            adult: Number(mtr.adult || 0),
            child: Number(mtr.child || 0),
            infant: Number(mtr.infant || 0)

        },

        flight: {

            booking: mtr.bookingNumber,

            arrivalAirline: mtr.arrivalAirline,
            arrivalFlightNo: mtr.arrivalFlightNo,
            arrivalFrom: mtr.arrivalAirportFrom,
            arrivalTo: mtr.arrivalAirportTo,
            arrivalDepartureTime: mtr.arrivalDepartureTime,
            arrivalArrivalTime: mtr.arrivalArrivalTime,

            departureAirline: mtr.departureAirline,
            departureFlightNo: mtr.departureFlightNo,
            departureFrom: mtr.departureAirportFrom,
            departureTo: mtr.departureAirportTo,
            departureDepartureTime: mtr.departureDepartureTime,
            departureArrivalTime: mtr.departureArrivalTime

        },

        transfer: {

            booking: mtr.bookingNumber,

            supplier: mtr.transferSupplier,

            transferNo: mtr.transferBookingNumber,

            transferType: mtr.transferType

        },

        passenger: {

            booking: mtr.bookingNumber,

            title: mtr.title,

            firstName: mtr.firstName,

            lastName: mtr.lastName,

            age: Number(mtr.age || 0),

            adult: Number(mtr.adult || 0),

            child: Number(mtr.child || 0),

            infant: Number(mtr.infant || 0)

        }

    };

}

// ======================================================
// DROPDOWN TEXT MATCH
// ======================================================

// ================= DATA ACTIONS =================

// ======================================================
// GET BOOKING DATA
// ======================================================

function getAllFromStore(storeName) {

    return new Promise(function (resolve, reject) {

        if (!fileDB) {

            reject(new Error("IndexedDB henüz hazır değil."));

            return;

        }

        var tx =
            fileDB.transaction(
                storeName,
                "readonly"
            );

        var store =
            tx.objectStore(storeName);

        var req =
            store.getAll();

        req.onsuccess = function () {

            resolve(req.result || []);

        };

        req.onerror = function () {

            reject(req.error);

        };

    });

}
async function loadBookingCollections() {

    return {

        reservations: await getAllFromStore("reservations"),

        flights: await getAllFromStore("flights"),

        transfers: await getAllFromStore("transfers"),

        passengers: await getAllFromStore("passengers")

    };

}

async function getBookingData(bookingNo) {

    var search =
        String(bookingNo)
            .trim()
            .toUpperCase();

    var data =
        await loadBookingCollections();

    var reservations =
        data.reservations;

    var flights =
        data.flights;

    var transfers =
        data.transfers;

    var passengers =
        data.passengers;

    var reservation =
        reservations.find(function (r) {

            return (
                String(r.booking || '')
                    .trim()
                    .toUpperCase() === search ||

                String(r.voucher || '')
                    .trim()
                    .toUpperCase() === search ||

                String(r.masterVoucher || '')
                    .trim()
                    .toUpperCase() === search
            );

        }) || null;

    var flight =
        flights.find(function (f) {

            return (
                String(f.booking || '')
                    .trim()
                    .toUpperCase() === search
            );

        }) || null;

    var transfer =
        transfers.find(function (t) {

            return (
                String(t.booking || '')
                    .trim()
                    .toUpperCase() === search
            );

        }) || null;

    var guestList =
        passengers.filter(function (p) {

            return (
                String(p.booking || '')
                    .trim()
                    .toUpperCase() === search
            );

        });

    return {

        reservation: reservation,

        flight: flight,

        transfer: transfer,

        passengers: guestList

    };

}


// ======================================================
// SAVE RESERVATIONS TO INDEXEDDB
// ======================================================

function saveReservationsToIndexedDB(data, callback) {

    var tx =
        fileDB.transaction(
            ['reservations'],
            'readwrite'
        );

    var store =
        tx.objectStore('reservations');

    data.forEach(function (item) {

        store.put(item);

    });

    tx.oncomplete = function () {

        console.log(
            data.length +
            " reservation IndexedDB'ye kaydedildi."
        );

        if (callback)
            callback();

    };

}

// ======================================================
// SAVE OPERATION DATA TO INDEXEDDB
// ======================================================

function mergeReservation(item) {

    return new Promise(function (resolve, reject) {

        var tx =
            fileDB.transaction(
                "reservations",
                "readwrite"
            );

        var store =
            tx.objectStore(
                "reservations"
            );

        var req =
            store.get(item.booking);

        req.onsuccess = function () {

            var old =
                req.result || {};

            var merged = {

                ...old,

                ...item

            };

            Object.keys(merged).forEach(function (k) {

                if (

                    merged[k] === "" ||

                    merged[k] === null ||

                    merged[k] === undefined

                ) {

                    merged[k] =
                        old[k];

                }

            });

            store.put(merged);

        };

        tx.oncomplete = function () {

            resolve();

        };

        tx.onerror = function (e) {

            reject(e);

        };

    });

}

async function saveReservation(item) {

    return new Promise(function (resolve, reject) {

        var tx =
            fileDB.transaction(
                "reservations",
                "readwrite"
            );

        var store =
            tx.objectStore(
                "reservations"
            );

        var req =
            store.get(item.booking);

        req.onsuccess = function () {

            var current =
                req.result || {};

            Object.keys(item).forEach(function (key) {

                var value = item[key];

                if (

                    value !== "" &&

                    value !== null &&

                    value !== undefined

                ) {

                    current[key] = value;

                }

            });

            store.put(current);

        };

        tx.oncomplete = function () {

            resolve();

        };

        tx.onerror = function (e) {

            reject(e);

        };

    });

}

function saveOperationData(data, callback) {

    var tx =
        fileDB.transaction(

            [
                'reservations',
                'flights',
                'transfers',
                'passengers'
            ],

            'readwrite'

        );

    var reservationStore =
        tx.objectStore('reservations');

    var flightStore =
        tx.objectStore('flights');

    var transferStore =
        tx.objectStore('transfers');

    var passengerStore =
        tx.objectStore('passengers');

    data.reservations.forEach(function (item) {

        reservationStore.put(item);

    });

    data.flights.forEach(function (item) {

        flightStore.put(item);

    });

    data.transfers.forEach(function (item) {

        transferStore.put(item);

    });

    data.passengers.forEach(function (item) {

        passengerStore.put(item);

    });

    tx.oncomplete = function () {

        console.log(
            "Operation data IndexedDB'ye kaydedildi."
        );

        console.log("IndexedDB yazımı tamamlandı.");

        if (callback)
            callback();

    };

    tx.onerror = function (e) {

        console.error(
            "IndexedDB kayıt hatası",
            e
        );

    };

}


// ================= DATA ACTIONS =================

async function renderDeveloperCenter() {

    var reservations =
        await getAllFromStore("reservations");

    var flights =
        await getAllFromStore("flights");

    var transfers =
        await getAllFromStore("transfers");

    var passengers =
        await getAllFromStore("passengers");

    var attachments =
        await getAllFromStore("attachments");

    document.getElementById(
        "developer-db-stats"
    ).innerHTML =

        "Reservations : " +
        reservations.length +

        "<br><br>" +

        "Flights : " +
        flights.length +

        "<br><br>" +

        "Transfers : " +
        transfers.length +

        "<br><br>" +

        "Passengers : " +
        passengers.length +

        "<br><br>" +

        "Attachments : " +
        attachments.length;

    var preview = "";

    if (reservations.length) {

        preview +=
            "<b>İlk Reservation</b><br>" +

            "Booking : " +
            (reservations[0].booking || "-") +

            "<br>Hotel : " +
            (reservations[0].hotel || "-") +

            "<br><br>";

    }

    if (flights.length) {

        preview +=
            "<b>İlk Flight</b><br>" +

            "Booking : " +
            (flights[0].booking || "-") +

            "<br>Flight : " +
            (flights[0].arrivalFlightNo || "-") +

            "<br><br>";

    }

    if (passengers.length) {

        preview +=
            "<b>İlk Passenger</b><br>" +

            "Booking : " +
            (passengers[0].booking || "-") +

            "<br>Ad Soyad : " +

            ((passengers[0].firstName || "") + " " +
                (passengers[0].lastName || "")).trim();

    }

    document.getElementById(
        "developer-preview"
    ).innerHTML = preview;

}

async function developerBookingTest() {

    alert("Developer Test V2");

    var booking =

        document.getElementById(
            "developer-booking"
        ).value.trim();

    if (!booking)
        return;

    var data =
        await getBookingData(booking);

    alert(JSON.stringify(data, null, 2));

    var html = "";

    html +=
        "<b>Reservation :</b> " +

        (data.reservation ? "✅" : "❌") +

        "<br>";

    html +=
        "<b>Flight :</b> " +

        (data.flight ? "✅" : "❌") +

        "<br>";

    html +=
        "<b>Transfer :</b> " +

        (data.transfer ? "✅" : "❌") +

        "<br>";

    html +=
        "<b>Passengers :</b> " +

        data.passengers.length +

        "<br><br>";



    if (data.reservation) {

        html +=

            "<b>Hotel :</b> " +

            (data.reservation.hotel || "-") +

            "<br>";

    }

    if (data.flight) {

        html +=

            "<b>Arrival Flight :</b> " +

            (data.flight.arrivalFlightNo || "-") +

            "<br>";

    }

    if (data.passengers.length) {

        html +=

            "<b>İlk Yolcu :</b> " +

            data.passengers[0].firstName +

            " " +

            data.passengers[0].lastName;

    }

    html += "<hr>";

    html += "<b>Operator :</b> " +
        (data.reservation?.operator || "-") +
        "<br>";

    html += "<b>Region :</b> " +
        (data.reservation?.region || "-") +
        "<br>";

    html += "<b>Hotel :</b> " +
        (data.reservation?.hotel || "-") +
        "<br>";

    html += "<b>Transfer Type :</b> " +
        (data.transfer?.transferType || "-") +
        "<br>";

    document.getElementById(
        "developer-booking-result"
    ).innerHTML = html;

    document.getElementById(

        "developer-booking-result"

    ).innerHTML = html;

}

function normalizeText(text) {

    return String(text || "")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9]/g, "");

}

function selectBestOption(selectId, searchText) {

    var select =
        document.getElementById(selectId);

    if (!select || !searchText)
        return;

    var search =
        normalizeText(searchText);

    var bestIndex = -1;
    var bestScore = 0;

    for (var i = 0; i < select.options.length; i++) {

        var option =
            normalizeText(
                select.options[i].text
            );

        if (!option)
            continue;

        if (option.indexOf(search) >= 0) {

            select.selectedIndex = i;

            return;

        }

        var score = 0;

        search.split(" ").forEach(function (part) {

            if (
                part &&
                option.indexOf(part) >= 0
            ) {
                score++;
            }

        });

        if (score > bestScore) {

            bestScore = score;

            bestIndex = i;

        }

    }

    if (bestIndex >= 0)
        select.selectedIndex = bestIndex;

}

async function fillPassengerData() {

    console.log("=== fillPassengerData BAŞLADI ===");

    var bookingNo =
        document.getElementById("c-booking")
            .value
            .trim();

    console.log("Booking =", bookingNo);

    if (!bookingNo)
        return;

    var formData =
        await getBookingData(bookingNo);

    console.log("BookingData =", formData);

    if (
        !formData.reservation &&
        !formData.flight &&
        !formData.transfer &&
        formData.passengers.length === 0
    ) {

        console.warn(
            "Rezervasyon bulunamadı:",
            bookingNo
        );

        return;

    }

    console.log("fillComplaintForm çağrılıyor...");

    fillComplaintForm(
        createFormData(formData)
    );

    console.log("fillComplaintForm tamamlandı.");

}
function clearComplaintAutoFields() {

    [
        "c-subbooking",
        "c-adult",
        "c-child",
        "c-infant",
        "c-voucher",
        "c-board",
        "c-nights",
        "c-roomtype",
        "c-adate",
        "c-ddate",
        "c-guests",
        "c-arrtime",
        "c-arrfrom",
        "c-arrto",
        "c-depairline",
        "c-deptime",
        "c-depfrom",
        "c-depto",
        "c-transferprovider"
    ].forEach(function (id) {

        var el =
            document.getElementById(id);

        if (el)
            el.value = "";

    });

}

}

function fillComplaintForm(formData) {

    clearComplaintAutoFields();

    fillDropdowns(formData);

    fillReservation(formData);

    fillGuests(formData);

    fillFlights(formData);

    fillTransfers(formData);

}

function fillReservation(formData) {

    var reservation = formData.reservation;

    if (!reservation)
        return;

    document.getElementById("c-subbooking").value =
        reservation.subBooking || "";

    document.getElementById("c-adult").value =
        reservation.adult || 0;

    document.getElementById("c-child").value =
        reservation.child || 0;

    document.getElementById("c-infant").value =
        reservation.infant || 0;

    document.getElementById("c-voucher").value =
        reservation.voucher || "";

    document.getElementById("c-board").value =
        reservation.board || "";

    document.getElementById("c-nights").value =
        reservation.nights || "";

    document.getElementById("c-roomtype").value =
        reservation.roomType || "";

    document.getElementById("c-adate").value =
        reservation.checkIn || "";

    document.getElementById("c-ddate").value =
        reservation.checkOut || "";

}

function fillGuests(formData) {

    var guests =
        formData.guests || [];

    var guestText = "";

    guests.forEach(function (g, index) {

        guestText +=
            (index + 1) + ". " +
            (g.title || "") + " " +
            (g.firstName || "") + " " +
            (g.lastName || "");

        if (g.age) {
            guestText +=
                " (" + g.age + ")";
        }

        guestText += "\n";

    });

    document.getElementById("c-guests").value =
        guestText.trim();

    var tbody =
        document.getElementById("c-guests-tbody");

    if (!tbody)
        return;

    if (!guests.length) {

        tbody.innerHTML =
            '<tr><td colspan="5" class="guest-table-empty">' +
            'Bu rezervasyon için misafir bulunamadı.' +
            '</td></tr>';

        return;

    }

    tbody.innerHTML = "";

    guests.forEach(function (g) {

        tbody.innerHTML +=
            "<tr>" +
            "<td>" + (g.title || "") + "</td>" +
            "<td>" + (g.firstName || "") + " " + (g.lastName || "") + "</td>" +
            "<td>" + (g.age || "") + "</td>" +
            "<td>" + (g.birthDate || "") + "</td>" +
            "<td><input type='radio' name='complaintOwner'></td>" +
            "</tr>";

    });

}

function fillFlights(formData) {

    var flight =
        formData.flight;

    if (!flight)
        return;

    // Geliş

    document.getElementById("c-arrairline").value =
        flight.arrivalAirline || "";

    document.getElementById("c-arrtime").value =
        flight.arrivalArrivalTime || "";

    document.getElementById("c-arrfrom").value =
        flight.arrivalFrom || "";

    document.getElementById("c-arrto").value =
        flight.arrivalTo || "";

    // Dönüş

    document.getElementById("c-depairline").value =
        flight.departureAirline || "";

    document.getElementById("c-deptime").value =
        flight.departureDepartureTime || "";

    document.getElementById("c-depfrom").value =
        flight.departureFrom || "";

    document.getElementById("c-depto").value =
        flight.departureTo || "";

}

function fillTransfers(formData) {

    var transfer =
        formData.transfer;

    if (!transfer)
        return;

    document.getElementById("c-transferprovider").value =
        transfer.supplier || "";

    selectBestOption(
        "c-transfertype",
        transfer.transferType
    );

}

function fillDropdowns(formData) {

    var reservation =
        formData.reservation;

    var transfer =
        formData.transfer;

    loadSimpleDropdown(
        "c-veranstalter",
        "operators"
    );

    loadSimpleDropdown(
        "c-region",
        "regions"
    );

    loadTransferTypeDropdown();

    loadHotelDropdown();

    if (reservation) {

        selectBestOption(
            "c-veranstalter",
            reservation.operator
        );

        selectBestOption(
            "c-region",
            reservation.region
        );

        selectBestOption(
            "c-hotel",
            reservation.hotel
        );

    }

    if (transfer) {

        selectBestOption(
            "c-transfertype",
            transfer.transferType
        );

    }

}
function handleDefenseFileInputChange(input) {

    Array.from(input.files).forEach(function (file) {

        pendingAttachments.push(file);

    });

    var html = '';

    pendingAttachments.forEach(function (file, index) {

        html +=
            (index + 1) +
            '. 📎 ' +
            file.name +
            ' <button type="button" onclick="removePendingFile(' +
            index +
            ')">❌</button><br>';

    });

    document
        .getElementById('defense-file-list')
        .innerHTML = html;

    input.value = '';
}

function removePendingFile(index) {

    pendingAttachments.splice(index, 1);

    var html = '';

    pendingAttachments.forEach(function (file, i) {

        html +=
            (i + 1) +
            '. 📎 ' +
            file.name +
            ' <button type="button" onclick="removePendingFile(' +
            i +
            ')">❌</button><br>';

    });

    document
        .getElementById('defense-file-list')
        .innerHTML = html;

}
function saveComplaint() {

    try {

        var booking =
            document.getElementById('c-booking')
                .value
                .trim();

        var veranstalter =
            document.getElementById('c-veranstalter')
                .value
                .trim();

        if (!booking) {

            alert(
                'Rezervasyon numarası zorunludur.'
            );

            return;
        }

        if (!veranstalter) {

            alert(
                'Tur operatörü seçiniz.'
            );

            return;
        }

        console.log('c-defense-required', document.getElementById('c-defense-required'));
        console.log('c-defense-unit', document.getElementById('c-defense-unit'));
        console.log('c-kw', document.getElementById('c-kw'));
        console.log('c-quarter', document.getElementById('c-quarter'));
        console.log('c-date', document.getElementById('c-date'));
        console.log('c-timeout', document.getElementById('c-timeout'));
        console.log('c-sn', document.getElementById('c-sn'));

        var rec = {
            id: complaints.length > 0 ? Math.max.apply(Math, complaints.map(function (o) { return o.id; })) + 1 : 1,
            kw: document.getElementById('c-kw').value,
            quarter: document.getElementById('c-quarter').value,
            user: currentUser.username,
            date: document.getElementById('c-date').value,
            timeout: document.getElementById('c-timeout').value,
            sn: document.getElementById('c-sn').value,
            booking: document.getElementById('c-booking').value.trim() || 'BOŞ',
            subbooking: document.getElementById('c-subbooking').value.trim(),
            adult: parseInt(document.getElementById('c-adult').value) || 0,
            child: parseInt(document.getElementById('c-child').value) || 0,
            infant: parseInt(document.getElementById('c-infant').value) || 0,
            bdate: document.getElementById('c-bdate').value,
            adate: document.getElementById('c-adate').value,
            ddate: document.getElementById('c-ddate').value,
            veranstalter: document.getElementById('c-veranstalter').value,
            partner: '',

            Verursacher:
                document.getElementById('c-verursacher').value,

            region:
                document.getElementById('c-region').value,

            airport:
                document.getElementById('c-airport').value,

            service:
                document.getElementById('c-service')
                    ? document.getElementById('c-service').value
                    : '',

            hotel:
                document.getElementById('c-hotel').value,

            transfertype:
                document.getElementById('c-transfertype')
                    ? document.getElementById('c-transfertype').value
                    : 'Shuttle',

            ptr: document.getElementById('c-ptr').value,

            ptr2:
                document.getElementById('c-ptr2')
                    ? document.getElementById('c-ptr2').value
                    : '',

            ptr3:
                document.getElementById('c-ptr3')
                    ? document.getElementById('c-ptr3').value
                    : '',

            result: document.getElementById('c-result').value,
            price: parseFloat(document.getElementById('c-price').value) || 0,
            currency: document.getElementById('c-currency').value,
            notes: document.getElementById('c-notes').value.trim(),

            defenseRequired:
                document.getElementById('c-defense-required').value,

            defenseUnit:
                document.getElementById('c-defense-unit')
                    ? document.getElementById('c-defense-unit').value
                    : '',

            defenseRequestedAt:
                document.getElementById('c-defense-required').value === 'Evet'
                    ? new Date().toISOString()
                    : '',

            defenseStatus:
                document.getElementById('c-defense-required').value === 'Evet'
                    ? 'Bekleniyor'
                    : 'Yok',

            defenseCompletedAt: '',

            attachments: [],

            isDeleted: false,
            deleteRequested: false,
            deletedBy: '',
            deletedAt: ''
        };

        console.log('PTR1=', rec.ptr);
        console.log('PTR2=', rec.ptr2);
        console.log('PTR3=', rec.ptr3);

        var files = pendingAttachments;

        Promise.all(

            files.map(function (file, index) {

                var fileId =
                    'CMP_' +
                    rec.id +
                    '_' +
                    index;

                rec.attachments.push({

                    id: fileId,
                    name: file.name,
                    type: file.type,
                    size: file.size

                });

                return saveAttachment(
                    fileId,
                    file
                );

            })

        ).then(function () {

            var existingComplaint =
                complaints.find(function (x) {

                    return x.booking === rec.booking;

                });

            if (existingComplaint) {

                alert(
                    'Bu rezervasyon numarası için zaten bir kayıt mevcut.\n\nRezervasyon No: ' +
                    rec.booking
                );

                openComplaintDetail(
                    existingComplaint.id
                );

                return;
            }

            complaints.unshift(rec);

            syncStorage();

            clearComplaintForm();

            closeComplaintModal();

            pendingAttachments = [];

            document.getElementById('defense-file-list').innerHTML = '';

            showToast(
                'Şikayet kartı veritabanına işlendi.'
            );

            renderRecordsTable();

            renderDashboard();

        });
    } catch (err) {
        console.error(err);
        alert("Kayıt sırasında hata oluştu:\n\n" + err.message);
    }
}


function saveInvoice() {
    var nextId = invoices.length > 0 ? Math.max.apply(Math, invoices.map(function (o) { return o.id; })) + 1 : 1;
    var rec = {
        id: nextId,
        faturaNo: document.getElementById('inv-no').value.trim() || 'INV-' + nextId,
        tarih: document.getElementById('inv-date').value,
        partner: document.getElementById('inv-partner').value,
        booking: document.getElementById('inv-booking').value.trim() || '—',
        tutar: parseFloat(document.getElementById('inv-tutar').value) || 0,
        doviz: document.getElementById('inv-doviz').value,
        durum: document.getElementById('inv-durum').value,
        kabul: document.getElementById('inv-kabul').value,
        iadeTutar: parseFloat(document.getElementById('inv-iade-tutar').value) || 0,
        iadeDate: document.getElementById('inv-iade-date').value,
        kesinti: document.getElementById('inv-kesinti').value.trim(),

        isDeleted: false,
        deleteRequested: false,
        deletedBy: '',
        deletedAt: ''
    };

    invoices.unshift(rec);
    syncStorage();
    closeInvoiceModal();
    showToast('Finansal fatura regress kaydı eklendi.');
    renderAccounting();
    renderDashboard();
}

// ==================== RENDERING ENGINE ====================
function completeDefense(id) {

    var rec = complaints.find(function (r) {
        return r.id == id;
    });

    if (!rec) return;

    rec.defenseStatus = 'Tamamlandı';

    rec.defenseCompletedAt =
        new Date().toISOString();

    syncStorage();

    renderDashboard();
    renderRecordsTable();

    openComplaintDetail(id);

    showToast(
        'Savunma tamamlandı olarak işaretlendi.'
    );
}

function updateDefenseStatus(id, status) {

    var rec = complaints.find(function (r) {
        return r.id == id;
    });

    if (!rec) return;

    rec.defenseStatus = status;

    if (
        (status === 'Savunma Geldi' ||
            status === 'Tamamlandı')
        &&
        !rec.defenseCompletedAt
    ) {
        rec.defenseCompletedAt =
            new Date().toISOString();
    }

    syncStorage();

    renderDashboard();
    renderRecordsTable();

    openComplaintDetail(id);

    showToast('Savunma durumu güncellendi.');
}

function renderRecordsTable() {
    var q = document.getElementById('rec-search').value.toLowerCase();
    var fs = document.getElementById('rec-filter-sonuc').value;
    var showDeleted =
        document.getElementById('showDeleted') &&
        document.getElementById('showDeleted').checked;
    var showCompletedDefense =
        document.getElementById('showCompletedDefense') &&
        document.getElementById('showCompletedDefense').checked;
    var tbody = document.getElementById('rec-tbody');
    if (!tbody) return;

    var visibleComplaints = complaints;

    if (
        currentUser &&
        currentUser.role !== 'admin'
    ) {
        visibleComplaints = complaints.filter(function (r) {
            return r.user === currentUser.username;
        });
    }

    var filtered = visibleComplaints.filter(function (r) {

        if (r.isDeleted && !showDeleted)
            return false;


        if (
            r.defenseStatus === 'Tamamlandı' &&
            !showCompletedDefense
        )
            return false;

        var haystack =
            (r.booking + r.user + r.ptr + r.veranstalter +
                r.region + r.hotel).toLowerCase();

        return (!q || haystack.indexOf(q) !== -1)
            && (!fs || r.result === fs);
    });

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px;">Kriterlere uygun müşteri şikayeti bulunamadı.</td></tr>';
        return;
    }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var r = filtered[i];

        var defenseInfo = getDefenseInfo(r);

        var icon = '⚪';

        if (defenseInfo.status === 'Bekleniyor')
            icon = '🟡';

        if (defenseInfo.status === 'Yaklaşıyor')
            icon = '🟠';

        if (defenseInfo.status === 'Kritik')
            icon = '🔴';

        if (defenseInfo.status === 'Süre Aşıldı')
            icon = '🚨';

        if (defenseInfo.status === 'Savunma Geldi')
            icon = '🔵';

        if (defenseInfo.status === 'Tamamlandı')
            icon = '🟢';

        if (defenseInfo.status === 'Yok')
            icon = '⚪';

        var defenseBadge =
            '<span style="color:' +
            defenseInfo.color +
            ';font-weight:700;">' +
            icon + ' ' +
            defenseInfo.status +
            (
                defenseInfo.remaining
                    ? ' (' + defenseInfo.remaining + ')'
                    : ''
            ) +
            '</span>';
        (
            defenseInfo.remaining
                ? ' (' + defenseInfo.remaining + ')'
                : ''
        ) +
            '</span>';
        var rowClass = '';

        if (r.isDeleted) {
            rowClass = 'deleted-row';
        }
        else if (r.defenseStatus === 'Tamamlandı') {
            rowClass = 'completed-row';
        }

        html += '<tr class="' + rowClass + '">' +

            '<td>' +
            '<input type="checkbox" class="complaint-select" value="' + r.id + '">' +
            '</td>' +

            '<td><span class="badge badge-gray">' + r.kw + '</span></td>' +
            '<td>' + r.date + '</td>' +
            '<td>' + truncate(r.user, 14) + '</td>' +
            '<td style="font-family:monospace; font-weight:bold;">' + r.booking + '</td>' +
            '<td>' + truncate(r.veranstalter, 18) + '</td>' +

            '<td>' + r.region + '</td>' +
            '<td>' + truncate(r.ptr || '-', 22) + '</td>' +

            '<td>' +
            defenseBadge +
            '</td>' +

            '<td><span class="badge ' +
            (r.result === 'Haklı' ? 'badge-green' : 'badge-red') +
            '">' + (r.result || '-') + '</span></td>' +
            '<td style="font-weight:600;">' + (r.price > 0 ? fmt(r.price) + ' ' + r.currency : '-') + '</td>' +
            '<td>' +
            (
                r.attachments && r.attachments.length > 0
                    ? '<span style="display:inline-block;width:42px;" title="Ek Dosyalar">📎(' + r.attachments.length + ')</span>'
                    : '<span style="display:inline-block;width:42px;"></span>'
            ) +

            '<button class="icon-btn" onclick="openComplaintDetail(' + r.id + ')" title="Detay Gör">&#128065;</button>' +

            (
                r.deleteRequested
                    ? '<span title="Admin Onayı Bekleniyor" style="color:#ff9800;font-size:18px;">⏳</span>'
                    : (
                        r.isDeleted
                            ? (
                                currentUser.role === 'admin'
                                    ? '<button class="icon-btn" onclick="restoreComplaint(' + r.id + ')" title="Geri Yükle">&#8635;</button>'
                                    : ''
                            )
                            : '<button class="icon-btn btn-delete" onclick="requestDeleteComplaint(' + r.id + ')" title="Silme Talebi">&#128465;</button>'
                    )
            ) +
            '</td>' +
            '</tr>';
    }
    tbody.innerHTML = html;
}

function toggleAllComplaints(cb) {

    document
        .querySelectorAll('.complaint-select')
        .forEach(function (c) {

            c.checked = cb.checked;

        });
}

function requestDeleteComplaint(id) {

    var rec = complaints.find(function (r) {
        return r.id === id;
    });

    if (!rec) return;

    if (rec.deleteRequested) {
        alert('Bu kayıt için zaten silme talebi gönderilmiş.');
        return;
    }

    if (currentUser.role === 'admin') {

        if (!confirm('Kayıt silinsin mi?')) {
            return;
        }

        rec.isDeleted = true;

        rec.deletedBy =
            currentUser.username;

        rec.deletedAt =
            new Date().toLocaleString('tr-TR');

        syncStorage();

        renderRecordsTable();
        renderDashboard();

        addLog(
            'Kayıt #' +
            id +
            ' silindi'
        );

        showToast('Kayıt silindi.');

        return;
    }

    localStorage.setItem('activePage', 'records');

    rec.deleteRequested = true;

    syncStorage();
    renderRecordsTable();

    addLog('Kayıt #' + id + ' için silme talebi gönderdi');

    showToast('Silme talebi gönderildi.');
}

function renderDeleteRequests() {

    var tbody = document.getElementById('delete-requests-body');
    var panel = document.getElementById('delete-requests-panel');

    if (!tbody || !panel) return;

    var pending = complaints.filter(function (r) {
        return r.deleteRequested === true && !r.isDeleted;
    });

    if (currentUser && currentUser.role === 'admin') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
        return;
    }

    tbody.innerHTML = '';

    pending.forEach(function (r) {

        tbody.innerHTML +=
            '<tr>' +
            '<td>' + (i + 1) + '</td>' +
            '<td>' + hotels[i] + '</td>' +
            '<td>' +

            '<button class="btn-secondary" ' +
            'onclick="editHotel(' + i + ')">' +
            '✏️</button> ' +

            '<button class="btn-delete" ' +
            'onclick="deleteHotel(' + i + ')">' +
            '🗑️</button>' +

            '</td>' +
            '</tr>';

    });
}

function approveDeleteComplaint(id) {

    var rec = complaints.find(function (r) {
        return r.id === id;
    });

    if (!rec) return;

    rec.isDeleted = true;
    rec.deleteRequested = false;
    rec.deletedBy = currentUser.username;
    rec.deletedAt = new Date().toISOString();

    syncStorage();

    renderDeleteRequests();
    renderRecordsTable();
    renderDashboard();

    addLog('Kayıt #' + id + ' silindi');

    showToast('Kayıt pasif olarak silindi.');
}

function rejectDeleteComplaint(id) {

    var rec = complaints.find(function (r) {
        return r.id === id;
    });

    if (!rec) return;

    rec.deleteRequested = false;

    localStorage.setItem('activePage', 'records');

    syncStorage();

    renderDeleteRequests();
    renderRecordsTable();
    renderDashboard();

    addLog('Kayıt #' + id + ' silme talebi reddedildi');

    showToast('Silme talebi reddedildi.');
}


function restoreComplaint(id) {

    var rec = complaints.find(function (r) {
        return r.id === id;
    });

    if (!rec) return;

    rec.isDeleted = false;
    rec.deletedBy = '';
    rec.deletedAt = '';
    localStorage.setItem('activePage', 'records');
    syncStorage();

    renderRecordsTable();
    renderDashboard();

    addLog('Kayıt #' + id + ' geri yüklendi');

    showToast('Kayıt geri yüklendi.');
}


function renderAccounting() {
    var fPart = document.getElementById('acc-filter-partner').value;
    var fDurum = document.getElementById('acc-filter-durum').value;
    var fDoviz = document.getElementById('acc-filter-doviz').value;

    var partnerMenu = document.getElementById('acc-filter-partner');
    if (partnerMenu && partnerMenu.options.length <= 1) {
        var pList = ['SWT', 'HDS AYT OPERATIONS', 'MTS/OTS EGE', 'SERAMONI'];
        for (var p = 0; p < pList.length; p++) {
            var opt = document.createElement('option'); opt.value = pList[p]; opt.textContent = pList[p];
            partnerMenu.appendChild(opt);
        }
    }

    var filtered = invoices.filter(function (r) {
        return (!fPart || r.partner === fPart) && (!fDurum || r.durum === fDurum) && (!fDoviz || r.doviz === fDoviz);
    });

    var totalSent = filtered.reduce(function (s, o) { return s + o.tutar; }, 0);
    var totalReceived = filtered.reduce(function (s, o) { return s + o.iadeTutar; }, 0);
    var totalPending = filtered.filter(function (o) { return o.durum === 'Beklemede' || o.durum === 'Gönderildi'; }).reduce(function (s, o) { return s + o.tutar; }, 0);
    var objectedCount = filtered.filter(function (o) { return o.durum === 'İtiraz edildi'; }).length;

    document.getElementById('acc-stats').innerHTML =
        '<div class="stat-card"><div class="s-lbl">Toplam Gönderilen Fatura Tutarı</div><div class="s-val">' + fmt(totalSent) + ' €</div><div class="s-sub">' + filtered.length + ' Fatura Takipte</div></div>' +
        '<div class="stat-card"><div class="s-lbl">Tahsil Edilen (İade Edilen) Miktar</div><div class="s-val" style="color:#3B6D11;">' + fmt(totalReceived) + ' €</div></div>' +
        '<div class="stat-card"><div class="s-lbl">Yanıt Bekleyen Tutar</div><div class="s-val" style="color:#854F0B;">' + fmt(totalPending) + ' €</div></div>' +
        '<div class="stat-card"><div class="s-lbl">İtiraz Edilen Fatura Sayısı</div><div class="s-val" style="color:#A32D2D;">' + objectedCount + ' Adet</div></div>';

    var tbody = document.getElementById('acc-tbody'); if (!tbody) return;
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:20px;">Filtre kriterlerine uyan regress fatura kartı bulunmuyor.</td></tr>';
    } else {
        var html = '';
        for (var k = 0; k < filtered.length; k++) {
            var inv = filtered[k];
            var dBadge = inv.durum === 'Kabul edildi' ? 'badge-green' : (inv.durum === 'İtiraz edildi' ? 'badge-red' : 'badge-gray');
            html += '<tr>' +
                '<td style="font-family:monospace; font-weight:bold;">' + inv.faturaNo + '</td>' +
                '<td>' + inv.tarih + '</td>' +
                '<td>' + inv.partner + '</td>' +
                '<td style="font-family:monospace;">' + inv.booking + '</td>' +
                '<td style="font-weight:600;">' + fmt(inv.tutar) + '</td>' +
                '<td>' + inv.doviz + '</td>' +
                '<td><span class="badge ' + dBadge + '">' + inv.durum + '</span></td>' +
                '<td style="font-weight:600; color:#3B6D11;">' + (inv.iadeTutar > 0 ? fmt(inv.iadeTutar) : '—') + '</td>' +
                '<td>' + (inv.iadeDate || '—') + '</td>' +
                '<td><span class="badge badge-purple">' + (inv.kabul || '—') + '</span></td>' +
                '<td>' + truncate(inv.kesinti, 24) + '</td>' +
                '<td>' +
                '<button class="icon-btn" onclick="openInvoiceDetail(' + inv.id + ')" title="Göz İkonu - Detay Aç">&#128065;</button>' +
                '<button class="icon-btn btn-delete" onclick="deleteInvoice(' + inv.id + ')" title="Sil">&#128465;</button>' +
                '</td>' +
                '</tr>';
        }
        tbody.innerHTML = html;
    }

    var partners = ['SWT', 'HDS AYT OPERATIONS', 'MTS/OTS EGE', 'SERAMONI'];
    var sumTbody = document.getElementById('acc-summary-tbody'); if (!sumTbody) return;
    var sumHtml = '';

    for (var p = 0; p < partners.length; p++) {
        var pName = partners[p];
        var pInvs = invoices.filter(function (o) { return o.partner === pName; });

        var pSent = pInvs.reduce(function (s, o) { return s + o.tutar; }, 0);
        var pRecv = pInvs.reduce(function (s, o) { return s + o.iadeTutar; }, 0);
        var pKabul = pInvs.filter(function (o) { return o.kabul === 'Evet' || o.kabul === 'Kısmi kabul'; }).reduce(function (s, o) { return s + o.iadeTutar; }, 0);
        var pPend = pInvs.filter(function (o) { return o.durum === 'Beklemede' || o.durum === 'Gönderildi'; }).reduce(function (s, o) { return s + o.tutar; }, 0);

        var rate = pSent > 0 ? Math.round((pRecv / pSent) * 100) : 0;
        var color = rate > 75 ? '#3B6D11' : (rate > 40 ? '#BA7517' : '#A32D2D');

        sumHtml += '<tr>' +
            '<td style="font-weight:600;">' + pName + '</td>' +
            '<td>' + fmt(pSent) + ' €</td>' +
            '<td>' + fmt(pRecv) + ' €</td>' +
            '<td>' + fmt(pKabul) + ' €</td>' +
            '<td>' + fmt(pPend) + ' €</td>' +
            '<td>' +
            '<div style="display:flex; align-items:center; gap:8px;">' +
            '<div class="progress-wrap"><div class="progress-bar" style="width:' + rate + '%; background:' + color + ';"></div></div>' +
            '<span style="font-weight:600; font-size:11px; min-width:30px; text-align:right;">%' + rate + '</span>' +
            '</div>' +
            '</td>' +
            '</tr>';
    }
    sumTbody.innerHTML = sumHtml;
}

function bulkDeleteComplaints() {

    var selected =
        document.querySelectorAll(
            '.complaint-select:checked'
        );

    if (!selected.length) {

        alert('Lütfen kayıt seçiniz.');
        return;
    }

    if (
        !confirm(
            selected.length +
            ' kayıt işlensin mi?'
        )
    ) return;

    selected.forEach(function (cb) {

        requestDeleteComplaint(
            parseInt(cb.value)
        );

    });
}

// ==================== USER MANAGEMENT ====================
function renderUsers() {
    let tbody = document.getElementById('users-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    Object.keys(USERS).forEach(username => {
        let row = `<tr>
    <td>${username}</td>
    <td>
        <span class="badge badge-purple">
            ${USERS[username].role}
        </span>
    </td>
    <td>
        ${username !== 'admin'
                ? `<button class="btn-secondary"
                 style="color:var(--red-text);"
                 onclick="deleteUser('${username}')">
                 Sil
               </button>`
                : '<span style="color:#999;">Korunuyor</span>'
            }
    </td>
</tr>`;
        tbody.innerHTML += row;

    });

}

function renderDataManager() {

    var area =
        document.getElementById(
            'data-manager-content'
        );

    if (!area) return;

    if (area.innerHTML.trim()) {
        return;
    }

    area.innerHTML =
        '<div class="section-title">' +
        'Bir kategori seçin' +
        '</div>';
}

function openPaxConverter() {

    var area =
        document.getElementById(
            'pax-converter-area'
        );

    if (area) {
        area.style.display = 'block';
    }

}

var paxExcelRows = [];

function convertPaxExcel() {

    if (!paxExcelRows.length) {

        alert('Önce Excel analiz edilmelidir.');
        return;

    }

    var headers = paxExcelRows[0];

    var voucherIndex =
        headers.indexOf('Asıl Voucher');

    var operatorIndex =
        headers.indexOf('Operatör');

    var hotelIndex =
        headers.indexOf('Otel Adı');

    if (hotelIndex === -1) {

        hotelIndex =
            headers.indexOf('Otel');

    }

    var hotelCodeIndex =
        headers.indexOf('Otel ');

    var realHotelIndex =
        headers.indexOf('Gerçek Otel');

    var roomTypeIndex =
        headers.indexOf('Oda Tipi Tanmı');

    var mealPlanIndex =
        headers.indexOf('Pansiyon');

    var nightsIndex =
        headers.indexOf('Gün');

    var transferIncludedIndex =
        headers.indexOf('HDS OTEL + TRANSFER');

    var adultIndex =
        headers.indexOf('Yetişkin');

    var childIndex =
        headers.indexOf('Çocuk');

    var infantIndex =
        headers.indexOf('Bebek');

    var arrivalIndex =
        headers.indexOf('Giriş Tarihi');

    var departureIndex =
        headers.indexOf('Çıkış Tarihi');

    var converted = [];

    for (var i = 1; i < paxExcelRows.length; i++) {

        var row = paxExcelRows[i];

        converted.push({

            booking:
                String(row[voucherIndex] || '').trim(),

            subBooking:
                String(row[5] || row[4] || '').trim(),

            operator:
                row[operatorIndex] || '',

            veranstalter:
                row[operatorIndex] || '',

            tourOperator:
                row[operatorIndex] || '',

            hotel:
                String(row[hotelIndex] || '').trim(),

            hotelCode:
                String(row[hotelCodeIndex] || '').trim(),

            realHotel:
                String(row[realHotelIndex] || '').trim(),

            roomType:
                String(row[roomTypeIndex] || '').trim(),

            mealPlan:
                String(row[mealPlanIndex] || '').trim(),

            nights:
                Number(row[nightsIndex] || 0),

            transferIncluded:
                String(
                    row[transferIncludedIndex] || ''
                ).toUpperCase() === 'EVET',

            adult:
                parseInt(row[adultIndex] || 0),

            child:
                parseInt(row[childIndex] || 0),

            infant:
                parseInt(row[infantIndex] || 0),

            totalPax:
                parseInt(row[adultIndex] || 0) +
                parseInt(row[childIndex] || 0) +
                parseInt(row[infantIndex] || 0),

            arrival:
                row[arrivalIndex] || '',

            arrivalDate:
                row[arrivalIndex] || '',

            departure:
                row[departureIndex] || '',

            departureDate:
                row[departureIndex] || ''

        });

    }

    localStorage.setItem(
        'passengerStats',
        JSON.stringify(converted)
    );

    alert(
        converted.length +
        ' kayıt PAX verilerine aktarıldı.'
    );

    renderDashboard();

    if (typeof renderPassengerStats === 'function') {
        renderPassengerStats();
    }

}

function analyzePaxExcel() {

    var file =
        document.getElementById(
            'paxConverterFile'
        ).files[0];

    if (!file) {

        alert(
            'Lütfen Excel dosyası seçiniz.'
        );

        return;
    }

    var reader =
        new FileReader();

    reader.onload = function (e) {

        var data =
            new Uint8Array(
                e.target.result
            );

        var workbook =
            XLSX.read(data, {
                type: 'array'
            });

        var sheet =
            workbook.Sheets[
            workbook.SheetNames[0]
            ];

        var rows =
            XLSX.utils.sheet_to_json(
                sheet,
                { header: 1 }
            );

        paxExcelRows = rows;

        console.log(rows);

        var header = rows[0];

        function getColIndex(name) {
            return header.indexOf(name);
        }

        var operatorIndex = getColIndex('Operatör');
        var hotelIndex =
            getColIndex('Otel Adı');

        if (hotelIndex === -1) {

            hotelIndex =
                getColIndex('Otel');

        }
        var regionIndex = getColIndex('Bölge');
        var airportIndex = getColIndex('Havalimanı');

        var operators =
            JSON.parse(localStorage.getItem('operators')) || [];

        var hotels =
            JSON.parse(localStorage.getItem('hotelPartners')) || [];

        var regions =
            JSON.parse(localStorage.getItem('regions')) || [];

        var airports =
            JSON.parse(localStorage.getItem('airports')) || [];

        var newOperators = [];
        var newHotels = [];
        var newRegions = [];
        var newAirports = [];

        rows.slice(1).forEach(function (row) {

            if (
                operatorIndex > -1 &&
                row[operatorIndex]
            ) {

                var op =
                    String(row[operatorIndex]).trim();

                if (
                    op &&
                    operators.indexOf(op) === -1
                ) {

                    operators.push(op);
                    newOperators.push(op);

                }
            }

            if (
                hotelIndex > -1 &&
                row[hotelIndex]
            ) {

                var hotel =
                    String(row[hotelIndex]).trim();

                if (
                    hotel &&
                    hotels.indexOf(hotel) === -1
                ) {

                    hotels.push(hotel);
                    newHotels.push(hotel);

                }
            }

            if (
                regionIndex > -1 &&
                row[regionIndex]
            ) {

                var region =
                    String(row[regionIndex]).trim();

                if (
                    region &&
                    regions.indexOf(region) === -1
                ) {

                    regions.push(region);
                    newRegions.push(region);

                }
            }

            if (
                airportIndex > -1 &&
                row[airportIndex]
            ) {

                var airport =
                    String(row[airportIndex]).trim();

                if (
                    airport &&
                    airports.indexOf(airport) === -1
                ) {

                    airports.push(airport);
                    newAirports.push(airport);

                }
            }

        });

        localStorage.setItem(
            'operators',
            JSON.stringify(operators)
        );

        localStorage.setItem(
            'hotelPartners',
            JSON.stringify(hotels)
        );

        localStorage.setItem(
            'regions',
            JSON.stringify(regions)
        );

        localStorage.setItem(
            'airports',
            JSON.stringify(airports)
        );

        console.log(
            'Yeni Operatörler:',
            newOperators
        );

        console.log(
            'Yeni Oteller:',
            newHotels
        );

        console.log(
            'Yeni Bölgeler:',
            newRegions
        );

        console.log(
            'Yeni Otel Sayısı:',
            newHotels.length
        );

        console.log(
            'İlk 20 Otel:',
            newHotels.slice(0, 20)
        );

        console.log(
            'Yeni Havalimanları:',
            newAirports
        );

        var requiredFields = [
            'Operatör',
            'Asıl Voucher',
            'Giriş Tarihi',
            'Çıkış Tarihi',
            'Yetişkin',
            'Çocuk',
            'Bebek',
            'Otel'
        ];

        var foundFields = requiredFields.filter(function (f) {

            return rows[0].indexOf(f) > -1;

        });

        document.getElementById(
            'pax-preview'
        ).innerHTML =

            '<div><b>Bulunan Satır:</b> ' +
            (rows.length - 1) +
            '</div><br>' +

            '<div><b>Dönüştürülebilen Alanlar:</b></div>' +

            foundFields.map(function (f) {

                return '<div style="color:green;">✓ ' +
                    f +
                    '</div>';

            }).join('') +

            '<br><br>' +

            '<button class="fab" onclick="convertPaxExcel()">' +
            'DÖNÜŞTÜR' +
            '</button>';

    };

    reader.readAsArrayBuffer(file);

}


function loadOperatorDropdown() {

    let select =
        document.getElementById('c-veranstalter');

    if (!select) return;

    let operators =
        JSON.parse(
            localStorage.getItem('operators')
        ) || [];

    select.innerHTML = '';

    let firstOption =
        document.createElement('option');

    firstOption.value = '';
    firstOption.textContent =
        'Operatör seçiniz...';

    select.appendChild(firstOption);

    operators
        .sort()
        .forEach(function (item) {

            let option =
                document.createElement('option');

            option.value =
                String(item).trim();

            option.textContent =
                String(item).trim();

            select.appendChild(option);

        });

}

function loadHotelDropdown() {

    alert("loadHotelDropdown çalıştı");

    console.log(
        "hotelPartners =",
        JSON.parse(
            localStorage.getItem("hotelPartners") || "[]"
        ).length
    );

    console.log(
        "hotels =",
        JSON.parse(
            localStorage.getItem("hotels") || "[]"
        ).length
    );

    let select =
        document.getElementById("c-hotel");

    console.log("SELECT =", select);

    if (!select) {

        console.log("c-hotel bulunamadı");

        return;

    }

    let hotels =
        JSON.parse(
            localStorage.getItem("hotelPartners") || "[]"
        );

    console.log("İLK 10 HOTEL");
    console.log(hotels.slice(0, 10));

    console.log("YILSAM VAR MI?");
    console.log(
        hotels.filter(h =>
            h.toUpperCase().includes("YILSAM")
        )
    );

    console.log("Yüklenen hotel sayısı =", hotels.length);

    select.innerHTML = "";

    let firstOption =
        document.createElement("option");

    firstOption.value = "";
    firstOption.textContent = "Otel seçiniz...";

    select.appendChild(firstOption);

    console.log("FOREACH SAYISI =", hotels.length);

    console.log(
        "YILSAM LİSTESİ =",
        hotels.filter(h =>
            h.toUpperCase().includes("YILSAM")
        )
    );

    hotels.forEach(function (item) {

        let option =
            document.createElement("option");

        option.value = String(item).trim();
        option.textContent = String(item).trim();

        select.appendChild(option);

    });

    console.log(
        "Dropdown option sayısı =",
        select.options.length
    );

}


function filterHotels() {

    let text =
        document.getElementById(
            'hotel-search'
        ).value.toLowerCase();

    let select =
        document.getElementById(
            'c-hotel'
        );

    if (!select) return;

    let hotels =
        JSON.parse(
            localStorage.getItem(
                'hotelPartners'
            )
        ) || [];

    select.innerHTML = '';

    hotels.forEach(function (item) {

        if (
            item.toLowerCase()
                .includes(text)
        ) {

            let option =
                document.createElement(
                    'option'
                );

            option.value = item;
            option.textContent = item;

            select.appendChild(option);

        }

    });

}

function openDataManager(type) {

    var area =
        document.getElementById(
            'data-manager-content'
        );

    if (!area) return;

    var config = {

        hotels: {
            title: '🏨 Otel / Partner Yönetimi',
            storage: 'hotelPartners',
            placeholder: 'Yeni otel / partner adı'
        },

        regions: {
            title: '🌍 Bölge Yönetimi',
            storage: 'regions',
            placeholder: 'Yeni bölge adı'
        },

        airports: {
            title: '✈️ Havalimanı Yönetimi',
            storage: 'airports',
            placeholder: 'Yeni havalimanı'
        },

        services: {
            title: '🚌 Servis Yönetimi',
            storage: 'services',
            placeholder: 'Yeni servis'
        },


        reasons: {
            title: '📋 Şikayet Konuları',
            storageTR: 'reasonsTR',
            storageDE: 'reasonsDE',
            storageEN: 'reasonsEN',
            placeholder: 'Yeni konu'
        },

        transferTypes: {
            title: '🚐 Transfer Türleri',
            storage: 'transferTypes',
            placeholder: 'Yeni transfer türü'
        },

        operators: {
            title: '🏢 Tur Operatörleri',
            storage: 'operators',
            placeholder: 'Yeni tur operatörü'
        },

        passengers: {
            title: '👥 Yolcu Verileri (PAX)',
            storage: 'passengers',
            placeholder: 'Yeni kayıt'
        },

    };

    if (!config[type]) return;

    var items;

    if (type === 'reasons') {

        var trItems =
            JSON.parse(
                localStorage.getItem(
                    config[type].storageTR
                )
            ) || [];

        var deItems =
            JSON.parse(
                localStorage.getItem(
                    config[type].storageDE
                )
            ) || [];

        var enItems =
            JSON.parse(
                localStorage.getItem(
                    config[type].storageEN
                )
            ) || [];

        items = [];

        for (
            var i = 0;
            i < trItems.length;
            i++
        ) {
            items.push({
                tr: trItems[i] || '',
                de: deItems[i] || '',
                en: enItems[i] || ''
            });
        }

    } else {

        items =
            JSON.parse(
                localStorage.getItem(
                    config[type].storage
                )
            ) || [];

    }

    console.log(
        'TYPE=', type,
        'STORAGE=', config[type].storage,
        'ITEMS=', items
    );

    var html =
        '<div class="table-wrap">' +

        '<div class="section-title">' +
        config[type].title +
        '</div>' +

        '<div style="display:flex;gap:10px;margin-bottom:15px;">' +

        '<input id="new-item" ' +
        'style="flex:1;padding:10px;" ' +
        'placeholder="' + config[type].placeholder + '">' +

        '<button class="fab" ' +
        'onclick="addDataItem(\'' + type + '\')">' +
        'Ekle' +
        '</button>' +

        '</div>' +

        (type === 'passengers'

            ?

            '<table>' +

            '<thead>' +
            '<tr>' +
            '<th>#</th>' +
            '<th>Yolcu Verisi</th>' +
            '<th>İşlem</th>' +
            '</tr>' +
            '</thead>' +

            '<tbody>'

            :

            '<table>' +

            '<thead>' +
            '<tr>' +
            '<th>#</th>' +
            '<th>TR</th>' +
            '<th>DE</th>' +
            '<th>EN</th>' +
            '<th>İşlem</th>' +
            '</tr>' +
            '</thead>' +

            '<tbody>'

        );

    '<tbody>';

    items.forEach(function (item, index) {

        html +=

            '<tr>' +

            '<td>' +
            (index + 1) +
            '</td>' +

            '<td>' +

            (
                type === 'reasons'
                    ? item.tr
                    :
                    (
                        type === 'passengers'

                            ?

                            '📋 ' + item.booking +
                            ' | 👤 ' + (item.firstName || '') +
                            ' ' + (item.lastName || '') +
                            ' | 🎂 ' + (item.age || '') +
                            ' | 👨 ' + (item.adult || 0) +
                            ' | 🧒 ' + (item.child || 0) +
                            ' | 👶 ' + (item.infant || 0)

                            :

                            type === 'reasons'

                                ?

                                item.tr

                                :

                                item
                    )
            )

            +

            '</td>' +

            (
                type === 'reasons'
                    ?
                    '<td>' + item.de + '</td>' +
                    '<td>' + item.en + '</td>'
                    :
                    ''
            )

            +

            '<td>' +

            '<button class="btn-secondary" ' +
            'onclick="editDataItem(\'' + type + '\',' + index + ')">' +
            '✏️' +
            '</button> ' +

            '<button class="btn-delete" ' +
            'onclick="deleteDataItem(\'' + type + '\',' + index + ')">' +
            '🗑️' +
            '</button>' +

            '</td>' +

            '</tr>';

    });

    html +=
        '</tbody>' +
        '</table>' +
        '</div>';

    area.innerHTML = html;
}

function addHotelPartner() {

    var input =
        document.getElementById(
            'new-hotel-name'
        );

    if (!input) return;

    var value = input.value.trim();

    if (!value) {
        alert('Otel adı giriniz');
        return;
    }

    var hotels =
        JSON.parse(
            localStorage.getItem(
                'hotelPartners'
            )
        ) || [];

    hotels.push(value);

    localStorage.setItem(
        'hotelPartners',
        JSON.stringify(hotels)
    );

    openDataManager('hotels');

}

function importHotelExcel(event) {

    var file = event.target.files[0];

    if (!file) return;

    var reader = new FileReader();

    reader.onload = function (e) {

        var data = new Uint8Array(e.target.result);

        var workbook =
            XLSX.read(data, {
                type: 'array'
            });

        var sheetName =
            workbook.SheetNames[0];

        var worksheet =
            workbook.Sheets[sheetName];

        var rows =
            XLSX.utils.sheet_to_json(
                sheet,
                { header: 1 }
            );

        console.log(rows);

        var hotels = [];

        for (var i = 1; i < rows.length; i++) {

            if (!rows[i]) continue;

            var hotel =
                rows[i][0] || '';

            var region =
                rows[i][1] || '';

            var airport =
                rows[i][2] || '';

            if (hotel === '') continue;

            hotels.push(
                hotel +
                ' | ' +
                region +
                ' | ' +
                airport
            );

        }

        localStorage.setItem(
            'hotelPartners',
            JSON.stringify(hotels)
        );

        alert(
            hotels.length +
            ' kayıt yüklendi.'
        );

        openDataManager('hotels');

    };

    reader.readAsArrayBuffer(file);

}

function openExcelImportManager() {

    var secim = prompt(
        'Veri türünü seç:\n\n' +
        '1 = Otel / Partner\n' +
        '2 = Bölge\n' +
        '3 = Havalimanı\n' +
        '4 = Servis\n' +
        '5 = Şikayet Konuları\n' +
        '6 = Operasyon Exceli (V2)\n' +
        '7 = Konaklama Exceli (V2)'
    );

    if (!secim) return;

    localStorage.setItem(
        'excelImportType',
        secim
    );

    document
        .getElementById('excel-import-file')
        .click();
}
function downloadPaxTemplate() {

    var rows = [[

        'Rezervasyon No',
        'Alt Rezervasyon No',
        'Voucher',

        'Tur Operatörü',

        'Bölge',
        'Havalimanı',

        'Otel',
        'Gerçek Otel',

        'Check-In',
        'Check-Out',
        'Geceleme',

        'Pansiyon',
        'Oda Tipi',

        'Transfer Türü',

        'Yetişkin',
        'Çocuk',
        'Bebek'

    ]];

    var ws =
        XLSX.utils.aoa_to_sheet(rows);

    var wb =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        wb,
        ws,
        'PAX'
    );

    XLSX.writeFile(
        wb,
        'TRALVID_PAX_SABLON.xlsx'
    );
}


function importSelectedExcel(event) {

    var secim =
        localStorage.getItem(
            'excelImportType'
        );

    if (secim === '1') {
        importHotelExcel(event);
        return;
    }

    if (secim == '6') {

        importOperationExcel(event);

        return;
    }

    if (secim == '7') {

        importReservationExcel(event);

        return;
    }

    alert(
        'Bu veri türü henüz aktif değil.'
    );
}

function importPassengerExcel(event) {

    var file = event.target.files[0];

    if (!file) return;

    var reader = new FileReader();

    reader.onload = function (e) {

        var data = new Uint8Array(e.target.result);

        var workbook = XLSX.read(data, {
            type: 'array'
        });

        var sheet =
            workbook.Sheets[
            workbook.SheetNames[0]
            ];

        var rows =
            XLSX.utils.sheet_to_json(
                sheet,
                { header: 1 }
            );

        var passengers = [];

        for (

            var i =
                headerInfo.index + 1;

            i < rows.length;

            i++

        ) {

            if (!rows[i]) continue;

            var row = rows[i];

            passengers.push({

                booking: row[0] || '',
                subBooking: row[1] || '',

                operator: row[2] || '',
                region: row[3] || '',
                hotel: row[4] || '',
                airport: row[5] || '',
                transferType: row[6] || '',

                arrivalDate: row[7] || '',
                departureDate: row[8] || '',

                adult: Number(row[9] || 0),
                child: Number(row[10] || 0),
                infant: Number(row[11] || 0),

                totalPax:
                    Number(row[9] || 0) +
                    Number(row[10] || 0) +
                    Number(row[11] || 0)

            });

        }

        localStorage.setItem(
            'passengerStats',
            JSON.stringify(passengers)
        );

        alert(
            passengers.length +
            ' satır yolcu verisi yüklendi.'
        );

    };


    reader.readAsArrayBuffer(file);

}

function readExcelFile(file) {

    return new Promise(function (resolve, reject) {

        var reader = new FileReader();

        reader.onload = function (e) {

            try {

                var workbook = XLSX.read(e.target.result, {
                    type: 'array'
                });

                var sheet =
                    workbook.Sheets[
                    workbook.SheetNames[0]
                    ];

                var rows =
                    XLSX.utils.sheet_to_json(
                        sheet,
                        {
                            header: 1,
                            defval: ''
                        }
                    );

                resolve(rows);

            } catch (err) {

                reject(err);

            }

        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file);

    });

}

function addCollections(collections, groups, result) {

    if (groups.reservation && result.reservation) {
        collections.reservations.push(result.reservation);
    }

    if (groups.flight && result.flight) {
        collections.flights.push(result.flight);
    }

    if (groups.transfer && result.transfer) {
        collections.transfers.push(result.transfer);
    }

    if (groups.passenger && result.passenger) {
        collections.passengers.push(result.passenger);
    }

}

function parseOperationRows(rows) {

    var headerInfo = findHeaderRow(rows);

    if (!headerInfo) {

        throw new Error("Excel başlık satırı bulunamadı.");

    }

    var headers = rows[headerInfo.index];

    var groups = detectDataGroups(headers);

    var collections = {

        reservations: [],
        flights: [],
        transfers: [],
        passengers: []

    };

    for (var i = headerInfo.index + 1; i < rows.length; i++) {

        var row = rows[i];

        if (!row || !row.length) continue;

        var mtr = mapExcelRow(headers, row);

        console.log("MTR =", mtr);

        console.log(
            "Booking =",
            mtr.bookingNumber
        );

        var booking =
            String(mtr.bookingNumber || '').trim();

        if (!booking) continue;

        var result =
            buildCollectionsFromMTR(mtr);

        if (!result)
            continue;

        addCollections(
            collections,
            groups,
            result
        );
    }

    return collections;

}

function showImportResult(collections) {

    alert(

        'V2 Operasyon Verisi Yüklendi\n\n' +

        'Rezervasyon : ' +
        collections.reservations.length +

        '\nUçuş : ' +
        collections.flights.length +

        '\nTransfer : ' +
        collections.transfers.length +

        '\nYolcu : ' +
        collections.passengers.length

    );

}

function importOperationExcel(event) {

    console.log("=== IMPORT BAŞLADI ===");

    var file = event.target.files[0];

    console.log("Dosya :", file ? file.name : "YOK");

    if (!file) return;

    readExcelFile(file)

        .then(function (rows) {

            var collections =
                parseOperationRows(rows);

            if (!collections) {

                throw new Error(
                    "Import sırasında koleksiyon oluşturulamadı."
                );

            }

            console.log("Collections =", collections);

            console.log("Reservations :", collections.reservations.length);
            console.log("Flights      :", collections.flights.length);
            console.log("Transfers    :", collections.transfers.length);
            console.log("Passengers   :", collections.passengers.length);

            console.log("IndexedDB'ye yazılıyor...");

            saveOperationData(

                collections,

                function () {

                    showImportResult(
                        collections
                    );
                    event.target.value = "";

                }

            );

        })

        .catch(function (err) {

            console.error(err);

            alert(

                "Excel yüklenemedi.\n\n" +

                err.message

            );

        });

}

function importReservationExcel(event) {

    var file = event.target.files[0];

    if (!file) return;

    var reader = new FileReader();

    reader.onload = function (e) {

        var data =
            new Uint8Array(
                e.target.result
            );

        var workbook =
            XLSX.read(data, {
                type: 'array'
            });

        var sheet =
            workbook.Sheets[
            workbook.SheetNames[0]
            ];

        var rows =
            XLSX.utils.sheet_to_json(
                sheet,
                { header: 1 }
            );

        var headerInfo =
            findHeaderRow(rows);

        if (!headerInfo) {

            alert(
                "Excel başlık satırı bulunamadı."
            );

            return;

        }

        var headers =
            rows[
            headerInfo.index
            ];

        console.log(
            "IMPORT PROFILE =",
            headerInfo.profile
        );

        var groups =
            detectDataGroups(headers);

        console.log(
            "DATA GROUPS =",
            groups
        );

        var reservations = [];

        for (

            var i =
                headerInfo.index + 1;

            i < rows.length;

            i++

        ) {

            var row = rows[i];

            if (!row || !row.length)
                continue;

            var mtr =
                mapExcelRow(
                    headers,
                    row
                );

            var booking =
                String(
                    mtr.bookingNumber || ''
                ).trim();

            if (!booking)
                continue;

            reservations.push({

                booking:
                    booking,

                operator:
                    mtr.operator,

                hotel:
                    mtr.hotel,

                roomNo:
                    mtr.roomNo,

                roomType:
                    mtr.roomType,

                checkIn:
                    mtr.checkIn,

                checkOut:
                    mtr.checkOut,

                nights:
                    Number(mtr.nights || 0),

                board:
                    mtr.board,

                adult:
                    Number(mtr.adult || 0),

                child:
                    Number(mtr.child || 0),

                infant:
                    Number(mtr.infant || 0),

                roomCount:
                    Number(mtr.roomCount || 0),

                serviceScope:
                    "OA"

            });

        }

        localStorage.setItem(
            'reservations',
            JSON.stringify(reservations)
        );

        alert(
            reservations.length +
            ' rezervasyon yüklendi.'
        );

    };

    reader.readAsArrayBuffer(file);

}

function deleteHotel(index) {

    let hotels =
        JSON.parse(
            localStorage.getItem('hotelPartners')
        ) || [];

    if (
        !confirm(
            hotels[index] +
            '\n\nSilinsin mi?'
        )
    ) {
        return;
    }

    hotels.splice(index, 1);

    localStorage.setItem(
        'hotelPartners',
        JSON.stringify(hotels)
    );

    openDataManager('hotels');

    showToast('Kayıt silindi.');
}


function editHotel(index) {

    let hotels =
        JSON.parse(
            localStorage.getItem('hotelPartners')
        ) || [];

    let yeniDeger =
        prompt(
            'Yeni değer:',
            hotels[index]
        );

    if (!yeniDeger) return;

    hotels[index] = yeniDeger;

    localStorage.setItem(
        'hotelPartners',
        JSON.stringify(hotels)
    );

    openDataManager('hotels');

    showToast('Kayıt güncellendi.');
}


function addDataItem(type) {

    var config = {
        hotels: 'hotelPartners',
        regions: 'regions',
        airports: 'airports',
        services: 'services',
        reasons: 'reasons',
        operators: 'operators',
        transferTypes: 'transferTypes'
    };

    var input =
        document.getElementById('new-item');

    if (!input) return;

    var value = input.value.trim();

    if (!value) {
        alert('Değer giriniz');
        return;
    }

    var items =
        JSON.parse(
            localStorage.getItem(
                config[type]
            )
        ) || [];

    items.push(value);

    localStorage.setItem(
        config[type],
        JSON.stringify(items)
    );

    openDataManager(type);

    showToast('Kayıt eklendi');
}



function editDataItem(type, index) {

    var config = {
        hotels: 'hotelPartners',
        regions: 'regions',
        airports: 'airports',
        services: 'services',
        reasons: 'reasons'
    };

    var items =
        JSON.parse(
            localStorage.getItem(
                config[type]
            )
        ) || [];

    var yeniDeger =
        prompt(
            'Yeni değer:',
            items[index]
        );

    if (!yeniDeger) return;

    items[index] = yeniDeger;

    localStorage.setItem(
        config[type],
        JSON.stringify(items)
    );

    openDataManager(type);

    showToast('Kayıt güncellendi');
}



function deleteDataItem(type, index) {

    var config = {
        hotels: 'hotelPartners',
        regions: 'regions',
        airports: 'airports',
        services: 'services',
        reasons: 'reasons'
    };

    var items =
        JSON.parse(
            localStorage.getItem(
                config[type]
            )
        ) || [];

    if (
        !confirm(
            items[index] +
            '\n\nSilinsin mi?'
        )
    ) {
        return;
    }

    items.splice(index, 1);

    localStorage.setItem(
        config[type],
        JSON.stringify(items)
    );

    openDataManager(type);

    showToast('Kayıt silindi');
}

function openUserModal() {
    let username = prompt("Kullanıcı adı:");
    if (!username) return;

    if (USERS[username]) {
        alert("Bu kullanıcı zaten mevcut.");
        return;
    }

    let password = prompt("Şifre:");
    if (!password) return;

    let role = prompt("Yetki (admin/user):", "user");
    if (!role) role = "user";

    let language = prompt(
        "Dil (TR/DE/EN):",
        "TR"
    );

    if (!language) language = "TR";

    language =
        language.toUpperCase();

    USERS[username] = {
        password: password,
        role: role,
        language: language
    };

    localStorage.setItem(
        'tralvid_users',
        JSON.stringify(USERS)
    );

    renderUsers();
    showToast("Kullanıcı oluşturuldu.");
}
function deleteUser(username) {

    if (username === 'admin') {
        alert('Admin kullanıcısı silinemez!');
        return;
    }

    if (!confirm(username + ' kullanıcısını silmek istiyor musunuz?')) {
        return;
    }

    delete USERS[username];

    localStorage.setItem(
        'tralvid_users',
        JSON.stringify(USERS)
    );

    renderUsers();

    showToast('Kullanıcı silindi.');

    if (
        currentUser &&
        currentUser.username === username
    ) {
        sessionStorage.removeItem('currentUser');
        location.reload();
    }
}
// ==================== DETAY ANALİZ MODALLARI ====================
function openComplaintDetail(id) {
    var r = complaints.find(function (o) { return o.id === id; }); if (!r) return;
    document.getElementById('detail-modal-title').innerHTML =
        'Müşteri Kartı : ' + r.booking +

        (
            currentUser.role === 'admin'
                ? (
                    !complaintEditMode

                        ? ' <button class="btn btn-primary" ' +
                        'style="margin-left:15px;" ' +
                        'onclick="enableComplaintEdit(' + r.id + ')">' +
                        '✏ Düzenle</button>'

                        : ' <button class="btn btn-success" ' +
                        'style="margin-left:15px;" ' +
                        'onclick="saveComplaintChanges(' + r.id + ')">' +
                        '💾 Kaydet</button>' +

                        ' <button class="btn" ' +
                        'style="margin-left:8px;background:#9e9e9e;color:#fff;" ' +
                        'onclick="cancelComplaintEdit(' + r.id + ')">' +
                        '❌ Vazgeç</button>'
                )
                : ''
        );

    document.getElementById('detail-modal-body').innerHTML = '<div class="detail-grid">' +
        '<div class="detail-item"><span class="detail-lbl">Hafta No (KW) / Quarter (Çeyrek)</span><span class="detail-val">' + r.kw + ' / ' + r.quarter + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Kullanıcı</span><span class="detail-val">' + r.user + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Tarih</span><span class="detail-val">' + r.date + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Cevap Süresi / Savunma Yazısı</span><span class="detail-val">' + r.timeout + ' / ' + r.sn + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Rezervasyon No</span><span class="detail-val">' + r.booking + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Alt Rezervasyon No</span><span class="detail-val">' + (r.subbooking || '—') + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Pax (Yetişkin / Çocuk / Bebek)</span><span class="detail-val">' + r.adult + ' Y / ' + r.child + ' Ç / ' + r.infant + ' B</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Şikayet Tarihi</span><span class="detail-val">' + r.bdate + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Geliş Tarihi</span><span class="detail-val">' + r.adate + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Dönüş Tarihi</span><span class="detail-val">' + r.ddate + '</span></div>' +

        '<div class="detail-item">' +
        '<span class="detail-lbl">Tur Operatörü</span>' +

        (
            complaintEditMode

                ?

                '<select id="edit-veranstalter" style="width:100%;padding:6px;"></select>'

                :

                '<span class="detail-val">' +
                r.veranstalter +
                '</span>'
        ) +

        '</div>' +

        '<div class="detail-item"><span class="detail-lbl">Sorumlu taraf</span><span class="detail-val">' + r.Verursacher + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Bölge / Havalimanı</span><span class="detail-val">' + r.region + ' / ' + r.airport + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Transfer Türü</span><span class="detail-val">' + (r.transfertype || '-') + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">İlgili Otel</span><span class="detail-val">' + (r.hotel || '-') + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Şikayet Sonucu / Tazminat</span><span class="detail-val">' + r.result + ' — ' + fmt(r.price) + ' ' + r.currency + '</span></div>' +
        '<div class="detail-item full">' +
        '<span class="detail-lbl">Şikayet Konuları</span>' +
        '<span class="detail-val">' +

        (r.ptr ? '1. ' + r.ptr : '') +

        (r.ptr2 ? '<br>2. ' + r.ptr2 : '') +

        (r.ptr3 ? '<br>3. ' + r.ptr3 : '') +

        '</span>' +
        '</div>' +
        '<div class="detail-item full"><span class="detail-lbl">Not</span><div class="note-box">' + (r.notes || 'Açıklama girilmedi.') + '</div></div>' +
        '<div class="detail-item full">' +
        '<span class="detail-lbl">Ek Dosyalar</span>' +
        '<div class="note-box">' +
        '<div class="detail-item">' +
        '<span class="detail-lbl">Savunma Gerekli</span>' +
        '<span class="detail-val">' +
        (r.defenseRequired || 'Hayır') +
        '</span></div>' +

        '<div class="detail-item">' +
        '<span class="detail-lbl">İlgili Birim</span>' +
        '<span class="detail-val">' +
        (r.defenseUnit || '-') +
        '</span></div>' +

        '<div class="detail-item">' +
        '<span class="detail-lbl">Savunma Durumu</span>' +

        '<span class="detail-val">' +

        '<select id="defense-status-select" ' +
        'style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;" ' +
        'onchange="updateDefenseStatus(' + r.id + ', this.value)">' +

        '<option value="Bekleniyor" ' +
        ((r.defenseStatus === 'Bekleniyor') ? 'selected' : '') +
        '>🟡 Bekleniyor</option>' +

        '<option value="Savunma Geldi" ' +
        ((r.defenseStatus === 'Savunma Geldi') ? 'selected' : '') +
        '>🔵 Savunma Geldi</option>' +

        '<option value="Eksik Dosya" ' +
        ((r.defenseStatus === 'Eksik Dosya') ? 'selected' : '') +
        '>🔴 Eksik Dosya</option>' +

        '<option value="Tamamlandı" ' +
        ((r.defenseStatus === 'Tamamlandı') ? 'selected' : '') +
        '>🟢 Tamamlandı</option>' +

        '</select>' +

        '</span>' +
        '</div>' +

        '<div class="detail-item">' +
        '<span class="detail-lbl">Talep Tarihi</span>' +
        '<span class="detail-val">' +
        (r.defenseRequestedAt
            ? new Date(r.defenseRequestedAt)
                .toLocaleString("tr-TR")
            : '-') +
        '</span></div>' +

        '<div class="detail-item">' +
        '<span class="detail-lbl">Tamamlanma Tarihi</span>' +
        '<span class="detail-val">' +
        (r.defenseCompletedAt
            ? new Date(r.defenseCompletedAt)
                .toLocaleString("tr-TR")
            : '-') +
        '</span></div>' +

        (
            r.defenseRequired === 'Evet' &&
                r.defenseStatus === 'Bekleniyor'

                ?

                '<div class="detail-item full">' +
                '<button class="btn btn-success" ' +
                'onclick="completeDefense(' + r.id + ')">' +
                '✅ Savunma Geldi' +
                '</button>' +
                '</div>'

                :

                ''
        )
        +

        (
            r.attachments && r.attachments.length > 0

                ?

                r.attachments.map(function (file, index) {

                    return (

                        (
                            file.type.indexOf('image/') === 0
                                ? '🖼️ '

                                : file.type === 'application/pdf'
                                    ? '📄 '

                                    : file.name.match(/\.(doc|docx)$/i)
                                        ? '📝 '

                                        : file.name.match(/\.(xls|xlsx)$/i)
                                            ? '📊 '

                                            : file.name.match(/\.(ppt|pptx)$/i)
                                                ? '📈 '

                                                : file.name.match(/\.(zip|rar|7z)$/i)
                                                    ? '📦 '

                                                    : file.name.match(/\.(eml|msg)$/i)
                                                        ? '📧 '

                                                        : '📎 '
                        )

                        +

                        (index + 1) + '. ' +

                        file.name +

                        ' (' +

                        Math.round(file.size / 1024) +

                        ' KB)' +

                        ' <button onclick="viewAttachment(\'' +

                        file.id +

                        '\')">👁 Görüntüle</button>' +

                        ' <button onclick="downloadAttachment(\'' +

                        file.id +

                        '\')">⬇ İndir</button>'

                    );

                }).join('<br>')

                :

                'Dosya bulunmuyor'

        ) +

        '</div></div>';

    document.getElementById('detail-modal-overlay')
        .classList.add('open');

    if (complaintEditMode) {

        console.log(
            'EDIT MODE AKTİF'
        );

        loadSimpleDropdown(
            'edit-veranstalter',
            'operators',
            'Operatör seçiniz...'
        );

        var operatorSelect =
            document.getElementById('edit-veranstalter');

        console.log(
            'SELECT BULUNDU:',
            operatorSelect
        );

        console.log(
            'OPTION SAYISI:',
            operatorSelect
                ? operatorSelect.options.length
                : 0
        );

        if (operatorSelect) {

            operatorSelect.value =
                r.veranstalter || '';

        }

    }


}

function viewAttachment(id) {

    getAttachment(id).then(function (file) {

        if (!file) {
            alert('Dosya bulunamadı.');
            return;
        }

        var type = (file.type || '').toLowerCase();

        // ---------- RESİMLER ----------
        if (type.indexOf('image/') === 0) {

            if (
                type === 'image/heic' ||
                type === 'image/heif'
            ) {

                if (confirm(
                    'HEIC dosyaları tarayıcıda görüntülenemiyor.\n\nİndirmek ister misiniz?'
                )) {

                    downloadAttachment(id);

                }

                return;
            }

            var win = window.open('', '_blank');

            win.document.write(
                '<html><head><title>' + file.name + '</title></head>' +
                '<body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;height:100vh;">' +
                '<img src="' + file.content + '" style="max-width:100%;max-height:100%;">' +
                '</body></html>'
            );

            return;
        }

        // ---------- PDF ----------
        if (type === 'application/pdf') {

            window.open(file.content, '_blank');

            return;
        }

        // ---------- Diğer Dosyalar ----------
        if (confirm(
            'Bu dosya tarayıcıda görüntülenemiyor.\n\nİndirmek ister misiniz?'
        )) {

            downloadAttachment(id);

        }

    });

}

function downloadAttachment(id) {

    console.log('DOWNLOAD ID=', id);

    getAttachment(id).then(function (file) {

        console.log('DOWNLOAD FILE=', file);

        if (!file) {
            alert('Dosya bulunamadı');
            return;
        }

        var a = document.createElement('a');

        a.href = file.content;
        a.download = file.name;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

    });

}

function enableComplaintEdit(id) {

    complaintEditMode = true;
    editingComplaintId = id;

    openComplaintDetail(id);

}

function cancelComplaintEdit(id) {

    complaintEditMode = false;

    openComplaintDetail(id);

}

function saveComplaintChanges(id) {

    var r = complaints.find(function (o) {
        return o.id === id;
    });

    if (!r) return;

    var operatorSelect =
        document.getElementById(
            'edit-veranstalter'
        );

    if (operatorSelect) {

        r.veranstalter =
            operatorSelect.value;

    }

    syncStorage();

    complaintEditMode = false;

    showToast(
        'Değişiklikler kaydedildi.'
    );

    openComplaintDetail(id);

}

function openInvoiceDetail(id) {
    var r = invoices.find(function (o) { return o.id === id; }); if (!r) return;
    document.getElementById('detail-modal-title').textContent = 'Fatura Finans Kart Detayı: ' + r.faturaNo;

    document.getElementById('detail-modal-body').innerHTML = '<div class="detail-grid">' +
        '<div class="detail-item"><span class="detail-lbl">Fatura Numarası</span><span class="detail-val">' + r.faturaNo + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Fatura Tarihi</span><span class="detail-val">' + r.tarih + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Partner (Kime Gönderildi)</span><span class="detail-val">' + r.partner + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">İlgili Rezervasyon (Booking)</span><span class="detail-val">' + r.booking + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Gönderilen Tutar</span><span class="detail-val">' + fmt(r.tutar) + ' ' + r.doviz + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Durum</span><span class="detail-val">' + r.durum + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">Kabul Durumu</span><span class="detail-val">' + (r.kabul || 'Beklemede') + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">İade / Tahsil Edilen Tutar</span><span class="detail-val">' + fmt(r.iadeTutar) + ' ' + r.doviz + '</span></div>' +
        '<div class="detail-item"><span class="detail-lbl">İade / Tahsilat Tarihi</span><span class="detail-val">' + (r.iadeDate || '—') + '</span></div>' +
        '<div class="detail-item full"><span class="detail-lbl">Kesinti Sebebi Gerekçesi / Finans Notu</span><div class="note-box">' + (r.kesinti || '—') + '</div></div>' +
        '</div>';

    document.getElementById('detail-modal-overlay')
        .classList.add('open');

}

// ==================== SİLME MEKANİZMALARI ====================
function deleteComplaint(id) {
    if (!confirm('Bu şikayet kaydını kalıcı olarak silmek istiyor musunuz?')) return;
    complaints = complaints.filter(function (o) { return o.id !== id; }); syncStorage();
    renderRecordsTable(); renderDashboard(); showToast('Kayıt silindi.');
}
function deleteInvoice(id) {
    if (!confirm('Bu fatura takip kaydını kalıcı olarak silmek istiyor musunuz?')) return;
    invoices = invoices.filter(function (o) { return o.id !== id; }); syncStorage();
    renderAccounting(); renderDashboard(); showToast('Fatura silindi.');
}

// ==================== DASHBOARD VE CSS GRAPHICS ====================
function getDefenseInfo(record) {

    if (record.defenseStatus === 'Tamamlandı') {

        return {
            status: 'Tamamlandı',
            color: '#4caf50',
            remaining: ''
        };
    }

    if (record.defenseStatus === 'Eksik Dosya') {

        return {
            status: 'Eksik Dosya',
            color: '#e74c3c',
            remaining: ''
        };
    }

    if (record.defenseStatus === 'Savunma Geldi') {

        return {
            status: 'Savunma Geldi',
            color: '#2196f3',
            remaining: ''
        };
    }

    if (record.defenseRequired !== 'Evet') {

        return {
            status: 'Yok',
            color: '#999',
            remaining: ''
        };
    }

    if (!record.defenseRequestedAt) {

        return {
            status: 'Bekleniyor',
            color: '#f39c12',
            remaining: ''
        };
    }

    var requested =
        new Date(record.defenseRequestedAt);

    var now = new Date();

    var diffHours =
        (now - requested) / (1000 * 60 * 60);

    var remaining =
        Math.max(0, 48 - diffHours);

    if (diffHours >= 48) {

        return {
            status: 'Süre Aşıldı',
            color: '#e74c3c',
            remaining: '0 saat'
        };
    }

    if (diffHours >= 48) {

        return {
            status: 'Süre Aşıldı',
            color: '#e74c3c',
            remaining: '0 saat'
        };
    }

    if (remaining <= 12) {

        return {
            status: 'Kritik',
            color: '#c62828',
            remaining:
                Math.floor(remaining) +
                ' saat'
        };
    }

    if (remaining <= 24) {

        return {
            status: 'Yaklaşıyor',
            color: '#ef6c00',
            remaining:
                Math.floor(remaining) +
                ' saat'
        };
    }

    return {
        status: 'Bekleniyor',
        color: '#f1c40f',
        remaining:
            Math.floor(remaining) +
            ' saat'
    };
}

function renderDashboard() {

    var activeComplaints = complaints.filter(function (r) {
        return !r.isDeleted;
    });

    var total = activeComplaints.length;

    console.log(
        'Toplam:',
        complaints.length,
        'Aktif:',
        activeComplaints.length,
        'Silinen:',
        complaints.filter(x => x.isDeleted).length
    );

    var hakliCount = activeComplaints.filter(function (o) {
        return o.result === 'Haklı';
    }).length;

    var activeInvs = invoices.length;

    var deleteRequests = activeComplaints.filter(function (o) {
        return o.deleteRequested === true && !o.isDeleted;
    }).length;

    var deletedCount = complaints.filter(function (r) {
        return r.isDeleted === true;
    }).length;

    var defenseWaiting = activeComplaints.filter(function (r) {
        return r.defenseStatus === 'Bekleniyor';
    }).length;

    var defenseReceived = activeComplaints.filter(function (r) {
        return r.defenseStatus === 'Savunma Geldi';
    }).length;

    var defenseMissing = activeComplaints.filter(function (r) {
        return r.defenseStatus === 'Eksik Dosya';
    }).length;

    var defenseCompleted = activeComplaints.filter(function (r) {
        return r.defenseStatus === 'Tamamlandı';
    }).length;

    var totalDefenseRequests =
        defenseWaiting +
        defenseReceived +
        defenseMissing +
        defenseCompleted;

    var completionRate =
        totalDefenseRequests > 0
            ? Math.round((defenseCompleted / totalDefenseRequests) * 100)
            : 0;

    var criticalDefenseCount = activeComplaints.filter(function (r) {

        var info = getDefenseInfo(r);

        return info.status === 'Kritik'
            || info.status === 'Süre Aşıldı';



        var info = getDefenseInfo(c);

        return info.status === 'Süre Aşıldı';

    }).length;
    var paxData =
        JSON.parse(
            localStorage.getItem('reservations')
        ) || [];

    var totalAdult = 0;
    var totalChild = 0;
    var totalInfant = 0;

    paxData.forEach(function (p) {

        totalAdult += parseInt(p.adult || 0);

        totalChild += parseInt(p.child || 0);

        totalInfant += parseInt(p.infant || 0);

    });

    var totalPassengers =
        totalAdult +
        totalChild +
        totalInfant;

    var complaintRatio =
        totalPassengers > 0
            ? ((total / totalPassengers) * 100).toFixed(2)
            : '0.00';

    var operatorCounts = {};

    activeComplaints.forEach(function (c) {

        var op = c.veranstalter || 'Bilinmiyor';

        operatorCounts[op] =
            (operatorCounts[op] || 0) + 1;

    });

    var topOperator = '-';
    var topOperatorCount = 0;

    Object.keys(operatorCounts).forEach(function (op) {

        if (operatorCounts[op] > topOperatorCount) {

            topOperator = op;
            topOperatorCount = operatorCounts[op];

        }

    });

    document.getElementById('dash-stats').innerHTML =

        '<div class="stat-card">' +
        '<div class="s-lbl">TOPLAM YOLCU</div>' +
        '<div class="s-val" style="color:#2196F3;font-size:34px;">' +
        totalPassengers +
        '</div>' +
        '</div>' +

        '<div class="stat-card">' +
        '<div class="s-lbl">TOPLAM ŞİKAYET</div>' +
        '<div class="s-val" style="color:#e53935;font-size:34px;">' +
        total +
        '</div>' +
        '</div>' +

        '<div class="stat-card">' +
        '<div class="s-lbl">Şikayet Oranı %</div>' +
        '<div class="s-val" style="color:#FF9800;">' +
        complaintRatio +
        '%</div>' +
        '</div>' +

        '<div class="stat-card">' +
        '<div class="s-lbl">EN ÇOK ŞİKAYET ALAN OPERATÖR</div>' +
        '<div class="s-val" style="color:#d32f2f;font-size:22px;">' +
        topOperatorCount +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-top:4px;">' +
        topOperator +
        '</div>' +
        '</div>' +


        '<div class="stat-card"><div class="s-lbl">Haklı Bulunan Dosyalar</div><div class="s-val" style="color:#3B6D11;">' + hakliCount + '</div><div class="s-sub">%' + (total ? Math.round((hakliCount / total) * 100) : 0) + ' Mutabakat Oranı</div></div>' +
        '<div class="stat-card">' +
        '<div class="s-lbl">Yetişkin</div>' +
        '<div class="s-val" style="color:#4CAF50;">' +
        totalAdult +
        '</div>' +
        '</div>' +

        '<div class="stat-card">' +
        '<div class="s-lbl">Çocuk</div>' +
        '<div class="s-val" style="color:#9C27B0;">' +
        totalChild +
        '</div>' +
        '</div>' +

        '<div class="stat-card">' +
        '<div class="s-lbl">Bebek</div>' +
        '<div class="s-val" style="color:#03A9F4;">' +
        totalInfant +
        '</div>' +
        '</div>';


    document.getElementById('dashboard-defense-panel').innerHTML =

        '<div class="defense-dashboard-card">' +

        '<h3>🛡️ Savunma Takip Merkezi</h3>' +

        '<div class="defense-grid">' +

        '<div class="defense-mini">' +
        '<div>Bekleyen</div>' +
        '<div class="val" style="color:#f59e0b;">' +
        defenseWaiting +
        '</div></div>' +

        '<div class="defense-mini">' +
        '<div>Savunma Geldi</div>' +
        '<div class="val" style="color:#2563eb;">' +
        defenseReceived +
        '</div></div>' +

        '<div class="defense-mini">' +
        '<div>Eksik Dosya</div>' +
        '<div class="val" style="color:#dc2626;">' +
        defenseMissing +
        '</div></div>' +

        '<div class="defense-mini">' +
        '<div>Tamamlandı</div>' +
        '<div class="val" style="color:#16a34a;">' +
        defenseCompleted +
        '</div></div>' +

        '<div class="defense-mini">' +
        '<div>Kritik</div>' +
        '<div class="val" style="color:#b91c1c;">' +
        criticalDefenseCount +
        '</div></div>' +

        '</div>' +
        '</div>';

    var accBox =
        document.getElementById('accounting-summary');

    if (accBox) {

        accBox.innerHTML =
            activeInvs;

    }

    renderOperatorRatios();

    renderDonutChart('chart-servis',
        countBy(activeComplaints, 'servis'),
        ['#185FA5', '#1D9E75', '#D85A30', '#BA7517', '#534AB7']);

    renderDonutChart('chart-sonuc',
        countBy(activeComplaints, 'result'),
        ['#A32D2D', '#3B6D11']);

    renderTrendChart('chart-kw',
        countBy(activeComplaints, 'kw'));

    renderServiceComplaints();

    renderTopComplaintSubjects();
}

function renderDonutChart(containerId, data, colors) {
    var el = document.getElementById(containerId); if (!el) return;
    var labels = Object.keys(data), values = Object.values(data), total = values.reduce(function (a, b) { return a + b; }, 0);
    if (!total) { el.innerHTML = '<div>Yeterli metrik yok</div>'; return; }

    var legendHtml = '';
    for (var i = 0; i < labels.length; i++) {
        legendHtml += '<div class="donut-leg-item"><div class="donut-leg-dot" style="background:' + colors[i % colors.length] + ';"></div><span>' + labels[i] + ' (' + values[i] + ')</span></div>';
    }
    el.innerHTML = '<svg width="80" height="80" viewBox="0 0 120 120"><circle cx="60" cy="60" r="45" fill="none" stroke="#edede9" stroke-width="16"/><circle cx="60" cy="60" r="45" fill="none" stroke="' + colors[0] + '" stroke-width="16" stroke-dasharray="282.7" stroke-dashoffset="80"/><text x="60" y="66" text-anchor="middle" font-size="18" font-weight="bold" fill="currentColor">' + total + '</text></svg><div class="donut-legend">' + legendHtml + '</div>';
}

function renderTrendChart(containerId, kwData) {
    var el = document.getElementById(containerId); if (!el) return;
    var keys = Object.keys(kwData).sort(); var max = 0;
    if (!keys.length) { el.innerHTML = '<div>Trend verisi yok</div>'; return; }

    for (var i = 0; i < keys.length; i++) {
        if (kwData[keys[i]] > max) max = kwData[keys[i]];
    }

    var html = '';
    for (var j = 0; j < keys.length; j++) {
        var h = Math.max(6, Math.round((kwData[keys[j]] / max) * 110));
        html += '<div class="kw-col">' +
            '<div style="font-size:11px;">' + kwData[keys[j]] + '</div>' +
            '<div style="height:' + h + 'px; background:var(--blue); width:24px; border-radius:4px 4px 0 0;"></div>' +
            '<div style="font-size:10px; color:var(--text-secondary);">' + keys[j] + '</div>' +
            '</div>';
    }
    el.innerHTML = html;
}
function renderOperatorRatios() {

    var activeComplaints = complaints.filter(function (r) {
        return !r.isDeleted;
    });

    var paxData =
        JSON.parse(
            localStorage.getItem('passengerStats')
        ) || [];

    var stats = {};

    paxData.forEach(function (p) {

        var op =
            p.veranstalter ||
            p.operator ||
            'Bilinmiyor';

        if (!stats[op]) {
            stats[op] = {
                pax: 0,
                complaints: 0
            };
        }

        stats[op].pax +=
            Number(p.adult || 0) +
            Number(p.child || 0) +
            Number(p.infant || 0);

    });

    activeComplaints.forEach(function (c) {

        var op = c.veranstalter || 'Bilinmiyor';

        if (!stats[op]) {
            stats[op] = {
                pax: 0,
                complaints: 0
            };
        }

        stats[op].complaints++;

    });

    var rows = [];

    Object.keys(stats).forEach(function (op) {

        var pax = stats[op].pax;

        var comp = stats[op].complaints;

        var ratio =
            pax > 0
                ? ((comp / pax) * 100).toFixed(2)
                : 0;

        var riskLevel = '🟢 Düşük';

        if (ratio >= 7) {
            riskLevel = '🔴 Yüksek';
        }
        else if (ratio >= 3) {
            riskLevel = '🟡 Orta';
        }

        rows.push({
            operator: op,
            pax: pax,
            complaints: comp,
            ratio: Number(ratio),
            risk: riskLevel
        });

    });

    rows.sort(function (a, b) {
        return b.ratio - a.ratio;
    });

    console.table(rows);

    var html =
        '<table class="table">' +
        '<thead>' +
        '<tr>' +
        '<th>Operatör</th>' +
        '<th>PAX</th>' +
        '<th>Şikayet</th>' +
        '<th>Oran %</th>' +
        '<th>Risk</th>' +
        '</tr>' +
        '</thead><tbody>';

    rows.forEach(function (r) {

        html +=
            '<tr>' +
            '<td>' + r.operator + '</td>' +
            '<td>' + r.pax + '</td>' +
            '<td>' + r.complaints + '</td>' +
            '<td>' + r.ratio + '%</td>' +
            '<td>' + r.risk + '</td>' +
            '</tr>';

    });

    html += '</tbody></table>';

    document.getElementById('operator-ratio').innerHTML = html;

    var maxComplaint = 0;

    rows.forEach(function (r) {

        if (r.complaints > maxComplaint) {
            maxComplaint = r.complaints;
        }

    });

    var chartHtml = '';

    rows.forEach(function (r) {

        var width =
            maxComplaint > 0
                ? (r.complaints / maxComplaint) * 100
                : 0;

        chartHtml +=
            '<div class="operator-bar">' +
            '<div class="operator-name">' +
            r.operator +
            '</div>' +
            '<div class="operator-track">' +
            '<div class="operator-fill" style="width:' +
            width +
            '%;">' +
            r.complaints +
            ' şikayet</div>' +
            '</div>' +
            '</div>';

    });

    document.getElementById('operator-chart').innerHTML =
        chartHtml;

    var regionStats = {};

    complaints.forEach(function (c) {

        var region = c.region || 'Bilinmiyor';

        regionStats[region] =
            (regionStats[region] || 0) + 1;

    });

    var maxRegion = 0;

    Object.keys(regionStats).forEach(function (r) {

        if (regionStats[r] > maxRegion) {
            maxRegion = regionStats[r];
        }

    });

    var regionHtml = '';

    Object.keys(regionStats).forEach(function (r) {

        var width =
            (regionStats[r] / maxRegion) * 100;

        regionHtml +=
            '<div class="operator-bar">' +
            '<div class="operator-name">' +
            r +
            '</div>' +
            '<div class="operator-track">' +
            '<div class="operator-fill" style="width:' +
            width +
            '%;">' +
            regionStats[r] +
            ' şikayet</div>' +
            '</div>' +
            '</div>';

    });

    document.getElementById('region-chart').innerHTML =
        regionHtml;

}

function renderServiceComplaints() {

    var activeComplaints = complaints.filter(function (r) {
        return !r.isDeleted;
    });

    var box = document.getElementById('service-complaint-chart');
    if (!box) return;

    var services = {};

    activeComplaints.forEach(function (c) {

        var service = c.ptr || 'Diğer';

        services[service] = (services[service] || 0) + 1;

    });
    var html = '';

    Object.keys(services)
        .sort(function (a, b) {
            return services[b] - services[a];
        })
        .forEach(function (s) {

            html +=
                '<div style="margin-bottom:12px;">' +
                '<div style="display:flex;justify-content:space-between;">' +
                '<span>' + s + '</span>' +
                '<b>' + services[s] + '</b>' +
                '</div>' +
                '<div style="height:8px;background:#eee;border-radius:5px;">' +
                '<div style="height:8px;background:#2563eb;border-radius:5px;width:' +
                (services[s] * 20) +
                '%;"></div>' +
                '</div>' +
                '</div>';

        });

    box.innerHTML = html;
}

function renderTopComplaintSubjects() {

    var activeComplaints = complaints.filter(function (r) {
        return !r.isDeleted;
    });

    var box = document.getElementById('top-complaints-chart');
    if (!box) return;
    var topics = {};

    activeComplaints.forEach(function (c) {

        [c.ptr, c.ptr2, c.ptr3].forEach(function (p) {

            if (!p) return;

            topics[p] = (topics[p] || 0) + 1;

        });

    });

    var top =
        Object.entries(topics)
            .sort(function (a, b) {
                return b[1] - a[1];
            })
            .slice(0, 5);

    var html = '';

    top.forEach(function (item) {

        html +=
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">' +
            '<span>' + item[0] + '</span>' +
            '<b>' + item[1] + '</b>' +
            '</div>';

    });

    box.innerHTML = html;
}

function resetDatabase() {
    if (!confirm('Tüm şikayet ve fatura kayıtları silinsin mi?')) return;
    localStorage.removeItem('tralvid_pages_complaints');
    localStorage.removeItem('tralvid_pages_invoices');
    complaints = []; invoices = [];
    renderRecordsTable(); renderAccounting(); renderDashboard();
    showToast('Veritabanı temizlendi.');
}

function backupDatabase() {
    var backup = {
        complaints: complaints,
        invoices: invoices,
        backupDate: new Date().toISOString()
    };
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    var dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "CRM_Yedek_" + new Date().toISOString().slice(0, 10) + ".json");
    dlAnchorElem.click();
}

function restoreDatabase(event) {
    var file = event.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = JSON.parse(e.target.result);
            complaints = data.complaints || []; invoices = data.invoices || [];
            syncStorage(); renderRecordsTable(); renderDashboard(); renderAccounting();
            showToast('Yedek başarıyla geri yüklendi.');
        } catch (err) { alert('Geçersiz yedek dosyası.'); }
    };
    reader.readAsText(file);
}

function importMasterData(event) {

    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();

    reader.onload = function (e) {

        var data = new Uint8Array(e.target.result);

        var workbook = XLSX.read(data, {
            type: 'array'
        });

        function readSheet(sheetName) {

            if (!workbook.Sheets[sheetName]) {
                return [];
            }

            var rows = XLSX.utils.sheet_to_json(
                workbook.Sheets[sheetName],
                { header: 1 }
            );

            return rows
                .slice(1)
                .map(r => r[0])
                .filter(Boolean);

        }

        localStorage.setItem(
            'operators',
            JSON.stringify(readSheet('Operatörler'))
        );

        localStorage.setItem(
            'regions',
            JSON.stringify(readSheet('Bolgeler'))
        );

        localStorage.setItem(
            'airports',
            JSON.stringify(readSheet('Havalimanlari'))
        );

        localStorage.setItem(
            'services',
            JSON.stringify(readSheet('Servisler'))
        );

        var complaintSheet =
            workbook.Sheets['SikayetKonulari'];

        if (complaintSheet) {

            var rows =
                XLSX.utils.sheet_to_json(
                    complaintSheet,
                    { header: 1 }
                );

            var reasonsTR = [];
            var reasonsDE = [];
            var reasonsEN = [];

            for (var i = 1; i < rows.length; i++) {

                if (rows[i][0]) {
                    reasonsTR.push(rows[i][0]);
                }

                if (rows[i][1]) {
                    reasonsDE.push(rows[i][1]);
                }

                if (rows[i][2]) {
                    reasonsEN.push(rows[i][2]);
                }
            }

            localStorage.setItem(
                'reasonsTR',
                JSON.stringify(reasonsTR)
            );

            localStorage.setItem(
                'reasonsDE',
                JSON.stringify(reasonsDE)
            );

            localStorage.setItem(
                'reasonsEN',
                JSON.stringify(reasonsEN)
            );
        }

        localStorage.setItem(
            'transferTypes',
            JSON.stringify(readSheet('TransferTurleri'))
        );

        localStorage.setItem(
            'hotelPartners',
            JSON.stringify(readSheet('Oteller'))
        );

        showToast('Master veri başarıyla yüklendi.');

        renderDashboard();

    };

    reader.readAsArrayBuffer(file);

}

function exportMasterData() {

    var workbook = XLSX.utils.book_new();

    function addSheet(sheetName, storageKey, columnName) {

        var data =
            JSON.parse(
                localStorage.getItem(storageKey)
            ) || [];

        var rows = [[columnName]];

        data.forEach(function (item) {
            rows.push([item]);
        });

        var worksheet =
            XLSX.utils.aoa_to_sheet(rows);

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            sheetName
        );
    }

    addSheet(
        'Operatörler',
        'operators',
        'Operatör'
    );

    addSheet(
        'Bolgeler',
        'regions',
        'Bölge'
    );

    addSheet(
        'Havalimanlari',
        'airports',
        'Havalimanı'
    );

    addSheet(
        'Servisler',
        'services',
        'Servis'
    );

    addSheet(
        'SikayetKonulari',
        'reasons',
        'Konu'
    );

    addSheet(
        'TransferTurleri',
        'transferTypes',
        'Transfer Türü'
    );

    addSheet(
        'Oteller',
        'hotelPartners',
        'Otel'
    );

    XLSX.writeFile(
        workbook,
        'TRALVID_MasterData.xlsx'
    );

    showToast(
        'Master veri Excel dosyası oluşturuldu.'
    );
}

// Overlay Kapatıcı Kuralı
document.addEventListener('click', function (e) {
    if (e.target.id === 'complaint-modal-overlay') closeComplaintModal();
    if (e.target.id === 'invoice-modal-overlay') closeInvoiceModal();
    if (e.target.id === 'detail-modal-overlay') closeDetailModal();
});

// INITIALIZER
document.addEventListener('DOMContentLoaded', function () {

    if (!localStorage.getItem('transferTypes')) {

        localStorage.setItem(
            'transferTypes',
            JSON.stringify([
                'Shuttle',
                'Private Sedan',
                'Private Minivan',
                'Private Vito',
                'Private Sprinter',
                'Private Midibus',
                'Private Bus',
                'VIP Sedan',
                'VIP Vito',
                'VIP Minibus',
                'VIP Midibus'
            ])
        );

    }

    if (!localStorage.getItem('operators')) {

        localStorage.setItem(
            'operators',
            JSON.stringify([
                'TUI',
                'JET2',
                'ANEX',
                'CORAL',
                'ODEON',
                'DERTOUR',
                'SCHAUINSLAND',
                'HOLIDAY CHECK',
                'LOVEHOLIDAYS',
                'ON THE BEACH',
                'EASYJET HOLIDAYS',
                'SUNEXPRESS HOLIDAYS'
            ])
        );

    }

    var savedUser = sessionStorage.getItem('currentUser');

    if (savedUser) {

        currentUser = JSON.parse(savedUser);

        if (!currentUser) {
            sessionStorage.removeItem('currentUser');
            location.reload();
            return;
        }

        if (!currentUser.username) {
            sessionStorage.removeItem('currentUser');
            location.reload();
            return;
        }

        if (!USERS[currentUser.username]) {

            localStorage.removeItem('currentUser');

            document.getElementById('login-modal')
                .style.display = 'flex';

            return;
        }

        document.getElementById('login-modal')
            .style.display = 'none';

        applyPermissions();

        initSessionTimeout();

        renderDashboard();
        renderRecordsTable();
        renderAccounting();
        renderUsers();
        renderDeleteRequests();

        showPage(
            localStorage.getItem('activePage') || 'dashboard'
        );

        /* SAVUNMA DOSYALARI */

        document
            .getElementById('c-sn')
            .addEventListener('change', function () {

                document
                    .getElementById('defense-file-area')
                    .style.display =

                    this.value === 'Evet'

                        ? 'block'
                        : 'none';

            });

        document
            .getElementById('c-defense-files')
            .addEventListener('change', function () {

                Array
                    .from(this.files)
                    .forEach(function (file) {

                        pendingAttachments.push(file);

                    });

                var html = '';

                pendingAttachments.forEach(function (file, index) {

                    html +=
                        (index + 1) +
                        '. 📎 ' +
                        file.name +
                        ' <button type="button" onclick="removePendingFile(' +
                        index +
                        ')">❌</button><br>';

                });

                document
                    .getElementById('defense-file-list')
                    .innerHTML = html;

                this.value = '';

            });

        window.addEventListener('storage', function () {

            complaints = JSON.parse(
                localStorage.getItem('tralvid_pages_complaints')
            ) || [];

            invoices = JSON.parse(
                localStorage.getItem('tralvid_pages_invoices')
            ) || [];

            renderDashboard();
            renderRecordsTable();
            renderAccounting();
            renderDeleteRequests();

        });

    } else {

        document.getElementById('login-modal')
            .style.display = 'flex';

    }

});