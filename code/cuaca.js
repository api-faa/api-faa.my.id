const axios = require("axios");
const { logCustom } = require("@lib/logger");

async function handle(sock, messageInfo) {
    const { remoteJid, message, prefix, command, content } = messageInfo;

    try {
        if (!content.trim()) {
            return await sock.sendMessage(
                remoteJid,
                { text: `_⚠️ Format Penggunaan:_
                
*${prefix + command} kabupaten|kecamatan|desa*

_Contoh:_  
*${prefix + command} Ambon|Sirimau|Ahusen*` },
                { quoted: message }
            );
        }

        const [kabupaten, kecamatan, desa] = content.split("|").map(v => v?.trim());
        if (!kabupaten || !kecamatan || !desa) {
            return await sock.sendMessage(
                remoteJid,
                { text: `❌ Format tidak valid, gunakan:\n${prefix + command} kabupaten|kecamatan|desa` },
                { quoted: message }
            );
        }

        await sock.sendMessage(remoteJid, { react: { text: "⏳", key: message.key } });

        const url = `https://api-faa.my.id/faa/cuaca?kabupaten=${kabupaten}&kecamatan=${kecamatan}&desa=${desa}`;
        const { data } = await axios.get(url);

        if (!data || !data.status) {
            return await sock.sendMessage(remoteJid, { text: "❌ Gagal mengambil data cuaca." }, { quoted: message });
        }

        const lokasi = `${data.lokasi.desa}, ${data.lokasi.kecamatan}, ${data.lokasi.kabupaten}`;
        const ringkas = data.prediksi_harian.ringkas;
        const detail = data.prediksi_harian.detail;
        const peluang = data.prediksi_harian.informasi.rata_rata_peluang;
        const totalHujan = data.prediksi_harian.informasi.total_hujan_mm;

        const cuacaList = data.cuaca.slice(0, 12).map((item) =>
            `🕒 *${item.jam}*  
${item.emoji} _${item.deskripsi}_  
🌧️ Hujan: *${item.rain_mm} mm*  
📊 Peluang: *${item.peluang_hujan}%*`
        ).join("\n\n");

        const text = `
🌦️ *PREDIKSI CUACA 12 JAM*  
📍 *Lokasi:* ${lokasi}

📌 *Ringkas:* ${ringkas}  
📌 *Detail:* ${detail}  
📌 *Peluang hujan rata-rata:* ${peluang}  
📌 *Total curah hujan:* ${totalHujan} mm  

━━━━━━━━━━━━━━
⏱️ *Cuaca 12 Jam Kedepan:*
${cuacaList}
━━━━━━━━━━━━━━
`;

        await sock.sendMessage(remoteJid, { text }, { quoted: message });

    } catch (error) {
        logCustom("info", content, `ERROR-CUACA-${command}.txt`);
        await sock.sendMessage(
            remoteJid,
            { text: `❌ Terjadi error saat mengambil data cuaca.\n\n${error}` },
            { quoted: message }
        );
    }
}

module.exports = {
    handle,
    Commands: ["cuaca"],
    OnlyPremium: false,
    OnlyOwner: false,
    limitDeduction: 1
};