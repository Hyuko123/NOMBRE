const fs = require("fs");
const path = require("path");

async function createTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();

  let html = `<html><body style="background:#313338;color:#dcddde;font-family:Arial">`;

  for (const msg of sorted) {
    html += `<p><b>${msg.author.tag}</b> : ${msg.content || ""}</p>`;
  }

  html += "</body></html>";

  const filePath = path.join(__dirname, `../transcript-${channel.id}.html`);
  fs.writeFileSync(filePath, html);
  return filePath;
}

module.exports = { createTranscript };
