var steam = require("steam"),
    util = require("util"),
    fs = require("fs"),
    crypto = require("crypto"),
    dota2 = require("../"),
    steamClient = new steam.SteamClient(),
    steamUser = new steam.SteamUser(steamClient),
    steamFriends = new steam.SteamFriends(steamClient),
    Dota2 = new dota2.Dota2Client(steamClient, true);
	
var mysql = require('mysql');
var db_config = {
	host: 'localhost',
    user: 'root',
    password: '',
    database: 'dota'
};
	var id;
	var botid = 1;
	var log4js = require('log4js');

	//to add an appender programmatically, and without clearing other appenders
	//loadAppender is only necessary if you haven't already configured an appender of this type
	log4js.loadAppender('file');
	
	log4js.addAppender(log4js.appenders.file('../logs/log.log'), 'result');
	
	log4js.addAppender(log4js.appenders.file('../logs/bots/bot'+botid+'.log'), 'BOT #'+botid);
	
	log4js.addAppender(log4js.appenders.file('../logs/bots/chat_bot'+botid+'.log'), 'CHATBOT #'+botid);

	var logger = log4js.getLogger('result');
	var blog = log4js.getLogger('BOT #'+botid);
	var chat = log4js.getLogger('CHATBOT #'+botid);

function handleDisconnect() {
	  connection = mysql.createConnection(db_config); // Recreate the connection, since
													  // the old one cannot be reused.

	  connection.connect(function(err) {              // The server is either down
		if(err) {                                     // or restarting (takes a while sometimes).
		 // console.log('error when connecting to db:', err);
		  setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
		}                                     // to avoid a hot loop, and to allow our node script to
	  });                                     // process asynchronous requests in the meantime.
											  // If you're also serving http, display a 503 error.
	  connection.on('error', function(err) {
		//console.log('db error', err);
		if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
		  handleDisconnect();                         // lost due to either server restart, or a
		} else {                                      // connnection idle timeout (the wait_timeout
		  throw err;                                  // server variable configures this)
		}
	  });
}

	handleDisconnect();


var t1,t2,gamemode,pass;
global.config = require("./configs/config" + botid);
connection.connect(function(err){
	var users = [];	
	var lobbygame;	
	var ready = 0;
	var sql = 'SELECT * FROM ladder_bots WHERE bot_id = '+ botid +' LIMIT 1';
	connection.query(sql, function(err, rows, results) {
		if(rows.length != 0)
		{
			lobbygame = rows[0].bot_game;			
		}
		if(!err)
		{
				var sql = 'SELECT * FROM ladder_lobbies_games LEFT JOIN ladder_lobbies ON ladder_lobbies_games.lobby_g_lobby=ladder_lobbies.lobby_id WHERE lobby_g_id = '+ lobbygame + ' LIMIT 1';
				connection.query(sql, function(err, rows, results) {
				t1 = rows[0].lobby_g_team1;
				t2 = rows[0].lobby_g_team2;
				gamemode = rows[0].lobby_g_gamemod;
				var t1p = rows[0].lobby_g_players1.split(',');
				var t2p = rows[0].lobby_g_players2.split(',');
				var players = t1p.concat(t2p);
				
				players.forEach(function(item, i, arr) {
					users[i] = item;			
				});
				ready = 1;
				
			});	
		}
	});	

function createLobby()
{

	/*Конфиг лобби*/
	pass = Math.floor((Math.random() * 99999) + 1);
	pass = pass+'_'+lobbygame;
	 var options = {
		"game_name": "Игра #"+lobbygame,
		"server_region": 3,
		"game_mode": gamemode,
		"game_version": 1,
		"allow_cheats": false,
		"fill_with_bots": false,
		"allow_spectating": true,
		"pass_key": pass,
		"radiant_series_wins": 0,
		"dire_series_wins": 0,
		"allchat": false
	}
	/*Конец конфига*/	

	Dota2.createPracticeLobby(options.pass_key, options, function(err, data){	
		if(JSON.stringify(data['result']) == 1){
			util.log("Лобби успешно создано");
			steamFriends.sendMessage('76561198107070247', 'Создал игру для матча №'+lobbygame, steam.EChatEntryType.ChatMsg);
		}else{
			util.log("Создать лобби не удалсоь");
		}
	});

	Dota2.joinPracticeLobbyTeam(1, 4, function(err, data){
		if(JSON.stringify(data['result']) == 1)
		{
			util.log("Бот занял место наблюдателя.");
		}
	});
	/*Invites*/
	setInterval(function(){
		if(ready == 1){			
			users.forEach(function(item, i, arr) {
				Dota2.inviteToLobby(item);
			});
			ready = 0;
		}
	},5000);
}

var onSteamLogOn = function onSteamLogOn(logonResp) {

    if (logonResp.eresult == steam.EResult.OK) {		
        steamFriends.setPersonaState(steam.EPersonaState.Busy);
        steamFriends.setPersonaName("cGame.info|BOT #" + botid);
        util.log("Авторизован.");
        Dota2.launch();
        Dota2.on("ready", function() {
			var date = new Date();
			blog.info('Успешный запуск бота '+date);
            util.log("Бот №" + botid + " готов.");			
           /*Создаем лобби*/
		   createLobby();
		   /*Лобии создано*/
		Dota2.on('practiceLobbyUpdate', function(lobby) {						
		id = lobby.lobby_id + "";
		var status = lobby.match_outcome;	
		var chat = 0;
			if(chat == 0)
			{
				Dota2.joinChat('Lobby_'+id, 3);
			}
			if(status != 0)
			{
				connection.query("UPDATE ladder_lobbies_games SET lobby_g_result= "+ status + " WHERE lobby_g_id = " + lobbygame);
				if(status == 0)
				{
					connection.query("UPDATE ladder_lobbies_games SET lobby_g_winner= "+ t1 + " WHERE lobby_g_id = " + lobbygame);
				}else{
					connection.query("UPDATE ladder_lobbies_games SET lobby_g_winner= "+ t2 + " WHERE lobby_g_id = " + lobbygame);
				}
				connection.query("UPDATE ladder_bots SET bot_busy=0 WHERE bot_id = " + botid);
			}
			var pn;
			var pnn = 0;
			lobby['members'].forEach(function(item, i, arr) {
				pn = i+1;
			});
			if(pn == 3)
			{
				var laucnh = 0;
				if(launch = 0)
				{
					Dota2.sendMessage('Lobby_'+id, 'Игра начнется через 5 секунд!.');
					setTimeout(function(){
						Dota2.launchPracticeLobby(function(err, data){});
						laucnh = 1;
						steamFriends.sendMessage('76561198107070247', 'Игра #' + id + ' была начата!', steam.EChatEntryType.ChatMsg);
					}, 5000);
				}
			}
				
		});	
            // ----------------------------------
        });

        Dota2.on("unready", function onUnready() {
            util.log("Node-dota2 unready.");
        });

        Dota2.on("chatMessage", function(channel, personaName, message) {
            chat.trace("[" + channel + "] " + personaName + ": " + message);
        });

        Dota2.on("unhandled", function(kMsg) {
            util.log("UNHANDLED MESSAGE #" + kMsg);
        });
    }
},
	onSteamServers = function onSteamServers(servers) {
		util.log("Received servers.");
		fs.writeFile('servers', JSON.stringify(servers));
	},
	onSteamLogOff = function onSteamLogOff(eresult) {
		util.log("Logged off from Steam.");
	},
	onSteamError = function onSteamError(error) {
		util.log("Connection closed by server.");
	};
steamFriends.on('message', function(source, message, type, chatter) {
  // respond to both chat room and private messages
	
	console.log('Получено сообщение: ' + message);
    
  switch(message)
  {
  	case 'Покинуть':
	  	Dota2.abandonCurrentGame();
		Dota2.leavePracticeLobby();
		Dota2.leaveChat('Lobby_'+id);
	    steamFriends.sendMessage(source, 'Покинул лобби #'+id, steam.EChatEntryType.ChatMsg);
		blog.info('Пользователь '+source+' приказал покинуть лобби #'+id);
		id = null;
		break
	case 'Статус':
	  if(id != null)
	  {
		var answer = 'Нахожусь в лобби #'+id+'. Пароль от лобби: '+pass;
		steamFriends.sendMessage(source, answer, steam.EChatEntryType.ChatMsg);
		blog.info('Пользователь '+source+' запросил статус игры и получил ответ: "'+answer+'"');
	  }
	  else
	  {
		steamFriends.sendMessage(source, 'Ожидаю игру.', steam.EChatEntryType.ChatMsg);   
	  }
	  break
	case 'Создать':
		createLobby();
		blog.info('Пользователь '+source+' запросил создание новой игры');
		break
	case 'Офф':
		Dota2.exit();
		steamClient.disconnect();
		connection.query("UPDATE ladder_bots SET bot_busy=0 WHERE bot_id = " + botid);
		blog.info('Пользователь '+source+' выключил бота');
		break
	case 'Пригласить админов':
		Dota2.inviteToLobby("76561198107070247");
		steamFriends.sendMessage(source, 'Приглашение для админов было отправленно!' + source, steam.EChatEntryType.ChatMsg); 
		blog.info('Пользователь '+source+' пригласил администрацию в лобби');
		break
	case 'Офф':
		Dota2.exit();
		steamClient.disconnect();
		connection.query("UPDATE ladder_bots SET bot_busy=0 WHERE bot_id = " + botid);
		blog.info('Пользователь '+source+' выключил бота');
		break
	case 'Начать игру':
		Dota2.launchPracticeLobby(function(err, data){});
		var answer = 'Игра #' + id + ' была начата!';
		steamFriends.sendMessage(source, answer, steam.EChatEntryType.ChatMsg);
		blog.info('Пользователь '+source+' запросил старт игры и получил ответ "'+answer+'"');	
		break

  }  
});
steamUser.on('updateMachineAuth', function(sentry, callback) {
    fs.writeFileSync('sentry', sentry.bytes)
    util.log("sentryfile saved");

    callback({ sha_file: crypto.createHash('sha1').update(sentry.bytes).digest() });
});

var logOnDetails = {
    "account_name": global.config.steam_user,
    "password": global.config.steam_pass,
};
if (global.config.steam_guard_code) logOnDetails.auth_code = global.config.steam_guard_code;

try {
    var sentry = fs.readFileSync('sentry');
    if (sentry.length) logOnDetails.sha_sentryfile = sentry;
}
catch (beef){
    util.log("Cannot load the sentry. " + beef);
}

steamClient.connect();

steamClient.on('connected', function() {
    steamUser.logOn(logOnDetails);
});

steamClient.on('logOnResponse', onSteamLogOn);
steamClient.on('loggedOff', onSteamLogOff);
steamClient.on('error', onSteamError);
steamClient.on('servers', onSteamServers);
});
