document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const uploadBtn = document.getElementById('download-upload-btn');
    const userInfo = document.getElementById('user-info');
    const uploadSection = document.getElementById('upload-section');
    const userName = document.getElementById('user-name');
    
    // Verificar si el usuario ya está autenticado
    const urlParams = new URLSearchParams(window.location.search);
    const user = urlParams.get('user');
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    
    if (error) {
        showStatus(`Error de autenticación: ${error}`, 'error');
    }
    
    if (user && token) {
        // Usuario autenticado
        loginBtn.style.display = 'none';
        userInfo.style.display = 'block';
        uploadSection.style.display = 'block';
        userName.textContent = user;
        
        // Almacenar el token en memoria (no en localStorage por seguridad)
        window.userToken = token;
    }
    
    // Manejar el inicio de sesión
    loginBtn.addEventListener('click', () => {
        window.location.href = '/auth/google';
    });
    
    // Manejar el cierre de sesión
    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ accessToken: window.userToken })
            });
            
            if (response.ok) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showStatus('Error al cerrar sesión', 'error');
        }
    });
    
    // Manejar la descarga y subida
    uploadBtn.addEventListener('click', async () => {
        const downloadUrl = document.getElementById('download-url').value;
        const fileName = document.getElementById('file-name').value;
        
        if (!downloadUrl) {
            showStatus('Por favor ingresa una URL válida', 'error');
            return;
        }
        
        showStatus('Procesando...', 'info');
        showProgress('Iniciando descarga desde el servidor...');
        
        try {
            const response = await fetch('/api/upload-to-drive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    downloadUrl, 
                    fileName,
                    accessToken: window.userToken
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showStatus(`Archivo subido correctamente a Drive: <a href="${data.file.webViewLink}" target="_blank">${data.file.name}</a>`, 'success');
            } else {
                showStatus(`Error: ${data.error}`, 'error');
            }
        } catch (error) {
            showStatus(`Error: ${error.message}`, 'error');
            console.error('Error:', error);
        }
        
        showProgress('');
    });
    
    function showStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.innerHTML = message;
        statusDiv.className = `status ${type}`;
    }
    
    function showProgress(message) {
        const progressDiv = document.getElementById('progress');
        progressDiv.textContent = message;
        progressDiv.className = message ? 'status info' : 'status';
    }
});
