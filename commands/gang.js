const { GANG_HIERARCHY, ROLE_70S_ID, ROLE_HG_ID, ROLE_CITIZEN_ID, STAFF_ROLE_ID } = require("../config/roles");

module.exports = client => {
  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "gang") return;

    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
      return interaction.reply({ content: "❌ Staff uniquement", ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const ALL_GANG_ROLES = Object.values(GANG_HIERARCHY);

    /* LIST */
    if (sub === "list") {
      const desc = Object.values(GANG_HIERARCHY)
        .map(id => guild.roles.cache.get(id)?.name)
        .filter(Boolean)
        .map(r => `• **${r}**`)
        .join("\n");

      return interaction.reply({ content: desc || "Aucun gang", ephemeral: true });
    }

    /* ADD */
    if (sub === "add") {
      const member = interaction.options.getMember("utilisateur");
      const rank = interaction.options.getString("rang");

      await member.roles.remove(ALL_GANG_ROLES).catch(() => {});
      await member.roles.add([ROLE_CITIZEN_ID, ROLE_70S_ID, GANG_HIERARCHY[rank]]);

      if (rank === "og") await member.roles.add(ROLE_HG_ID).catch(() => {});
      else await member.roles.remove(ROLE_HG_ID).catch(() => {});

      return interaction.reply({ content: `✅ ${member} ajouté`, ephemeral: true });
    }

    /* REMOVE */
    if (sub === "remove") {
      const member = interaction.options.getMember("utilisateur");

      await member.roles.remove([...ALL_GANG_ROLES, ROLE_HG_ID]).catch(() => {});
      await member.roles.add([ROLE_CITIZEN_ID, ROLE_70S_ID]).catch(() => {});

      return interaction.reply({ content: `❌ ${member} retiré du gang`, ephemeral: true });
    }
  });
};
