const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const FormData = require("form-data");

const {
    downloadQuotedMedia,
    downloadMedia,
    reply
} = require("@lib/utils");

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function uploadToUguu(filePath) {
    const form = new FormData();
    form.append("files[]", fs.createReadStream(filePath));

    const res = await axios.post(
        "https://uguu.se/upload",
        form,
        { headers: form.getHeaders() }
    );

    if (
        res.data?.success &&
        res.data.files &&
        res.data.files.length > 0
    ) {
        return res.data.files[0].url;
    }

    throw new Error("Upload gagal");
}

async function checkJobStatus(checkUrl, maxRetry = 30, delayMs = 15000) {
    for (let i = 0; i < maxRetry; i++) {
        const { data } = await axios.get(checkUrl);

        if (data?.processing === false && data?.result?.url) {
            return data.result.url;
        }

        await delay(delayMs);
    }
    return null;
}

async function handle(sock, messageInfo) {
    const {
        m,
        message,
        remoteJid,
        isQuoted,
        type,
        prefix,
        command
    } = messageInfo;

    try {
        const mediaType = isQuoted ? isQuoted.type : type;

        if (!["image"].includes(mediaType)) {
            return reply(
                m,
                `⚠️ Kirim atau balas gambar dengan caption *${prefix + command}*`
            );
        }

        await sock.sendMessage(remoteJid, {
            react: { text: "🌀", key: message.key }
        });

        const media = isQuoted
            ? await downloadQuotedMedia(message)
            : await downloadMedia(message);

        const mediaPath = path.join("tmp", media);

        if (!fs.existsSync(mediaPath)) {
            throw new Error("File tidak ditemukan");
        }

        const imageUrl = await uploadToUguu(mediaPath);
        fs.unlinkSync(mediaPath);

        await reply(
            m,
            "🖼️ Gambar diterima\n⏳ Sedang diproses..."
        );

        const apiUrl = `https://api-faa.my.id/faa/tohidup?url=${encodeURIComponent(imageUrl)}`;
        const { data } = await axios.get(apiUrl);

        if (!data?.status || !data?.check_url) {
            return reply(m, "⚠️ Gagal memulai proses");
        }

        const videoUrl = await checkJobStatus(data.check_url);

        if (!videoUrl) {
            return reply(m, "⚠️ Proses gagal atau timeout");
        }

        await sock.sendMessage(
            remoteJid,
            {
                video: { url: videoUrl },
                caption: "🎬 Gambar berhasil dihidupkan\n© FAA API"
            },
            { quoted: message }
        );

    } catch (err) {
        console.error(err);
        await reply(m, "⚠️ Terjadi kesalahan");
    }
}

module.exports = {
    handle,
    Commands: ["tohidup"],
    OnlyPremium: false,
    OnlyOwner: false,
    limitDeduction: 2
};