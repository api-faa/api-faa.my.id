const axios = require('axios');
const { logCustom } = require('@lib/logger');

async function sendMessageWithQuote(sock, jid, msg, text) {
  return sock.sendMessage(jid, { text }, { quoted: msg });
}

async function sendReaction(sock, msg, react) {
  return sock.sendMessage(msg.key.remoteJid, {
    react: { text: react, key: msg.key },
  });
}

function scCaption(data) {
  return (
    `🎧 *SOUNDCLOUD DOWNLOADER*\n\n` +
    `📌 *Judul*       : ${data.title}\n` +
    `👤 *Uploader*    : ${data.user}\n` +
    `🕒 *Durasi*      : ${(data.duration / 1000 / 60).toFixed(2)} menit\n` +
    `🔗 *Link*        : ${data.source_url}`
  );
}

async function handle(sock, info) {
  const { remoteJid, message, content, prefix, command } = info;

  try {
    const query = content.trim();
    if (!query) {
      return sendMessageWithQuote(
        sock,
        remoteJid,
        message,
        `_⚠️ Format Penggunaan:_\n\n💬 *Contoh:* *${prefix + command} stecu*`
      );
    }

    await sendReaction(sock, message, '⏳');

    try {
      console.log('[API-SC] Meminta data dari FAA...');
      const apiUrl = `https://api-faa.my.id/faa/soundcloud-play?query=${encodeURIComponent(query)}`;
      const { data } = await axios.get(apiUrl);

      if (!data?.status || !data?.result?.download_url) {
        await sendReaction(sock, message, '❗');
        return sendMessageWithQuote(
          sock,
          remoteJid,
          message,
          '❌ Gagal mendapatkan lagu dari SoundCloud.'
        );
      }

      const result = data.result;
      console.log('[✅ API-SC] Berhasil:', result.title);

      await sock.sendMessage(
        remoteJid,
        {
          image: { url: result.thumbnail },
          caption: scCaption(result),
        },
        { quoted: message }
      );

      await sock.sendMessage(
        remoteJid,
        {
          audio: { url: result.download_url },
          fileName: `${result.title}.mp3`,
          mimetype: 'audio/mpeg',
        },
        { quoted: message }
      );

      await sendReaction(sock, message, '✅');
    } catch (e) {
      console.error('❌ [API-SC] Error:', e.message);
      await sendReaction(sock, message, '❗');
      await sendMessageWithQuote(
        sock,
        remoteJid,
        message,
        '⚠️ Terjadi kesalahan saat mengakses API SoundCloud.'
      );
    }
  } catch (err) {
    console.error('❌ ERROR:', err);
    logCustom('info', content, `ERROR-COMMAND-${command}.txt`);
    await sendReaction(sock, message, '❗');
    await sendMessageWithQuote(
      sock,
      remoteJid,
      message,
      `⚠️ Terjadi kesalahan. Detail: ${err.message}`
    );
  }
}

module.exports = {
  handle,
  Commands: ['playsc'],
  OnlyPremium: false,
  OnlyOwner: false,
  limitDeduction: 1,
};