const token = localStorage.getItem('token');
const name  = localStorage.getItem('name');
const role  = localStorage.getItem('role');

if (!token || role !== 'admin') {
    alert('⛔ Access denied! Admins only.');
    window.location.href = 'index.html';
}

document.getElementById('welcome-msg').textContent = name || '';

let allReports = [];

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

const catEmoji = {
    Road: '🛣️',         Bridge: '🌉',         Footpath: '🚶',
    Water: '💧',         Drainage: '🌊',        Sewage: '🚿',
    Electricity: '⚡',   'Street Light': '💡',  Gas: '🔥',
    Garbage: '🗑️',      Tree: '🌳',            'Air Pollution': '💨',
    'Noise Pollution': '🔊', 'Water Pollution': '🏭',
    Transport: '🚌',     Hospital: '🏥',        School: '🏫',
    Park: '🌳',          Market: '🏪',          'Government Office': '🏛️',
    'Building Safety': '🏗️', Traffic: '🚦',    Crime: '🚨',
    'Fire Hazard': '🔥', Animal: '🐾',          Other: '📌'
};

function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

async function loadAdminReports() {
    try {
        const res  = await fetch('http://localhost:3000/api/reports/all', {
            headers: { 'authorization': token }
        });
        const data = await res.json();
        allReports = data.reports || [];

        const total    = allReports.length;
        const pending  = allReports.filter(r => r.status === 'Pending').length;
        const resolved = total - pending;
        const rate     = total > 0 ? Math.round((resolved / total) * 100) + '%' : '0%';

        document.getElementById('total-count').textContent    = total;
        document.getElementById('pending-count').textContent  = pending;
        document.getElementById('resolved-count').textContent = resolved;
        document.getElementById('resolve-rate').textContent   = rate;

        filterReports();
    } catch {
        document.getElementById('admin-reports-list').innerHTML =
            `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load reports</p><span>Check your server connection</span></div>`;
    }
}

function filterReports() {
    const status   = document.getElementById('filter-status').value;
    const category = document.getElementById('filter-category').value;
    const search   = document.getElementById('search-input').value.toLowerCase();

    const filtered = allReports.filter(r =>
        (status   === 'all' || r.status   === status) &&
        (category === 'all' || r.category === category) &&
        (r.title.toLowerCase().includes(search) || r.location.toLowerCase().includes(search))
    );

    renderReports(filtered);
}

function renderReports(reports) {
    const list = document.getElementById('admin-reports-list');

    if (!reports.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No reports found</p><span>Try adjusting your filters</span></div>`;
        return;
    }

    list.innerHTML = reports.map(r => {
        const emoji       = catEmoji[r.category] || '📌';
        const statusClass = r.status === 'Resolved' ? 'resolved-item' : 'pending-item';
        const date        = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const actionBtn   = r.status === 'Pending'
            ? `<button class="btn-resolve" onclick="updateStatus(${r.id},'Resolved')">✅ Mark Resolved</button>`
            : `<button class="btn-pending" onclick="updateStatus(${r.id},'Pending')">🔄 Mark Pending</button>`;

        return `
        <div class="report-item ${statusClass}" id="report-${r.id}">
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
                <div class="admin-controls">${actionBtn}<button class="btn-delete" onclick="deleteReport(${r.id})">🗑️ Delete</button></div>
            </div>
        </div>`;
    }).join('');
}

async function updateStatus(id, status) {
    try {
        const res  = await fetch(`http://localhost:3000/api/reports/status/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'authorization': token },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
            showToast(status === 'Resolved' ? '✅ Marked as Resolved' : '🔄 Marked as Pending', 'success');
            loadAdminReports();
        } else {
            showToast('❌ ' + data.message, 'error');
        }
    } catch {
        showToast('❌ Server error', 'error');
    }
}

async function deleteReport(id) {
    if (!confirm('⚠️ Are you sure you want to permanently delete this report?')) return;
    try {
        const res  = await fetch(`http://localhost:3000/api/reports/delete/${id}`, {
            method: 'DELETE',
            headers: { 'authorization': token }
        });
        const data = await res.json();
        if (data.success) {
            showToast('🗑️ Report deleted', 'info');
            loadAdminReports();
        } else {
            showToast('❌ ' + data.message, 'error');
        }
    } catch {
        showToast('❌ Server error', 'error');
    }
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFillColor(27, 67, 50);
    doc.rect(0, 0, doc.internal.pageSize.width, 22, 'F');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('NagarBarta — Problem Reports Export', 14, 14);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(180, 230, 200);
    doc.text(
        `Generated: ${new Date().toLocaleString()}  |  Total: ${allReports.length}  |  Pending: ${allReports.filter(r => r.status === 'Pending').length}  |  Resolved: ${allReports.filter(r => r.status === 'Resolved').length}`,
        14, 20
    );

    doc.autoTable({
        startY: 28,
        head: [['#', 'Title', 'Category', 'Location', 'Reporter', 'Date', 'Status']],
        body: allReports.map((r, i) => [
            i + 1,
            r.title.length > 35    ? r.title.substring(0, 35) + '...'    : r.title,
            r.category,
            r.location.length > 30 ? r.location.substring(0, 30) + '...' : r.location,
            r.reporter,
            new Date(r.created_at).toLocaleDateString('en-GB'),
            r.status
        ]),
        headStyles: { fillColor: [45, 106, 79], textColor: 255, fontSize: 10, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 249, 242] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            6: { cellWidth: 22, halign: 'center' }
        },
        didParseCell: (data) => {
            if (data.column.index === 6 && data.section === 'body') {
                data.cell.styles.textColor = data.cell.raw === 'Resolved' ? [5, 150, 105] : [217, 119, 6];
                data.cell.styles.fontStyle = 'bold';
            }
        },
        styles: { fontSize: 9, cellPadding: 4 },
        margin: { left: 14, right: 14 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} of ${pageCount}  —  NagarBarta Civic Platform  —  Confidential`,
            14, doc.internal.pageSize.height - 8
        );
    }

    doc.save(`NagarBarta-Reports-${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast('📄 PDF exported successfully!', 'success');
}

loadAdminReports();