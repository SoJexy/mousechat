var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    sio = require('socket.io'),
    io = sio.listen(server),
    _ = require('underscore')._,
    validator = require('validator');

// var app = http.createServer(function (request, response) {
//  fs.readFile("index.html", 'utf-8', function (error, data) {
//      response.writeHead(200, {'Content-Type': 'text/html'});
//      response.write(data);
//      response.end();
//  });
// }).listen(8080)

app.configure(function () {
    app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 8080);
    app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.static(__dirname + '/public'));
    app.use('/css', express.static(__dirname + '/css'));
    app.use('/fonts', express.static(__dirname + '/fonts'));
    app.use('/js', express.static(__dirname + '/js'));
    app.engine('html', require('ejs').renderFile);
});

app.get('/', function (req, res) {
    res.render('index.html')
});

server.listen(app.get('port'), app.get('ipaddr'), function () {
    console.log('Server listening on IP: ' + app.get('ipaddr') + 'and port ' + app.get('port'));
});

sio.Socket.prototype.disconnectRoom = function (name) {
    var nsp = this.namespace.name
    , name = (nsp + '/') + name;

    var users = this.manager.rooms[name];

    length = users.length;

    for(var i = 1; i < length; i++) {
        io.sockets.socket(users[1]).disconnect();
    }

    return this;
};

sio.Socket.prototype.updateUsers = function (name) {
    var roomName = name;
    var nsp = this.namespace.name
    , name = (nsp + '/') + name;

    var userList = this.manager.rooms[name];
    length = userList.length;

    io.sockets.socket(userList[0]).emit('hUpdateUsers', rooms[roomName].users);

    for(var i = 1; i < length; i++) {
        io.sockets.socket(userList[i]).emit('cUpdateUsers', getUserNames(roomName));
    }

    return this;
};

var clients = {};
var hosts = {};
var rooms = {};

io.sockets.on('connection', function (socket) {

    //socket.on('host', function(roomName, roomPW) {
    //  rooms[roomName] = roomPW;
    //  
    //});

    socket.on('hostCreate', function (roomName, roomPW) {
        console.log('CLIENT: Professor: ' + socket.id + ' has connected')
        if (roomName in rooms) {
            console.log('ERROR: hostCreate: ' + socket.id + ' bypassed roomExists for ' + roomName);
            io.sockets.socket(socket.id).emit('boot', 'Room: ' + roomName + ' already exists.');  
        } else {
            socket.userName = 'Professor';
            hosts[socket.id] = roomName;
            var newRoom = new Room(socket.id, roomName, roomPW);
            rooms[roomName] = newRoom;
            console.log('CLIENT: Professor created room ' + roomName);
            socket.room = roomName;
            socket.join(socket.room);
            socket.emit('cUpdateChat', 'SERVER', ' you have connected');
        }
        
    });


    socket.on('clientJoin', function (stuID, roomName, roomPW) {
        console.log('CLIENT: ' + socket.id + ' with ID: ' + stuID + 'has connected')
        if (!(roomName in rooms)) {
            console.log('ERROR: clientJoin: ' + socket.id + ' bypassed roomExists for ' + roomName);
            io.sockets.socket(socket.id).emit('boot', roomName + ' doesn\'t exists.');  
        } else if (rooms[roomName].password === roomPW) {
            // Append socket ID
            rooms[roomName].nameCount++;
            var userName = 'Anon ' + rooms[roomName].nameCount;
            socket.userName = userName;
            // Create a new User
            var myUser = new User(socket.id, userName, stuID, roomName)
            // Add user to list of currently connected clients
            clients[socket.id] = myUser;
            // Add user to room's list of users
            rooms[roomName].addUser(myUser);
            console.log('CLIENT: Student ' + socket.id + ' joined room ' + roomName);
            socket.room = roomName;
            // Join the socket room
            socket.join(roomName);
            socket.emit('cUpdateChat', 'SERVER', ' you have connected');
            socket.broadcast.to(roomName).emit('cUpdateChat', 'SERVER',
                '<i>' + userName + '</i>' + ' has connected');
            socket.updateUsers(roomName);
            //socket.emit('cUpdateUsers', getUserNames(roomName));
        } else {
            console.log('ERROR: clientJoin: ' + socket.id + ' bypassed roomVerify for ' + roomName);
            io.sockets.socket(socket.id).emit('boot', 'Incorrect Password for ' + roomName);
            //socket.disconnect(socket.id);	
        }
    });

    socket.on('disconnect', function () {
        var roomName = null;
        if (socket.id in hosts) {
            roomName = hosts[socket.id];
            console.log('CLIENT: Professor ' + socket.id + ' disconnected');
            console.log('CLIENT: Deleting room: ' + roomName)
            delete rooms[roomName];
            delete hosts[socket.id];
            io.sockets.in(roomName).emit('error', 'Professor disconnected from ' + '<b>' + roomName + '</b>');
            socket.disconnectRoom(roomName);
            //io.sockets.in(roomName).emit('hostDisconnect');
            socket.leave(socket.room);
        } else if (socket.id in clients) {
            roomName = clients[socket.id].curRoom;
            if (rooms[roomName] == null) { 
                console.log('CLIENT: Force disconnect from Professor room: ' + roomName);
                console.log('CLIENT: Force Student ' + socket.id + ' to disconnect');
                delete clients[socket.id];
                socket.leave(socket.room);
                //socket.disconnect();
            } else {
                console.log('CLIENT: Student ' + socket.id + ' disconnected');
                rooms[roomName].removeUser(socket.userName);
                io.sockets.emit('cUpdateUsers', getUserNames(roomName));
                socket.broadcast.to(roomName).emit('cUpdateChat', 'SERVER',
                    '<i>' + socket.userName + '</i>' + ' has disconnected');
                delete clients[socket.id];
                socket.leave(socket.room);
            }   	
        } else {
            console.log('ERROR: disconnect: ' + socket.id + ' is neither CLIENT OR HOST');
            io.sockets.socket(socket.id).emit('error', 'You have not selected Professor or Student. Refresh and try again');
        }
    });
	
    socket.on('sendMsg', function (data) {
        var message = validator.escape(data.message);
        // Check if host is sending message, if he is, broadcast to room
        if (socket.id in hosts) {
            room = hosts[socket.id];
            io.sockets.in(room).emit('cUpdateChat', socket.userName, message);
        // Else check if client
        } else if (socket.id in clients) {
            // Get the room of the client
            room = clients[socket.id].curRoom;
            // Check if students can talk
            if (rooms[room].canTalk) {
                // If room has openMessage, broadcast to room
                if (rooms[room].openMessage) {
                    io.sockets.in(room).emit('cUpdateChat', socket.userName, message);
                // Otherwise submit only to owner and client
                } else {
                    var to = rooms[room].owner;
                    io.sockets.socket(socket.id).emit('cUpdateChat', socket.userName, message);
                    io.sockets.socket(to).emit('cUpdateChat', socket.userName, message); 
                }
            } else {
                io.sockets.socket(socket.id).emit('error', 'You currently do not have permission to chat.');
            }

        } else {
            console.log('ERROR: sendMSG: ' + socket.id + ' is neither CLIENT OR HOST');
            io.sockets.socket(socket.id).emit('error', 'You have not selected Professor or Student. Refresh and try again');
            socket.disconnect(socket.id);
        }

    });

	socket.on('hKickUser', function (ID) {
		// Check if client is a host
		if (socket.id in hosts) {
			roomName = hosts[socket.id];
			exists = null;
			// Check if the user exists in the given room
			for (var i = 0; i < rooms[roomName].users.length; i++) {
				if(rooms[roomName].users[i].id === ID) {
					exists = true;
					var userName = rooms[roomName].users[i].name;
				} else {
					exists = false;
				}
			}
			if (exists) {
				var to = rooms[roomName].owner;
				io.sockets.socket(ID).emit('error', 'You were kicked from ' + roomName + ' by the Professor.');
				io.sockets.socket(ID).disconnect();
				io.sockets.socket(to).emit('cUpdateChat', 'SERVER', '<i>' + userName + '</i>' + ' was kicked.');
			} else {
				io.sockets.socket(socket.id).emit('error', userName + ' is not present in ' + roomName + '.');
			}
		} else {
			io.sockets.socket(socket.id).emit('error', 'You are not a Professor.');
		}

	});

    socket.on('hChatToggle', function () {
        if (socket.id in hosts) {
            roomName = hosts[socket.id];
            rooms[roomName].canTalk = !rooms[roomName].canTalk;
            if (rooms[roomName].canTalk) {
                io.sockets.in(roomName).emit('cToggleChat', true);
            } else {
                io.sockets.in(roomName).emit('cToggleChat', false);
            }
        } else {
            console.log('ERROR: hChatToggle: ' + socket.id + ' is not a HOST.' );
            io.sockets.socket(socket.id).emit('error', 'You are not a Professor.');
            socket.disconnect(socket.id);
        }

    });

    socket.on('hOpenMsgToggle', function () {
        if (socket.id in hosts) {
            roomName = hosts[socket.id];
            rooms[roomName].openMessage = !rooms[roomName].openMessage;
            if (rooms[roomName].openMessage) {
                io.sockets.in(roomName).emit('cOpenFloor', true);
            } else {
                io.sockets.in(roomName).emit('cOpenFloor', false);
            }
        } else {
            console.log('ERROR: hOpenMsgToggle: ' + socket.id + ' is not a HOST.' );
            io.sockets.socket(socket.id).emit('error', 'You are not a Professor.');
            socket.disconnect(socket.id);
        }
    });

    // Returns true if the room exists otherwise false
    socket.on('roomExists', function (roomName, fn) {
        if (roomName in rooms) {
            fn(true);
        } else {
            fn(false);
        }
    });

    socket.on('roomVerify', function (roomName, roomPW, fn) {
        if (!(roomName in rooms)) {
            console.log('ERROR: roomVerify: ' + socket.id + ' bypassed roomExists when joining as Student' );
            io.sockets.socket(socket.id).emit('boot', roomName + ' doesn\'t exists.');  
        } else if ((rooms[roomName].name === roomName) && 
            (rooms[roomName].password=== roomPW)) {
            fn(true);
        } else {
            fn(false);               
        }
    });

    socket.on('roomCanTalk', function (roomName, fn) {
        if (roomName in rooms) {
            if (rooms[roomName].canTalk){
                fn(true);
            } else {
                fn(false);
            }
        } else {
            fn(false);
        }
    });

});

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
};

function exists(arr, obj) {
    return (arr.indexOf(obj) != -1);
}

function User(id, name, stuID, room) {
    this.id = id;
    this.stuID = stuID;
    this.name = name;
    this.curRoom = room;
};


// Returns a list of user's names in the current room
function getUserNames(room) {
    var userList = [];

    for (var i = 0; i < rooms[room].users.length; i++) {
        userList.push(rooms[room].users[i].name);
    }

    return userList;
};


function Room(owner, roomName, password) {
    this.owner = owner;
    this.name = roomName;
    this.password = password;
    this.nameCount = 0;
    this.openMessage = false;
    this.canTalk = true;
    this.users = [];
};


Room.prototype.getUserID = function (userName) {
    var result = '';
    for (var i = 0; i < this.users.length; i++) {
        if (this.users[i].name == userName) {
            result = this.users[i].id
            break;
        }
    }
    return result;
}

Room.prototype.addUser = function (user) {
    this.users.push(user);
};

Room.prototype.removeUser = function (user) {
    var userIndex = -1;
    for (var i = 0; i < this.users.length; i++) {
        if (this.users[i].name == user) {
            userIndex = i;
            break;
        }
    }
    this.users.splice(userIndex, 1);
};

/*
Room.prototype.addUser = function (user) {
    this.users.push(user);
};

Room.prototype.removeUser = function (user) {
    var userIndex = this.users.indexOf(user);
    if (userIndex > -1) {
        this.users.splice(userIndex, 1);
    }
};*/