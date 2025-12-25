const cron = require("node-cron");
const { RADIO_CHANNEL_ID } = require("../config/channels");
const { ROLE_70S_ID } = require("../config/roles");

function startRadio(client) {
  cron.schedule("0 15 * * *", async () => {
    const channel = await client.channels.fetch(RADIO_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    const random = Math.floor(Math.random() * 999) + 1;
    channel.send({
      content: `<@&${ROLE_70S_ID}> 📻 Radio du jour\n🎲 Numéro : ${random}`,
      allowedMentions: { roles: [ROLE_70S_ID] }
    });
  });
}

module.exports = { startRadio };
