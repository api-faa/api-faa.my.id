const axios = require("axios");
const { logCustom } = require("@lib/logger");

async function handle(sock, messageInfo) {
    const { remoteJid, message, prefix, command, content } = messageInfo;

    try {
        if (!content.trim()) {
            return await sock.sendMessage(
                remoteJid,
                { text: `_⚠️ Format Penggunaan:_ \n\n_💬 Contoh:_ _*${prefix + command} mandi*_` },
                { quoted: message }
            );
        }

        await sock.sendMessage(remoteJid, { react: { text: "⏳", key: message.key } });

        const url = `https://api-faa.my.id/faa/doa?q=${encodeURIComponent(content)}`;
        const response = await axios.get(url);

        if (!response.data || !response.data.status || !response.data.data?.length) {
            return await sock.sendMessage(
                remoteJid,
                { text: `⚠️ Doa *${content}* tidak ditemukan.` },
                { quoted: message }
            );
        }

        let hasil = `📿 *DAFTAR DOA: ${content.toUpperCase()}*\n\n`;

        response.data.data.forEach((item, i) => {
            hasil += `*${i + 1}. ${item.doa}*\n`;
            hasil += `📖 *Ayat:* ${item.ayat}\n`;
            hasil += `🔊 *Latin:* ${item.latin}\n`;
            hasil += `🕌 *Artinya:* ${item.artinya}\n\n`;
        });

        await sock.sendMessage(remoteJid, { text: hasil.trim() }, { quoted: message });

    } catch (error) {
        logCustom('info', content, `ERROR-COMMAND-${command}.txt`);
        await sock.sendMessage(
            remoteJid,
            { text: `Maaf, terjadi kesalahan saat mengambil data doa.\n\n${error}` },
            { quoted: message }
        );
    }
}

module.exports = {
    handle,
    Commands        : ['doa'],
    OnlyPremium     : false,
    OnlyOwner       : false,
    limitDeduction  : 1
};