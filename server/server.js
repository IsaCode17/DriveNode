require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/public')));

// Configuración de Google OAuth2
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Ruta para iniciar el flujo de OAuth
app.get('/auth/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        prompt: 'consent'
    });
    res.redirect(url);
});

// Ruta de callback para OAuth
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        // Obtener información del usuario
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        res.redirect(`/?user=${encodeURIComponent(userInfo.data.name)}&token=${tokens.access_token}`);
    } catch (error) {
        console.error('Error al obtener tokens:', error);
        res.redirect('/?error=auth_failed');
    }
});

// Ruta para descargar y subir a Drive
app.post('/api/upload-to-drive', async (req, res) => {
    const { downloadUrl, fileName, accessToken } = req.body;
    
    if (!downloadUrl || !accessToken) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    try {
        // Configurar Google Drive con el token del usuario
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        oauth2Client.setCredentials({ access_token: accessToken });

        // Descargar el archivo
        const response = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream'
        });

        // Subir a Google Drive
        const fileMetadata = {
            name: fileName || path.basename(new URL(downloadUrl).pathname).split('/').pop() || 'archivo_descargado',
            mimeType: response.headers['content-type'] || 'application/octet-stream'
        };

        const media = {
            mimeType: response.headers['content-type'] || 'application/octet-stream',
            body: response.data
        };

        const driveResponse = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id,name,webViewLink'
        });

        res.json({
            success: true,
            file: driveResponse.data
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Ruta para cerrar sesión
app.post('/api/logout', (req, res) => {
    const { accessToken } = req.body;
    
    if (accessToken) {
        oauth2Client.revokeToken(accessToken, (err) => {
            if (err) console.error('Error al revocar token:', err);
        });
    }
    
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
