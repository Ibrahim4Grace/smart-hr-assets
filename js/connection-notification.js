const statusMessage = document.getElementById('statusMessage');

function showStatus(message, isOnline) {
    statusMessage.textContent = message;
    statusMessage.className = isOnline ? 'online' : '';
    statusMessage.style.display = 'block';
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

function checkInitialConnection() {
    if (!navigator.onLine) {
        showStatus('No internet connection. Please check your network.', false);
    }
}

window.addEventListener('online', () => {
    showStatus('Internet connection restored!', true);
});

window.addEventListener('offline', () => {
    showStatus('No internet connection. Please check your network.', false);
});

window.onload = checkInitialConnection;
