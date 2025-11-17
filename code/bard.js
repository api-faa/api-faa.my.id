const axios = require("axios");
const { logCustom } = require("@lib/logger");

async function handle(sock, messageInfo) {
    const { remoteJid, message, prefix, command, content } = messageInfo;

    try {
        if (!content.trim()) {
            return await sock.sendMessage(
                remoteJid,
                { text: `_⚠️ Format Penggunaan:_\n\n_💬 Contoh:_ *${prefix + command} siapa jokowi*` },
                { quoted: message }
            );
        }

        await sock.sendMessage(remoteJid, { react: { text: "⏳", key: message.key } });

        const url = `https://api-faa.my.id/faa/bard-google?query=${encodeURIComponent(content)}`;
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (axios-client)"
            }
        });

        if (response.data && response.data.status === true) {
            await sock.sendMessage(
                remoteJid,
                { text: response.data.result || "Tidak ada hasil." },
                { quoted: message }
            );
        } else {
            await sock.sendMessage(
                remoteJid,
                { text: "Maaf, server tidak memberi respons yang valid." },
                { quoted: message }
            );
        }
    } catch (error) {
        logCustom("info", content, `ERROR-COMMAND-${command}.txt`);
        await sock.sendMessage(
            remoteJid,
            { text: `Maaf, terjadi kesalahan.\n\n${error.message}` },
            { quoted: message }
        );
    }
}

module.exports = {
    handle,
    Commands: ['bard'],
    OnlyPremium: false,
    OnlyOwner: false,
    limitDeduction: 1
};