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
            maxBodyLength: Infinity,
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

async function getOCRText(imageUrl) {
    try {
        const response = await axios.get(`https://api-faa.my.id/faa/ocr?url=${encodeURIComponent(imageUrl)}`, {
            timeout: 60000,
        });
        if (response.data && response.data.status && response.data.result) {
            return response.data.result.text;
        } else {
            throw new Error('Tidak ada teks yang terdeteksi.');
        }
    } catch (error) {
        console.error('OCR gagal:', error.response ? error.response.data : error.message);
        throw new Error('Proses OCR gagal.');
    }
}

async function handle(sock, messageInfo) {
    const { m, remoteJid, message, isQuoted, type, prefix, command } = messageInfo;
    try {
        const mediaType = isQuoted ? isQuoted.type : type;
        if (!['image', 'sticker', 'video', 'document'].includes(mediaType)) {
            return await reply(m, `⚠️ _Kirim/Balas gambar atau dokumen berisi teks dengan caption *${prefix + command}*_`);
        }
        await sock.sendMessage(remoteJid, { react: { text: "🔍", key: message.key } });
        const media = isQuoted ? await downloadQuotedMedia(message) : await downloadMedia(message);
        const mediaPath = path.join('tmp', media);
        if (!fs.existsSync(mediaPath)) {
            throw new Error('File media tidak ditemukan setelah diunduh.');
        }
        const resultUrl = await uploadToFaaAPI(mediaPath);
        const textResult = await getOCRText(resultUrl);
        await reply(m, `_✅ OCR Sukses!_
📎 *URL:* ${resultUrl}

📝 *Hasil Teks:*
\`\`\`
${textResult.trim()}
\`\`\``);
        fs.unlinkSync(mediaPath);
    } catch (error) {
        console.error("Error in .ocr handler:", error);
        await sock.sendMessage(remoteJid, { text: "⚠️ Maaf, terjadi kesalahan saat membaca teks dari gambar." }, { quoted: message });
    }
}

module.exports = {
    handle,
    Commands: ["ocr"],
    OnlyPremium: false,
    OnlyOwner: false,
    limitDeduction: 1,
};