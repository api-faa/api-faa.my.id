const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { logCustom } = require('@lib/logger');

async function sendMessageWithQuote(sock, remoteJid, message, text) {
    await sock.sendMessage(remoteJid, { text }, { quoted: message });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkJobStatus(jobUrl, maxRetries = 30, delayMs = 40000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const { data } = await axios.get(jobUrl);
            if (data?.status && data?.processing === false && data?.result?.download_url) {
                return data.result;
            }
            console.log(`⏳ [${i + 1}/${maxRetries}] Masih diproses...`);
        } catch (err) {
            console.warn('❌ API error:', err.message);
            return null;
        }
        await delay(delayMs);
    }
    return null;
}

function deleteFileIfExists(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) console.error('❌ Gagal hapus file log:', filePath, err);
            else console.log('🧹 File log dihapus:', filePath);
        });
    }
}

async function handle(sock, messageInfo) {
    const { remoteJid, message, content, prefix, command } = messageInfo;

    try {
        if (!content.trim()) {
            const usage = `💬 *Contoh:* *${prefix + command} kakek salto sambil bilang hidup seperti larry*`;
            return sendMessageWithQuote(sock, remoteJid, message, `_⚠️ Format Penggunaan:_\n\n${usage}`);
        }

        await sock.sendMessage(remoteJid, { react: { text: "🌀", key: message.key } });

        const apiURL = `https://api-faa.my.id/faa/sora?prompt=${encodeURIComponent(content)}`;
        const { data } = await axios.get(apiURL);

        if (!data?.status || !data?.check_url) {
            return sendMessageWithQuote(sock, remoteJid, message, '⚠️ Gagal memulai proses video Sora.');
        }

        await sendMessageWithQuote(sock, remoteJid, message, 
            `🎥 *Permintaan diterima!*\n🤖 Sedang diproses oleh server *Sora FAA...*\n💭 *Prompt:*\n> ${content}\n\n⏱️ *Estimasi waktu:* 10–20 menit.\n\nSaya akan kirim hasil otomatis setelah selesai.`);

        console.log('🎬 Job URL:', data.check_url);

        const result = await checkJobStatus(data.check_url);
        if (!result) {
            return sendMessageWithQuote(sock, remoteJid, message, 
                '⚠️ Proses dihentikan atau gagal mendapatkan hasil dalam waktu yang ditentukan.');
        }

        await sock.sendMessage(remoteJid, {
            video: { url: result.download_url },
            caption: `🎞️ *Hasil SORA FAA*\n\n🧠 *Prompt:* ${content}\n📺 *Kualitas:* ${result.quality}\n\n_© FAA API_`
        }, { quoted: message });

    } catch (error) {
        console.error("Error:", error);
        const errorLog = `ERROR-COMMAND-${command}.txt`;
        const logPath = path.join(__dirname, '../../../logs', errorLog);
        logCustom('info', content, errorLog);
        deleteFileIfExists(logPath);

        const errMsg = `⚠️ Terjadi kesalahan saat memproses permintaan Anda.\n\n🪲 *Error:* ${error.message || error}`;
        await sendMessageWithQuote(sock, remoteJid, message, errMsg);
    }
}

module.exports = {
    handle,
    Commands: ['sora'],
    OnlyPremium: false,
    OnlyOwner: false,
    limitDeduction: 2,
};