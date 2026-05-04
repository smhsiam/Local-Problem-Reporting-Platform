const token = localStorage.getItem('token');
const name  = localStorage.getItem('name');

if (!token) window.location.href = 'index.html';

document.getElementById('welcome-msg').textContent = name || '';
const avatar = document.getElementById('nav-avatar');
if (name) avatar.textContent = name.charAt(0).toUpperCase();

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

const catEmoji = {
    Road: '🛣️',         Bridge: '🌉',        Footpath: '🚶',
    Water: '💧',         Drainage: '🌊',       Sewage: '🚿',
    Electricity: '⚡',   'Street Light': '💡', Gas: '🔥',
    Garbage: '🗑️',      Tree: '🌳',           'Air Pollution': '💨',
    'Noise Pollution': '🔊', 'Water Pollution': '🏭',
    Transport: '🚌',     Hospital: '🏥',       School: '🏫',
    Park: '🌳',          Market: '🏪',         'Government Office': '🏛️',
    'Building Safety': '🏗️', Traffic: '🚦',   Crime: '🚨',
    'Fire Hazard': '🔥', Animal: '🐾',         Other: '📌'
};

const map = L.map('map').setView([23.8103, 90.4125], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

const pinIcon = L.divIcon({
    className: '',
    html: `<div style="
        background:#40916c;
        width:22px; height:22px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid white;
        box-shadow:0 2px 8px rgba(64,145,108,.5);">
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22]
});

let marker;

function placePin(lat, lng, zoom = null) {
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    document.getElementById('lat').value = lat;
    document.getElementById('lng').value = lng;
    if (zoom) map.setView([lat, lng], zoom);
}

map.on('click', async function(e) {
    const { lat, lng } = e.latlng;
    placePin(lat, lng);
    try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        document.getElementById('location').value = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
        document.getElementById('location').value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
});

function onDistrictChange(val) {
    if (!val) return;
    const [districtName, lat, lng] = val.split('|');
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    placePin(la, ln, 12);
    document.getElementById('location').value = districtName + ', Bangladesh';
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${ln}&format=json`)
        .then(r => r.json())
        .then(d => {
            document.getElementById('location').value = d.display_name || districtName + ', Bangladesh';
        })
        .catch(() => {
            document.getElementById('location').value = districtName + ', Bangladesh';
        });
}

function updateFileName(input) {
    const display = document.getElementById('file-name-display');
    display.textContent = input.files[0] ? '✅ ' + input.files[0].name : '';
}

async function submitReport() {
    const title       = document.getElementById('title').value.trim();
    const category    = document.getElementById('category').value;
    const location    = document.getElementById('location').value.trim();
    const description = document.getElementById('description').value.trim();
    const lat         = document.getElementById('lat').value;
    const lng         = document.getElementById('lng').value;
    const imageFile   = document.getElementById('image').files[0];
    const msgEl       = document.getElementById('submit-msg');

    if (!title || !category || !location || !description) {
        msgEl.innerHTML = `<div style="color:#dc2626;font-size:13px;margin-top:8px;padding:10px;background:#fee2e2;border-radius:8px;">
            ⚠️ Please fill in all required fields and pick a location.
        </div>`;
        return;
    }

    const btn = document.querySelector('.btn-submit');
    btn.textContent = '⏳ Submitting...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('title',       title);
    formData.append('category',    category);
    formData.append('location',    location);
    formData.append('description', description);
    formData.append('lat',         lat || '');
    formData.append('lng',         lng || '');
    if (imageFile) formData.append('image', imageFile);

    try {
        const res  = await fetch('http://localhost:3000/api/reports/submit', {
            method: 'POST',
            headers: { 'authorization': token },
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            showToast('✅ Report submitted successfully!', 'success');
            msgEl.innerHTML = '';
            document.getElementById('title').value           = '';
            document.getElementById('category').value        = '';
            document.getElementById('location').value        = '';
            document.getElementById('description').value     = '';
            document.getElementById('district-select').value = '';
            document.getElementById('file-name-display').textContent = '';
            document.getElementById('image').value           = '';
            if (marker) map.removeLayer(marker);
            loadReports();
        } else {
            msgEl.innerHTML = `<div style="color:#dc2626;font-size:13px;margin-top:8px;">❌ ${data.message}</div>`;
        }
    } catch {
        msgEl.innerHTML = `<div style="color:#dc2626;font-size:13px;margin-top:8px;">❌ Server error. Please try again.</div>`;
    } finally {
        btn.textContent = '🚀 Submit Report';
        btn.disabled = false;
    }
}

let allReports = [];

async function loadReports() {
    const list = document.getElementById('reports-list');
    list.innerHTML = `<div class="skeleton"></div><div class="skeleton" style="height:60px"></div>`;
    try {
        const res  = await fetch('http://localhost:3000/api/reports/all', {
            headers: { 'authorization': token }
        });
        const data = await res.json();
        allReports = data.reports || [];
        applyFilters();
    } catch {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Could not load reports</p><span>Check your connection and try again</span></div>`;
    }
}

function filterReports() { applyFilters(); }

function applyFilters() {
    const status   = document.getElementById('filter-status').value;
    const category = document.getElementById('filter-category').value;
    const search   = document.getElementById('search-input').value.toLowerCase();

    const filtered = allReports.filter(r =>
        (status   === 'all' || r.status   === status) &&
        (category === 'all' || r.category === category) &&
        (r.title.toLowerCase().includes(search) || r.location.toLowerCase().includes(search))
    );

    document.getElementById('report-count').textContent =
        `${filtered.length} report${filtered.length !== 1 ? 's' : ''}`;

    renderReports(filtered);
}

function renderReports(reports) {
    const list = document.getElementById('reports-list');

    if (!reports.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No reports found</p><span>Try adjusting your filters or submit the first report!</span></div>`;
        return;
    }

    list.innerHTML = reports.map(r => {
        const emoji       = catEmoji[r.category] || '📌';
        const statusClass = r.status === 'Resolved' ? 'resolved-item' : 'pending-item';
        const date        = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return `
        <div class="report-item ${statusClass}">
            <div class="report-title">${r.title}<span class="cat-badge">${emoji} ${r.category}</span></div>
            <div class="report-meta">
                <span>📍 ${r.location}</span>
                <span>👤 ${r.reporter}</span>
                <span>🕒 ${date}</span>
            </div>
            <p class="report-desc">${r.description}</p>
            ${r.image ? `<img class="report-img" src="http://localhost:3000/uploads/${r.image}" alt="Report photo" loading="lazy">` : ''}
            <div class="report-footer">
                <span class="badge ${r.status.toLowerCase()}">${r.status === 'Resolved' ? '✅' : '⏳'} ${r.status}</span>
            </div>
        </div>`;
    }).join('');
}

loadReports();