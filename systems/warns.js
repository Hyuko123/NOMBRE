const {
  WARN_1_ROLE_ID,
  WARN_2_ROLE_ID,
  WARN_3_ROLE_ID,
  CITIZEN_ROLE_ID
} = require("../config/roles");

async function handleWarn(interaction) {
  const member = interaction.options.getMember("utilisateur");
  const reason = interaction.options.getString("raison");

  if (!member) return interaction.editReply("❌ Membre introuvable");

  if (!member.roles.cache.has(WARN_1_ROLE_ID)) {
    await member.roles.add(WARN_1_ROLE_ID);
    return interaction.editReply(`⚠️ ${member} → Warn 1\n📄 ${reason}`);
  }

  if (member.roles.cache.has(WARN_1_ROLE_ID) && !member.roles.cache.has(WARN_2_ROLE_ID)) {
    await member.roles.remove(WARN_1_ROLE_ID);
    await member.roles.add(WARN_2_ROLE_ID);
    return interaction.editReply(`⚠️ ${member} → Warn 2\n📄 ${reason}`);
  }

  await member.roles.remove(WARN_2_ROLE_ID);
  await member.roles.add(WARN_3_ROLE_ID);

  await member.send(
    `🚨 Tu as reçu un **Avertissement 3**.\n📄 Raison : ${reason}`
  ).catch(() => {});

  for (const role of member.roles.cache.values()) {
    if (role.id === member.guild.id) continue;
    if (role.id === CITIZEN_ROLE_ID) continue;
    if (role.editable) await member.roles.remove(role).catch(() => {});
  }

  await member.roles.remove(WARN_3_ROLE_ID).catch(() => {});
  return interaction.editReply(`🚨 ${member} → Warn 3 (Derank effectué)`);
}

module.exports = { handleWarn };
