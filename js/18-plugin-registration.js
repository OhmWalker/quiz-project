// 18-plugin-registration.js
// PluginRegistry.register() für alle Lean-Plugins.
// Lean-kritisch: 20-plugin-usermanagement.js ist aus LeanQuiz ausgeschlossen,
// daher stehen die Registrierungen hier (Admin-Plugins folgen in 20-…).

PluginRegistry.register('ClassicQuizPlugin', ClassicQuizPlugin, {category:'quiz', required:true});
PluginRegistry.register('AbilityPlugin',     AbilityPlugin,     {category:'feature'});
PluginRegistry.register('WheelPlugin',       WheelPlugin,       {category:'minigame'});
PluginRegistry.register('BossFightPlugin',   BossFightPlugin,   {category:'minigame'});
PluginRegistry.register('BadgePlugin',       BadgePlugin,       {category:'feature'});
PluginRegistry.register('LeaderboardPlugin', LeaderboardPlugin, {category:'feature'});
