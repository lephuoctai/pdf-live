const pdfInput = document.getElementById('pdf-input');
const audioInput = document.getElementById('audio-input');
const pdfViewers = [
    document.getElementById('pdf-viewer-0'),
    document.getElementById('pdf-viewer-1'),
    document.getElementById('pdf-viewer-2')
];
const audioPlayer = document.getElementById('audio-player');
const playlistDiv = document.getElementById('playlist');
const pdfListDiv = document.getElementById('pdf-list');
const searchInput = document.getElementById('search-input');
const locateBtn = document.getElementById('locate-btn');
const clearBtn = document.getElementById('clear-btn');

// Xử lý danh sách PDF
let pdfFiles = [];
let currentPdfIndex = -1;

function renderPdfList() {
    pdfListDiv.innerHTML = "";
    if (pdfFiles.length === 0) {
        pdfListDiv.innerHTML = "Danh sách PDF đang trống!";
        return;
    }

    pdfFiles.forEach((file, index) => {
        const div = document.createElement('div');
        if (index === currentPdfIndex) {
            div.classList.add('active-pdf');
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.innerText = `${index + 1}. ${file.name}`;
        nameSpan.onclick = () => setActivePdf(index);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removePdf(index);
        };

        div.appendChild(nameSpan);
        div.appendChild(removeBtn);
        pdfListDiv.appendChild(div);
    });
}

function removePdf(index) {
    if (confirm("Bạn có chắc chắn muốn gỡ PDF này?")) {
        // Thu hồi URL và xóa nội dung iframe
        URL.revokeObjectURL(pdfViewers[index].src);
        pdfViewers[index].src = "about:blank";
        
        // Xóa file khỏi mảng
        pdfFiles.splice(index, 1);
        
        // Dịch chuyển nội dung các iframe phía sau lên (nếu có)
        for (let i = index; i < pdfFiles.length; i++) {
            pdfViewers[i].src = pdfViewers[i + 1].src;
        }
        pdfViewers[pdfFiles.length].src = "about:blank";

        // Cập nhật index hiện tại
        if (currentPdfIndex === index) {
            currentPdfIndex = pdfFiles.length > 0 ? 0 : -1;
        } else if (currentPdfIndex > index) {
            currentPdfIndex--;
        }
        
        setActivePdf(currentPdfIndex);
    }
}

function setActivePdf(index) {
    currentPdfIndex = index;
    
    // Ẩn tất cả và hiện viewer tương ứng
    pdfViewers.forEach((viewer, i) => {
        if (i === index && index !== -1) {
            viewer.classList.add('active');
        } else {
            viewer.classList.remove('active');
        }
    });

    renderPdfList();
}

pdfInput.onchange = (e) => {
    const newFiles = Array.from(e.target.files);
    
    newFiles.forEach(file => {
        if (pdfFiles.length < 3) {
            const index = pdfFiles.length;
            pdfFiles.push(file);
            pdfViewers[index].src = URL.createObjectURL(file);
            
            // Nếu là file đầu tiên thì active luôn
            if (pdfFiles.length === 1) {
                setActivePdf(0);
            }
        }
    });

    if (pdfFiles.length >= 3 && newFiles.length > (3 - (pdfFiles.length - newFiles.length))) {
        alert("Đã đạt giới hạn 3 file PDF.");
    }
    
    renderPdfList();
    pdfInput.value = "";
};

// Xử lý danh sách Audio
let audioFiles = [];
let currentAudioIndex = -1;

function renderPlaylist(filterText = "") {
    playlistDiv.innerHTML = "";
    const filteredFiles = audioFiles.map((file, index) => ({ file, index }))
        .filter(item => item.file.name.toLowerCase().includes(filterText.toLowerCase()));

    if (filteredFiles.length === 0) {
        playlistDiv.innerHTML = audioFiles.length === 0 ? "Danh sách âm thanh đang trống!" : "Không tìm thấy kết quả!";
        return;
    } else {
        playlistDiv.innerHTML = "Có " + filteredFiles.length + " file(s)";
    }

    filteredFiles.forEach((item) => {
        const div = document.createElement('div');
        div.dataset.index = item.index;
        if (item.index === currentAudioIndex) {
            div.classList.add('active-audio');
        }

        const nameSpan = document.createElement('span');
        nameSpan.innerText = `${item.index + 1}. ${item.file.name}`;
        nameSpan.onclick = () => {
            setActiveAudio(item.index);
            audioPlayer.src = URL.createObjectURL(item.file);
            audioPlayer.play();
        };

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeAudio(item.index);
        };

        div.appendChild(nameSpan);
        div.appendChild(removeBtn);
        playlistDiv.appendChild(div);
    });
}

function removeAudio(index) {
    if (confirm("Bạn có chắc chắn muốn gỡ audio này?")) {
        audioFiles.splice(index, 1);
        if (currentAudioIndex === index) {
            audioPlayer.src = "";
            currentAudioIndex = -1;
        } else if (currentAudioIndex > index) {
            currentAudioIndex--;
        }
        renderPlaylist(searchInput.value);
    }
}

audioInput.onchange = (e) => {
    audioFiles = Array.from(e.target.files);
    currentAudioIndex = -1;
    renderPlaylist(searchInput.value);
};

searchInput.oninput = () => {
    renderPlaylist(searchInput.value);
};

locateBtn.onclick = () => {
    if (currentAudioIndex === -1) return;
    searchInput.value = "";
    renderPlaylist("");
    const activeItem = playlistDiv.querySelector('.active-audio');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};

clearBtn.onclick = () => {
    searchInput.value = "";
    renderPlaylist("");
};

function setActiveAudio(index) {
    currentAudioIndex = index;
    const items = playlistDiv.querySelectorAll('div');
    items.forEach((el) => {
        if (parseInt(el.dataset.index) === index) {
            el.classList.add('active-audio');
        } else {
            el.classList.remove('active-audio');
        }
    });
}

// Khi audio bắt đầu phát (cả khi bấm play thủ công)
audioPlayer.addEventListener('play', () => {
    if (!audioFiles.length) return;
    const currentSrc = audioPlayer.src;
    // Decode URI to match file name correctly
    const decodedSrc = decodeURIComponent(currentSrc);
    const idx = audioFiles.findIndex(f => decodedSrc.endsWith(f.name));
    if (idx !== -1) setActiveAudio(idx);
});