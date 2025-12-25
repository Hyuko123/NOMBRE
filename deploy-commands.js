console.log({
  TOKEN: TOKEN ? "OK" : "MANQUANT",
  CLIENT_ID,
  GUILD_ID
});

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [
  new SlashCommandBuilder()
    .setName("cmd")
    .setDescription("📜 Affiche toutes les commandes disponibles"),

  new SlashCommandBuilder()
    .setName("gang")
    .setDescription("Gestion du gang")
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("Voir la hiérarchie du gang")
    ),

  new SlashCommandBuilder()
    .setName("annonce")
    .setDescription("📢 Envoyer une annonce")
    .addStringOption(opt =>
      opt.setName("message").setDescription("Contenu").setRequired(true)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("⏳ Déploiement des slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands déployées !");
  } catch (error) {
    console.error(error);
  }
})();


