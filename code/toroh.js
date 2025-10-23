const { downloadQuotedMedia, downloadMedia, reply } = require('@lib/utils');
const path = require("path");
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function uploadToFaaAPI(filePath) {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        const response = await axios.post('https://api-faa.my.id/faa/tourl', form, {
            headers: form.getHeaders(),
        });

        if (response.data && response.data.status) {
            return response.data.url;
        } else {
            throw new Error(response.data.message || 'Gagal mengunggah file.');
        }
    } catch (error) {
        console.error('Upload gagal:', error.response ? error.response.data : error.message);
        throw new Error('Upload ke API Faa gagal.');
    }
}

async function handle(sock, messageInfo) {
    const { m, remoteJid, message, isQuoted, type, prefix, command } = messageInfo;
    try {
        const mediaType = isQuoted ? isQuoted.type : type;
        if (!['image', 'sticker', 'video'].includes(mediaType)) {
            return await reply(m, `⚠️ _Kirim/Balas gambar/video dengan caption *${prefix + command}*_`);
        }

        await sock.sendMessage(remoteJid, { react: { text: "🎨", key: message.key } });

        const media = isQuoted ? await downloadQuotedMedia(message) : await downloadMedia(message);
        const mediaPath = path.join('tmp', media);

        if (!fs.existsSync(mediaPath)) {
            throw new Error('File media tidak ditemukan setelah diunduh.');
        }

        const uploadedUrl = await uploadToFaaAPI(mediaPath);

        const apiUrl = `https://api-faa.my.id/faa/toroh?url=${encodeURIComponent(uploadedUrl)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        await sock.sendMessage(remoteJid, { 
            image: Buffer.from(response.data), 
            caption: `✅ ᴘᴇʀɪɴᴛᴀʜ ʙᴇʀʜᴀꜱɪʟ`
        }, { quoted: message });

        fs.unlinkSync(mediaPath);
    } catch (error) {
        console.error("Error in toroh handler:", error);
        await sock.sendMessage(remoteJid, { text: "⚠️ Gagal memproses gambar. Coba lagi nanti!" }, { quoted: message });
    }
}

module.exports = {
    handle,
    Commands: ["toroh"],
    OnlyPremium: false,
    OnlyOwner: false,
    limitDeduction: 1,
};