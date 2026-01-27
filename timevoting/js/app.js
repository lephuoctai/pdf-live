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

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00

// --- KHỞI TẠO APP ---
async function initApp() {
    if (!roomId) {
        showModal('create-modal');
        return;
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

    if (!userName) return; // View only mode

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
    if (!selectedSlot) {
        listDiv.innerHTML = 'Chọn một ô để xem danh sách...';
        return;
    }

    const votes = currentRoomData.votes[selectedSlot] || [];
    if (votes.length === 0) {
        listDiv.innerHTML = 'Chưa có ai chọn ô này.';
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

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    
    document.getElementById('countdown').innerText = 
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// --- ACTIONS ---
async function handleCreateEvent() {
    const title = document.getElementById('new-event-name').value.trim();
    if (!title) return alert("Vui lòng nhập tên sự kiện.");

    const newId = Math.random().toString(36).substring(2, 15);
    const now = Date.now();
    
    const newRoom = {
        id: newId,
        title: title,
        createdAt: Timestamp.fromMillis(now),
        expireAt: Timestamp.fromMillis(now + 48 * 60 * 60 * 1000), // 48h
        votes: {}
    };

    await setDoc(doc(db, "rooms", newId), newRoom);
    window.location.search = `?id=${newId}`;
}

async function handleExtend() {
    if (!currentRoomData) return;
    
    const createdAt = currentRoomData.createdAt.toMillis();
    const currentExpire = currentRoomData.expireAt.toMillis();
    const maxLimit = createdAt + 90 * 24 * 60 * 60 * 1000; // 90 days hard limit

    const newExpire = currentExpire + 24 * 60 * 60 * 1000; // +24h

    if (newExpire > maxLimit) {
        alert("Đã đạt giới hạn gia hạn tối đa (3 tháng).");
        return;
    }

    await updateDoc(doc(db, "rooms", roomId), {
        expireAt: Timestamp.fromMillis(newExpire)
    });
    alert("Đã gia hạn thêm 24 giờ!");
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

// Khởi chạy
initApp();
