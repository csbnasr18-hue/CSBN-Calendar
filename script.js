// ============================================================
// [1] FIREBASE CONFIGURATION
// ============================================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ============================================================
// [2] DATA STATE
// ============================================================
let currentView = new Date();
let bookings = [];
let inventory = [];

// ============================================================
// [3] LIVE CLOUD SYNC
// ============================================================
db.ref('calendarData').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        bookings = data.bookings || [];
        inventory = data.inventory || [
            { name: "LED Screen", total: 10 }, 
            { name: "Speaker Kit", total: 5 }
        ];
    } else {
        bookings = [];
        inventory = [
            { name: "LED Screen", total: 10 }, 
            { name: "Speaker Kit", total: 5 }
        ];
    }
    renderMasterInventory();
    updateItemsList();
    renderCalendar();
});

function saveAll() {
    db.ref('calendarData').set({
        bookings: bookings,
        inventory: inventory
    });
}

// ============================================================
// [4] SECURITY & SIDEBAR LOGIC
// ============================================================
function unlockSidebar() {
    const SIDEBAR_PASSWORD = "CSBN123456789"; 
    const entry = prompt("Enter Administration Password to unlock sidebar:");

    if (entry === SIDEBAR_PASSWORD) {
        document.getElementById('sidebar').classList.remove('locked');
        document.getElementById('sidebarLockOverlay').style.display = 'none';
    } else if (entry !== null) {
        alert("❌ Incorrect Password.");
    }
}

function toggleSidebar() { 
    const sidebar = document.getElementById('sidebar');
    const isClosing = !sidebar.classList.contains('closed');

    sidebar.classList.toggle('closed'); 

    // Auto-lock when closed
    if (isClosing) {
        sidebar.classList.add('locked');
        document.getElementById('sidebarLockOverlay').style.display = 'flex';
    }
}

// ============================================================
// [5] RENDER LOGIC
// ============================================================
function renderMasterInventory() {
    const masterList = document.getElementById('masterInventoryList');
    if (!masterList) return;
    masterList.innerHTML = '';
    inventory.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `<span>${item.name} (${item.total})</span><button onclick="deleteStockItem(${index})" style="color:red;border:none;background:none;cursor:pointer;">&times;</button>`;
        masterList.appendChild(row);
    });
}

function updateItemsList() {
    const list = document.getElementById('equipmentSelector');
    const selectedDate = document.getElementById('eventDate').value;
    if (!list) return;
    list.innerHTML = '';
    inventory.forEach(item => {
        let bookedQty = 0;
        if(selectedDate) {
            bookings.filter(b => b.date === selectedDate).forEach(b => {
                const match = b.items.find(i => i.name === item.name);
                if(match) bookedQty += match.qty;
            });
        }
        let avail = item.total - bookedQty;
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;"><input type="checkbox" class="item-check" data-name="${item.name}" ${avail <= 0 ? 'disabled' : ''}><b>${item.name}</b></div>
            <div><span style="font-size:0.65rem;color:#64748b;">${avail}/${item.total}</span> <input type="number" class="qty-input" value="1" min="1" max="${avail}" style="width:40px;" ${avail <= 0 ? 'disabled' : ''}></div>
        `;
        list.appendChild(row);
    });
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const jumpMonth = document.getElementById('jumpMonth');
    const jumpYear = document.getElementById('jumpYear');
    
    if(jumpMonth) jumpMonth.value = currentView.getMonth();
    if(jumpYear) jumpYear.value = currentView.getFullYear();
    
    grid.innerHTML = '';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
        const h = document.createElement('div'); h.className = 'day-header'; h.innerText = d; grid.appendChild(h);
    });

    const year = currentView.getFullYear();
    const month = currentView.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for(let i=0; i<firstDay; i++) grid.appendChild(document.createElement('div'));
    
    for(let d=1; d<=daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const box = document.createElement('div'); box.className = 'day'; box.innerHTML = `<b>${d}</b>`;
        
        bookings.filter(b => b.date === dateStr).forEach(b => {
            const card = document.createElement('div'); card.className = 'cal-event';
            const tags = b.items.map(i => `<span>${i.qty} ${i.name}</span>`).join(' ');
            card.innerHTML = `<button class="delete-event" onclick="removeBooking(${b.id})">&times;</button><b>${b.type}</b><div>${b.name}</div>${tags}<span class="event-staff">👤 ${b.staff}</span>`;
            box.appendChild(card);
        });
        grid.appendChild(box);
    }
}

// ============================================================
// [6] USER ACTIONS
// ============================================================
function deleteStockItem(index) { if(confirm("Delete item?")) { inventory.splice(index, 1); saveAll(); } }

function removeBooking(id) {
    const DELETE_PASSWORD = "CSBN123456789";
    const passwordEntry = prompt("SECURITY CHECK: Enter password to delete:");

    if (passwordEntry === DELETE_PASSWORD) {
        bookings = bookings.filter(b => b.id !== id);
        saveAll();
    } else if (passwordEntry !== null) {
        alert("❌ Access Denied.");
    }
}

document.getElementById('addInvBtn').onclick = () => {
    const name = document.getElementById('newInvName').value;
    const qty = parseInt(document.getElementById('newInvQty').value);
    if(name && !isNaN(qty) && qty > 0) {
        inventory.push({ name, total: qty });
        document.getElementById('newInvName').value = '';
        document.getElementById('newInvQty').value = '';
        saveAll();
    }
};

document.getElementById('addBtn').onclick = () => {
    const name = document.getElementById('eventName').value;
    const date = document.getElementById('eventDate').value;
    const staff = document.getElementById('personnel').value;
    const type = document.getElementById('inputType').value;
    const selected = [];
    
    document.querySelectorAll('#equipmentSelector .item-row').forEach(row => {
        const cb = row.querySelector('.item-check');
        const qty = row.querySelector('.qty-input');
        if(cb && cb.checked) selected.push({ name: cb.dataset.name, qty: parseInt(qty.value) });
    });

    if(!name || !date || selected.length === 0) return alert("Fill all fields and select items.");
    
    bookings.push({ id: Date.now(), name, date, staff, type, items: selected });
    saveAll();
    
    document.getElementById('eventName').value = '';
    document.getElementById('personnel').value = '';
};

document.getElementById('excelBtn').onclick = () => {
    let csv = "Date,Project,Type,Staff,Equipment\n";
    bookings.forEach(b => {
        const eq = b.items.map(i => `${i.qty} ${i.name}`).join(" | ");
        csv += `${b.date},${b.name},${b.type},${b.staff},"${eq}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'CSBN_Report.csv'; a.click();
};

document.getElementById('prevMonth').onclick = () => { currentView.setMonth(currentView.getMonth()-1); renderCalendar(); };
document.getElementById('nextMonth').onclick = () => { currentView.setMonth(currentView.getMonth()+1); renderCalendar(); };
document.getElementById('eventDate').onchange = updateItemsList;

function initJumpSelectors() {
    const monthSelect = document.getElementById('jumpMonth');
    const yearSelect = document.getElementById('jumpYear');
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    months.forEach((m, i) => {
        let opt = document.createElement('option');
        opt.value = i; opt.innerText = m;
        monthSelect.appendChild(opt);
    });

    const cy = new Date().getFullYear();
    for(let y = cy - 5; y <= cy + 10; y++) {
        let opt = document.createElement('option');
        opt.value = y; opt.innerText = y;
        yearSelect.appendChild(opt);
    }

    monthSelect.onchange = () => { currentView.setMonth(monthSelect.value); renderCalendar(); };
    yearSelect.onchange = () => { currentView.setFullYear(yearSelect.value); renderCalendar(); };
}

initJumpSelectors();