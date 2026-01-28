// Firebase SDK via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CẤU HÌNH FIREBASE ---
// Vui lòng thay thế bằng cấu hình của bạn từ Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDc4M0d-zvc495d48upZibLUGnRw357Leg",
    authDomain: "taile-ulits.firebaseapp.com",
    projectId: "taile-ulits",
    storageBucket: "taile-ulits.firebasestorage.app",
    messagingSenderId: "146946980379",
    appId: "1:146946980379:web:d31e96f0871cd1f18156be",
    measurementId: "G-7CRM65YPJJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// --- BIẾN TOÀN CỤC ---
let roomId = new URLSearchParams(window.location.search).get('id');
let currentRoomData = null;
let userName = localStorage.getItem('userName');
let selectedSlot = null;
let shareModal = null;
let viewOnlyMode = false; // Chế độ xem chỉ đọc

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00

// --- KHỞI TẠO APP ---
async function initApp() {
    // Nếu không có roomId, hiển thị modal tạo hoặc tham gia
    if (!roomId) {
        showModal('entry-modal');
        return;
    } else {
        hideModal('entry-modal');
    }

    const roomRef = doc(db, "rooms", roomId);
    const docSnap = await getDoc(roomRef);

    if (!docSnap.exists()) {
        alert("Sự kiện không tồn tại hoặc đã bị xóa.");
        window.location.href = '../index.html';
        return;
    }

    const data = docSnap.data();
    // Kiểm tra hết hạn (Auto-cleanup)
    const now = Date.now();
    if (data.expireAt.toMillis() < now) {
        await deleteDoc(roomRef);
        alert("Sự kiện đã hết hạn và đã được tự động xóa.");
        window.location.href = '../index.html';
        return;
    }

    currentRoomData = data;
    document.getElementById('event-title').innerText = data.title;

    // Yêu cầu nhập tên nếu chưa có
    if (!userName) {
        showModal('name-modal');
    }
    else {
        // Hiển thị modal chia sẻ link để nhắc người dùng lưu lại
        showShareModal();
    }


    // Lắng nghe thay đổi real-time
    onSnapshot(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            currentRoomData = snapshot.data();
            renderTable();
            updateVoterList();
            updateCountdown();
        }
    });

    setInterval(updateCountdown, 1000);
}

// --- GIAO DIỆN & RENDER ---
function renderTable() {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';

    HOURS.forEach(hour => {
        const row = document.createElement('tr');

        // Cột giờ
        const hourCell = document.createElement('td');
        hourCell.innerText = `${hour.toString().padStart(2, '0')}:00`;
        row.appendChild(hourCell);

        // Cột các thứ
        DAYS.forEach(day => {
            const slotId = `${day}-${hour.toString().padStart(2, '0')}00`;
            const votes = currentRoomData.votes[slotId] || [];
            const isVoted = userName && votes.includes(userName);

            const cell = document.createElement('td');
            cell.id = slotId;
            if (isVoted) cell.classList.add('voted');
            if (selectedSlot === slotId) cell.classList.add('active-cell');
            if (viewOnlyMode) cell.classList.add('view-only-mode');

            cell.innerHTML = `
                <div class="cell-count">${votes.length > 0 ? votes.length : ''}</div>
                <div class="cell-names">${votes.join(', ')}</div>
            `;

            cell.onclick = () => handleCellClick(slotId);
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}

function handleCellClick(slotId) {
    selectedSlot = slotId;
    renderTable(); // Update active-cell class
    updateVoterList();

    if (!userName || viewOnlyMode) return; // View only mode

    const roomRef = doc(db, "rooms", roomId);
    const votes = currentRoomData.votes[slotId] || [];

    if (votes.includes(userName)) {
        updateDoc(roomRef, { [`votes.${slotId}`]: arrayRemove(userName) });
    } else {
        updateDoc(roomRef, { [`votes.${slotId}`]: arrayUnion(userName) });
    }
}

function updateVoterList() {
    const listDiv = document.getElementById('voter-list');
    const searchInput = document.getElementById('voter-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    if (!selectedSlot) {
        listDiv.innerHTML = 'Vui lòng chọn khung giờ!';
        return;
    }

    let votes = currentRoomData.votes[selectedSlot] || [];
    
    // Lọc theo từ khóa tìm kiếm
    if (searchTerm) {
        votes = votes.filter(name => name.toLowerCase().includes(searchTerm));
    }

    if (votes.length === 0) {
        listDiv.innerHTML = searchTerm ? 'Không tìm thấy người này.' : 'Chưa có ai chọn ô này.';
    } else {
        listDiv.innerHTML = votes.map(name => `<div class="voter-item">${name}</div>`).join('');
    }
}

function updateCountdown() {
    if (!currentRoomData) return;

    const now = Date.now();
    const expire = currentRoomData.expireAt.toMillis();
    const diff = expire - now;

    if (diff <= 0) {
        document.getElementById('countdown').innerText = "Hết hạn";
        return;
    }

    const d = Math.floor(diff / (24 * 3600000));
    const h = Math.floor((diff % (24 * 3600000)) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const dayText = d > 0 ? `${d} ngày ` : '';
    document.getElementById('countdown').innerText =
        `${dayText}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// --- ACTIONS ---
async function handleCreateEvent() {
    const title = document.getElementById('new-event-name').value.trim();
    const dateInput = document.getElementById('event-expire-date').value;
    if (!title) return alert("Vui lòng nhập tên sự kiện.");
    if (!dateInput) return alert("Vui lòng chọn ngày xoá sự kiện.");

    const expireDate = new Date(dateInput);
    const now = Date.now();
    const maxExpire = now + 31 * 24 * 60 * 60 * 1000;
    if (expireDate.getTime() > maxExpire) {
        alert("Ngày xoá không được quá 1 tháng kể từ hôm nay.");
        return;
    }
    if (expireDate.getTime() < now) {
        alert("Ngày xoá phải lớn hơn hiện tại.");
        return;
    }

    const newId = Math.random().toString(36).substring(2, 15);
    const newRoom = {
        id: newId,
        title: title,
        createdAt: Timestamp.fromMillis(now),
        expireAt: Timestamp.fromMillis(expireDate.getTime()),
        votes: {}
    };

    await setDoc(doc(db, "rooms", newId), newRoom);
    window.location.search = `?id=${newId}`;
}

async function handleExtend() {
    if (!currentRoomData) return;
    const createdAt = currentRoomData.createdAt.toMillis();
    const currentExpire = currentRoomData.expireAt.toMillis();
    const maxLimit = createdAt + 31 * 24 * 60 * 60 * 1000; // 1 tháng
    const newExpire = currentExpire + 7 * 24 * 60 * 60 * 1000; // +1 tuần
    if (newExpire > maxLimit) {
        alert("Không thể gia hạn quá 1 tháng kể từ ngày tạo.");
        return;
    }
    await updateDoc(doc(db, "rooms", roomId), {
        expireAt: Timestamp.fromMillis(newExpire)
    });
    alert("Đã gia hạn thêm 1 tuần!");
}

async function handleDelete() {
    if (confirm("Bạn có chắc chắn muốn xóa sự kiện này không? Hành động này không thể hoàn tác.")) {
        await deleteDoc(doc(db, "rooms", roomId));
        window.location.href = '../index.html';
    }
}

// --- MODAL UTILS ---
function showModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// --- SHARE LINK ---
function showShareModal() {
    if (!roomId) return;
    let modal = document.getElementById('share-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'share-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Chia sẻ sự kiện</h2>
                <p style="margin-bottom:10px;">Vui lòng lưu lại <span class="highlight">ID hoặc link</span> <br>để chia sẻ vote và xem lại.</p>
                <div style="margin-bottom:10px;">ID: <b>${roomId}</b></div>
                <input id="share-link-input" style="width:100%;padding:8px;" readonly value="${window.location.origin + window.location.pathname}?id=${roomId}">
                <button id="copy-link-btn" class="btn btn-primary" style="margin:15px 0 0 0;"><i class="fas fa-copy"></i> Sao chép link</button>
                <button id="close-share-btn" class="btn" style="margin-top:10px;"><i class="fas fa-times"></i> Đóng</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('copy-link-btn').onclick = function () {
            const input = document.getElementById('share-link-input');
            input.select();
            document.execCommand('copy');
            this.innerText = 'Đã sao chép!';
            setTimeout(() => { this.innerText = 'Sao chép link'; }, 1500);
        };
        document.getElementById('close-share-btn').onclick = function () {
            modal.classList.add('hidden');
        };
    } else {
        modal.classList.remove('hidden');
    }
}

// --- JOIN BY ID ---
function handleJoinById() {
    const input = document.getElementById('join-id-input');
    const id = input.value.trim();
    if (!id) return alert('Vui lòng nhập ID sự kiện!');
    window.location.search = `?id=${id}`;
}

// --- EVENT LISTENERS ---
document.getElementById('confirm-create').onclick = handleCreateEvent;
document.getElementById('confirm-name').onclick = () => {
    const name = document.getElementById('user-name-input').value.trim();
    if (name) {
        userName = name;
        localStorage.setItem('userName', name);
        hideModal('name-modal');
        renderTable();
    }
};
document.getElementById('skip-name').onclick = () => hideModal('name-modal');
document.getElementById('extend-btn').onclick = handleExtend;
document.getElementById('delete-btn').onclick = handleDelete;
document.getElementById('share-btn').onclick = showShareModal;

// Lắng nghe sự kiện tìm kiếm
if (document.getElementById('voter-search')) {
    document.getElementById('voter-search').oninput = updateVoterList;
}

// Kiểm tra sự tồn tại của các nút trước khi gán sự kiện
if (document.getElementById('join-btn')) {
    document.getElementById('join-btn').onclick = handleJoinById;
}
if (document.getElementById('show-create-btn')) {
    document.getElementById('show-create-btn').onclick = () => {
        hideModal('entry-modal');
        showModal('create-modal');
    };
}

// Khi đóng/tạo xong event, ẩn modal entry nếu có
if (document.getElementById('entry-modal')) {
    document.getElementById('entry-modal').addEventListener('click', function (e) {
        if (e.target === this) this.classList.add('hidden');
    });
}

// Khởi chạy
initApp();

// Chế độ xem chỉ đọc
function toggleViewMode() {
    viewOnlyMode = !viewOnlyMode;
    const modeBtn = document.getElementById('mode-btn');
    const modeIcon = modeBtn.querySelector('i');
    if (viewOnlyMode) {
        modeBtn.classList.add('btn-primary');
        modeIcon.classList.remove('fa-eye-slash');
        modeIcon.classList.add('fa-eye');
        modeBtn.title = 'Bật chế độ xem';
    } else {
        modeBtn.classList.remove('btn-primary');
        modeIcon.classList.remove('fa-eye');
        modeIcon.classList.add('fa-eye-slash');
        modeBtn.title = 'Tắt chế độ xem';
    }
    renderTable();
    updateVoterList();
}

document.getElementById('mode-btn').onclick = toggleViewMode;
