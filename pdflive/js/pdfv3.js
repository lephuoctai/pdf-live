
const pdfInput = document.getElementById('pdf-input');
const audioInput = document.getElementById('audio-input');
const pdfViewer = document.getElementById('pdf-viewer');
const audioPlayer = document.getElementById('audio-player');
const playlistDiv = document.getElementById('playlist');
const searchInput = document.getElementById('search-input');
const locateBtn = document.getElementById('locate-btn');
const clearBtn = document.getElementById('clear-btn');

// Xử lý chọn PDF
pdfInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) pdfViewer.src = URL.createObjectURL(file);
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
        div.innerText = `${item.index + 1}. ${item.file.name}`;
        div.dataset.index = item.index;
        if (item.index === currentAudioIndex) {
            div.classList.add('active-audio');
        }
        div.onclick = () => {
            setActiveAudio(item.index);
            audioPlayer.src = URL.createObjectURL(item.file);
            audioPlayer.play();
        };
        playlistDiv.appendChild(div);
    });
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