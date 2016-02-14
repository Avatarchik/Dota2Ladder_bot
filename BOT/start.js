var mysql      = require('mysql');
var db_config = {
	host: 'localhost',
    user: 'root',
    password: '',
    database: 'dota'
};

var connection;

function handleDisconnect() {
  connection = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();

connection.connect(function(err) {
	var stat = [];
	var bot = [];
	 
	setInterval(function () { 
		var sql = 'SELECT * FROM ladder_lobbies_games WHERE lobby_g_status = 0 LIMIT 1';
		connection.query(sql, function(err, rows, results) {
		if(rows.length != 0)
			{
		  		for (var i = 0; i < rows.length; i++) {
					stat[i] = rows[i].lobby_g_id;	

				};
			}
		});	
		var sql = 'SELECT * FROM ladder_bots WHERE bot_busy = 0 LIMIT 1';
		connection.query(sql, function(err, rows, results) {				
			if(rows.length != 0)
			{
				for (var i = 0; i < rows.length; i++) {
							bot[i] = rows[i].bot_id;
						
						};
				if(stat[0] != 0)
				{
					stat.forEach(function(item, i, arr) {
						connection.query("UPDATE ladder_bots SET bot_busy=1, bot_game="+ stat[0] + " WHERE bot_id = " + bot[0]);
						connection.query("UPDATE ladder_lobbies_games SET lobby_g_status=1 WHERE lobby_g_id = " + stat[0]);
						stat[0] = 0;					
						require('./bot'+bot[0]);
						delete require.cache[require.resolve('./bot'+bot[0])]
					});
				}
			}
		});

	}, 2000);
});


