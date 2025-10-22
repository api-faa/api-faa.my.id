const axios = require("axios");
const fs = require("fs");
const { ImageUploadService } = require("node-upload-images");

const handler = async (m, sock, { args, example, isRegis, reply, mess }) => {
  try {
    if (!isRegis) return reply(mess.regis);
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";
    if (!mime.startsWith("image/"))
      return m.reply(example("text atas|text bawah (sambil kirim atau reply foto)"));

    if (!args[0])
      return m.reply(example("text atas|text bawah (sambil kirim foto)"));

    const [topText, bottomText] = args.join(" ").split("|").map(v => v.trim());
    if (!topText) return reply("Masukkan teks atas dan bawah, pisahkan dengan '|'");

    await reply("Wait...");

    const imagePath = await sock.downloadAndSaveMediaMessage(q);

    const service = new ImageUploadService("pixhost.to");
    const upload = await service.uploadFromBinary(fs.readFileSync(imagePath), "meme.jpg");
    fs.unlinkSync(imagePath);

    const imageUrl = upload?.directLink;
    if (!imageUrl) return m.reply("Upload ke pixhost.to gagal.");

    const apiUrl = `https://api.nekolabs.my.id/canvas/meme?imageUrl=${encodeURIComponent(imageUrl)}&textT=${encodeURIComponent(topText)}&textB=${encodeURIComponent(bottomText || "")}`;
    const res = await axios.get(apiUrl, { responseType: "arraybuffer" });

    // --- Simpan hasil sementara
    const outFile = "./data/trash/meme_result.png";
    fs.writeFileSync(outFile, res.data);

    // --- Kirim hasil sebagai stiker
    await sock.sendImageAsSticker(m.chat, fs.readFileSync(outFile), m, {
      packname: "© wm?",
      author: "@jarroffc2",
    });

    fs.unlinkSync(outFile);

  } catch (err) {
    console.error("MemeGen (Nekolabs) Error:", err);
    reply("Gagal membuat meme: " + err.message);
  }
};

handler.command = ["meme", "smeme"];
module.exports = handler;