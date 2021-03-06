var Discord			= require("discord.js");

var Commands		= require("./nekobot/commands").Commands;
var ChatLogger		= require("./nekobot/logger").ChatLogger;
var Logger			= require("./nekobot/logger").Logger;
var Permissions		= require("./nekobot/permissions");
var VersionChecker	= require("./nekobot/versioncheck");

var Config = require("./config.json");
var Games = require("./games.json"); // via Unpackr (Nov 09, 2015)

var NekoBot = new Discord.Client();

// ========================================================================
// Init / Ready
// ========================================================================

function init() {

	Logger.info("Initializing...");

	Logger.info("Checking for updates...");
	VersionChecker.getStatus(function(err, status) {
		if (err) { error(err); } // error handle
		if (status && status !== "failed") {
			Logger.info(status);
		}
	});

}

NekoBot.once("ready", function() {

	Logger.info("Joining servers...");
	for (index in Config.invites) {
		NekoBot.joinServer(Config.invites[index], function(err, server) {
			if (err) { Logger.warn("Failed to join server (" + err + ")"); }
			if (server) { Logger.info("Joined server: " + server.name); }
		});
	}

	NekoBot.setPlayingGame(452); // ;)

});

// ========================================================================
// Command Reciever
// ========================================================================

NekoBot.on("message", function(msg) {

	// log chat specifially for new VM web window
	var channelInfo = "[Private Message]";
	if (msg.channel.server) { channelInfo = "[$" + msg.channel.server.name + "] [#" + msg.channel.name + "]"; }
	ChatLogger.info(channelInfo + " " + msg.author.username + ": " + msg.content);

	// prevent NekoBot from gaining sentience
	if(msg.author.equals(NekoBot.user)) { return; }

	// check for command prefix so we know it's a command
	if(msg.content.charAt(0) === Config.commands.prefix) {

		// remove the command prefix from the message
		msg.content = msg.content.substr(1);

		// split message into command and params
		var chunks = msg.content.split(" ");
		var command = chunks[0];
		var params = chunks.slice(1);

		// ignore if idiotic punctuation spam
		var antiIdiot = new RegExp("^[a-z0-9]+$", "i");
		if (antiIdiot.test(command) === false) { return; }

		// search for a matching command
		if (Commands[command]) {

			// make sure the user has permission
			Permissions.getUserLevel(msg.author, function(err, level) {

				if (err) { error(err); } // error handle
				if (level >= Commands[command].authLevel) {

					// check for sfw or pm channel
					if (!Commands[command].nsfw || !msg.channel.server) {

						// sfw command or pm, just execute the command
						Commands[command].fn(NekoBot, msg, params, error);

					// nsfw command, check if allowed
					} else {
						Permissions.getAllowNSFW(msg.channel, function(err, allow) {
							if (err) { return error(err); } // error handle
							if (allow === "on") {
								Commands[command].fn(NekoBot, msg, params, error);
							} else {
								NekoBot.sendMessage(msg, "NSFW commands are **DISABLED** in " + msg.channel).catch(error);
							}
						});
					}

				// user doesn't have permissions
				} else {
					var msgArray = [];
					msgArray.push("you don't have access to the **" + Config.commands.prefix + command + "** command.");
					msgArray.push("_(current permissions level: **" + level + "**, required permissions level: **" + Commands[command].authLevel + "**)_");
					NekoBot.reply(msg, msgArray).catch(error);
				}
			});

		// no matching command
		} else {
			NekoBot.reply(msg, "there is no **" + Config.commands.prefix + command + "** command.").catch(error);
		}
	}
});

// ========================================================================
// New User Greeter
// ========================================================================

NekoBot.on("serverNewMember", function(user, server) {
	NekoBot.sendMessage(server.defaultChannel, user + " has joined the server! Nyaa~").catch(error);
});

// ========================================================================
// Game Detection
// ========================================================================

NekoBot.on("presence", function(data) {
	if (data.gameId !== null) {
		for (index in Games) {
			if (Games[index].id === data.gameId) {
				NekoBot.sendMessage(data.server.defaultChannel, "**" + data.user.username + "** has started playing **" + Games[index].name + "**").catch(error);
			}
		}
	}
});

// ========================================================================
// Error / Disconnect Handle
// ========================================================================

function error(err) {
	ChatLogger.error("ERROR: " + err);
	Logger.error(err);
	process.exit(1);
}

NekoBot.on("error", function(err) {
	error(err);
});

NekoBot.on("disconnected", function() {
	error("Disconnected! :(");
});

// ========================================================================
// Discord.js Debug Piping
// ========================================================================

NekoBot.on("debug", function(msg) {
	Logger.log("debug", msg);
});

NekoBot.on("unknown", function(data) {
	Logger.log("debug", data);
});

NekoBot.on("raw", function(data) {
	Logger.log("debug", data);
});

// After all funcs, do Bot login! (This is the program entry point)
NekoBot.login(Config.email, Config.password).then(init).catch(error);
