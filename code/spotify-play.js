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
    `🎧 *SPOTIFY DOWNLOADER*\n\n` +
    `📌 *Judul*       : ${data.title}\n` +
    `👤 *Artist*      : ${data.artist}\n` +
    `💿 *Album*       : ${data.album}\n` +
    `🗓️ *Rilis*       : ${data.release_date}\n` +
    `⏱️ *Durasi*      : ${data.duration}\n` +
    `🔗 *Spotify*     : ${data.spotify_url}`
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
        `_⚠️ Format:_\n\nContoh: *${prefix + command} stecu*`
      );
    }

    await sendReaction(sock, message, '⏳');

    try {
      const apiUrl = `https://api-faa.my.id/faa/spotify-play?q=${encodeURIComponent(query)}`;
      const { data } = await axios.get(apiUrl);

      if (!data?.status || !data?.download?.url) {
        await sendReaction(sock, message, '❗');
        return sendMessageWithQuote(
          sock,
          remoteJid,
          message,
          '❌ Gagal mendapatkan lagu dari Spotify.'
        );
      }

      const infoTrack = data.info;
      const download = data.download;

      await sock.sendMessage(
        remoteJid,
        {
          image: { url: infoTrack.thumbnail },
          caption: scCaption(infoTrack),
        },
        { quoted: message }
      );

      await sock.sendMessage(
        remoteJid,
        {
          audio: { url: download.url },
          fileName: `${infoTrack.title}.mp3`,
          mimetype: 'audio/mpeg',
        },
        { quoted: message }
      );

      await sendReaction(sock, message, '✅');
    } catch (e) {
      await sendReaction(sock, message, '❗');
      await sendMessageWithQuote(
        sock,
        remoteJid,
        message,
        '⚠️ Terjadi kesalahan saat mengakses API Spotify.'
      );
    }
  } catch (err) {
    logCustom('info', content, `ERROR-COMMAND-${command}.txt`);
    await sendReaction(sock, message, '❗');
    await sendMessageWithQuote(
      sock,
      remoteJid,
      message,
      `⚠️ Terjadi kesalahan. ${err.message}`
    );
  }
}

module.exports = {
  handle,
  Commands: ['spotify'],
  OnlyPremium: false,
  OnlyOwner: false,
  limitDeduction: 1,
};