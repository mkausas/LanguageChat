// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;


var watson = require('watson-developer-cloud');
var language_translation = watson.language_translation({
  username: 'b9f3a674-63bb-41a2-aaa1-caf7af87b304',
  password: 'y75Z94jDkmNr',
  version: 'v2'
});




// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/assets'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {



    console.log("this shit should work, data = " + data);
    var translatedMessage = "";
    language_translation.identify({ text: data},
      function(err, identifiedLanguages) {
        if (err)
          console.log(err)
        else {
          console.log(identifiedLanguages)
          var lang = identifiedLanguages["languages"][0]["language"];
          console.log(identifiedLanguages["languages"][0]["language"])
          // console.log(identifiedLanguages[0])

          language_translation.translate({
              text: data,
              source: lang,
              target: 'es'
            }, function(err, translation) {
              if (err){
                console.log(err)
              }
              else {
                data = translation["translations"][0]["translation"];
                console.log(data)
              }

              console.log("SENDING data = " + data)
              // we tell the client to execute 'new message'
              socket.broadcast.emit('new message', {
                username: socket.username,
                message: data
              });
          });
        }

          // console.log(identifiedLanguages[0]["language"]);
    });




  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});