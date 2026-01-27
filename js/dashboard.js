
const apps = [
    { id: 'pdflive', name: 'PDF Live V3', desc: 'Xem PDF và nghe Audio đồng bộ, hỗ trợ trình chiếu tab cho Google Meet', url: './pdflive/index.html' },
    { id: 'notes', name: 'Ghi chú nhanh', desc: 'Lưu lại các ý tưởng tức thì trong trình duyệt.', url: '#' }
];

const searchInput = document.getElementById('search-input');
const pinnedGrid = document.getElementById('pinned-grid');
const allGrid = document.getElementById('all-grid');
const pinnedSection = document.getElementById('pinned-section');

let pinnedIds = JSON.parse(localStorage.getItem('pinnedApps') || '[]');

function savePinned() {
    localStorage.setItem('pinnedApps', JSON.stringify(pinnedIds));
}

function togglePin(id, e) {
    e.stopPropagation();
    if (pinnedIds.includes(id)) {
        pinnedIds = pinnedIds.filter(p => p !== id);
    } else {
        pinnedIds.push(id);
    }
    savePinned();
    render();
}

function createCard(app, isPinned) {
    const card = document.createElement('div');
    card.className = `card ${isPinned ? 'pinned' : ''}`;
    card.onclick = () => window.location.href = app.url;

    card.innerHTML = `
                <button class="pin-btn" onclick="togglePin('${app.id}', event)">
                    ${isPinned ? 'BỎ GHIM' : 'GHIM'}
                </button>
                <h3>${app.name}</h3>
                <p>${app.desc}</p>
            `;
    return card;
}

function render() {
    const query = searchInput.value.toLowerCase();
    const filteredApps = apps.filter(app =>
        app.name.toLowerCase().includes(query) ||
        app.desc.toLowerCase().includes(query)
    );

    pinnedGrid.innerHTML = '';
    allGrid.innerHTML = '';

    const pinnedApps = filteredApps.filter(app => pinnedIds.includes(app.id));
    const otherApps = filteredApps.filter(app => !pinnedIds.includes(app.id));

    pinnedApps.forEach(app => pinnedGrid.appendChild(createCard(app, true)));
    otherApps.forEach(app => allGrid.appendChild(createCard(app, false)));

    pinnedSection.classList.toggle('hidden', pinnedApps.length === 0);
}

searchInput.oninput = render;
render();