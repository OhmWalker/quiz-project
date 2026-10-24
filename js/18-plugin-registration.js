// 18-plugin-registration.js
// PluginRegistry.register() für alle Lean-Plugins.
// Einzige Stelle der Plugin-Registrierung (der Legacy-Admin mit seinen
// Admin-Plugins wurde 2026-10 entfernt).

PluginRegistry.register('ClassicQuizPlugin', ClassicQuizPlugin, {category:'quiz', required:true});
PluginRegistry.register('AbilityPlugin',     AbilityPlugin,     {category:'feature'});
PluginRegistry.register('WheelPlugin',       WheelPlugin,       {category:'minigame'});
PluginRegistry.register('FocusQuizPlugin',   FocusQuizPlugin,   {category:'feature', description:'Fokus-Quiz: Zusatz-Quiz aus einer Themengruppe nach Rotationsplan'});
PluginRegistry.register('BossFightPlugin',   BossFightPlugin,   {category:'minigame'});
PluginRegistry.register('BadgePlugin',       BadgePlugin,       {category:'feature'});
PluginRegistry.register('LeaderboardPlugin', LeaderboardPlugin, {category:'feature'});
