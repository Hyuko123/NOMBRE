const { MEMBER_COUNT_CHANNEL_ID } = require("../config/channels");

async function updateMemberCount(guild) {
  const channel = guild.channels.cache.get(MEMBER_COUNT_CHANNEL_ID);
  if (!channel) return;
  channel.setName(`👥 Membres : ${guild.memberCount}`).catch(() => {});
}

module.exports = { updateMemberCount };
