$(document).ready(function () {
    var socket = io.connect('http://127.0.0.1:8080');
    var userType = '';

    $('form').submit(function (event) {
        event.preventDefault();
    });

    $('#aboutBody').hide();
    $('#index').fadeIn('fast');
    $('#mainChat').hide();
    $('#adminMenu').hide();
    $('#clientMenu').hide();
    $('#errors').hide();
    $('#login').hide();
    $('#loginForm').attr('disabled', 'disabled');

    $('#host').click(function() {
        userType = 'prof';
        $('#roomSubmit').val('Create');
        $('#login').fadeIn('fast');
        $('#index').hide();
        //$('#chatBar').hide();
        $('#roomName').focus();
        $('#errors').empty();
        $('#errors').hide();
    });

    $('#client').click(function() {
        userType = 'student';
        $('#roomSubmit').val('Join');
        $('#login').fadeIn('fast');
        $('#index').hide();
        $('#roomName').focus();
        $('#errors').empty();
        $('#errors').hide();
    });

    if ($('#roomName').val() === '' || $('#roomPW' === '')) {
        $('#loginForm').attr('disabled', 'disabled');
    }

    $('#loginForm').submit(function() {
        var roomName = $('#roomName').val();
        var roomPW = $('#roomPW').val();
        var roomExists = false;

        if (roomName === '' || roomName.length < 2) {
            $('#errors').empty();
            $('#errors').append('Please enter a room name (Min 2 chars).');
            $('#errors').show();
        } else if (roomPW === '' || roomPW.length < 2) {
            $('#errors').empty();
            $('#errors').append('Please enter a room password (Min 2 chars).');
            $('#errors').show();
        } else {
            if (userType === 'prof') {
                socket.emit('roomExists', roomName, function (data) {
                    roomExists = data;
                    if (roomExists) {
                        $('#errors').empty();
                        $('#errors').append('Room <i>' + roomName + '</i> already exists.');
                        $('#errors').show();
                    } else {
                        socket.emit('hostCreate', roomName, roomPW);
                        $('#mainChat').fadeIn('slow');
                        $('#roomTitle').append(roomName);
                        $('#login').hide();
                        $('#adminMenu').toggle();
                        $('#message').focus();
                    }
                });
            } else if (userType === 'student') {
                socket.emit('roomExists', roomName, function (data) {
                    roomExists = data;
                    if (roomExists) {
                        socket.emit('roomVerify', roomName, roomPW, function (data) {
                            roomVerify = data;
                            if (roomVerify) {
                                socket.emit('clientJoin', prompt('SFU ID?'), roomName, roomPW);
                                $('#mainChat').fadeIn('slow');
                                $('#roomTitle').append(roomName);
                                $('#login').hide();
                                $('#clientMenu').toggle();
                                socket.emit('roomCanTalk', roomName, function (data) {
                                    canTalk = data;
                                    if (canTalk) {
                                        $('#message').focus();
                                    } else {
                                        $('#message').attr('disabled','disabled');
                                        $('#chatlog').append('<b>SERVER:</b> <i>Chat is currently disabled by the Professor.</i><br>');
                                    }
                                });
                                
                            } else {
                                $('#errors').empty();
                                $('#errors').append('Please ensure the password is correct.');
                                $('#errors').show();   
                            }
                        });
                    } else {
                        $('#errors').empty();
                        $('#errors').append('Room <i>' + roomName + '</i> does not exist.');
                        $('#errors').show();
                    }
                });               
            }
        }
    });

    $('#roomName').keypress(function(e){
        var roomName = $('#roomName').val();
        if(roomName.length < 2) {
            $('#loginForm').attr('disabled', 'disabled');
        } else {
            $('#errors').empty();
            $('#errors').hide();
        }
    });

    $('#roomPW').keypress(function(e){
        var roomPW = $('#roomPW').val();
        if(roomPW.length < 2) {
            $('#loginForm').attr('disabled', 'disabled');
        } else {
            $('#errors').empty();
            $('#errors').hide();
            $('#loginForm').removeAttr('disabled');
        }
    });


    //socket.on('connect', function () {
    //    socket.emit('setuser', prompt('What's your name?'));
    //});

    socket.on('cUpdateChat', function (ID, data) {
        $('#chatlog').append('<b>' + ID + ':</b> ' + data + '<br>');
        $('#chatDiv').animate({scrollTop: $('#chatDiv').prop('scrollHeight')}, 500);
    });

    socket.on('cUpdateUsers', function (userNames) {
        $('#users').empty();
        for(i = 0; i < userNames.length; i++) {
            $('#users').append('<div><i>' + userNames[i] + '</i></div>');
        }
    });

    socket.on('hUpdateUsers', function (clients) {
        $('#users').empty();
        for(i =0; i < clients.length; i++) {
            var temp = '<div id="hUser"><i>' + clients[i].name + '</i>' +
                '<span class="btn-group right-align pull-right">' +
            '<button type="button" class="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown">' +
            '<span class="glyphicon glyphicon-chevron-down"></span></button>' +
            '<ul class="dropdown-menu slidedown">' +
                '<li id="idTag"><span class="glyphicon glyphicon-tag">' +
                '</span><span>' + clients[i].stuID + '</span></li>' +
                '<li class="divider"></li>' +
                '<li><a href="#" class="kickUser" data-id=' + clients[i].id + '>' +
                '<span class="glyphicon glyphicon-trash">' +
                '</span><span>Kick User</span></a></li>' + 
                '</ul>' +
            '</span></div>';
            $('#users').append(temp);
            var kickUser = $('.kickUser');
            kickUser.click(kickUserHandler);

        }
    });

    function kickUserHandler () {
        var userID = $(this).data('id');
        socket.emit('hKickUser', userID);
    }

    $('#messageSend').click(function () {
        var msg = {
            message: $('#message').val()
        };
        socket.emit('sendMsg', msg);
        $('#message').val('');
        $('#message').focus();
    });

    $('#message').keypress(function (e) {
        if (e.which == 13) {
            $(this).blur();
            $('#messageSend').focus().click();
        }
    });

    $('#clientExit').click(function () {
        location.reload();
    });
    
    $('#home').click(function () {
        location.reload();
    });

    $('#goBack').click(function () {
        userType = '';
        $('#index').fadeIn('fast');
        $('#mainChat').hide();
        $('#adminMenu').hide();
        $('#clientMenu').hide();
        $('#errors').hide();
        $('#login').hide();
        $('#loginForm')[0].reset();
        $('#loginForm').attr('disabled', 'disabled');
    });

    
    $('#about').click(function () {
        $('#aboutBody').animate({
            //left: "+=50",
            height: "toggle"
          }, 200, function() {
        });
    });

    $('#aboutClose').click(function () {
        $('#aboutBody').animate({
            //left: "+=50",
            height: "toggle"
          }, 200, function() {
        });
    });

    

    //~~~~~ Host
    
    $('#toggleChat').click(function () {
        socket.emit('hChatToggle');
    });
    

    
    $('#toggleOpenMsg').click(function () {
        socket.emit('hOpenMsgToggle');
    });



    $('#hostExit').click(function () {
        var exit = confirm('Do you want to quit? You will disconnect all students currently ' +
                            'connected and the room will be discarded.');
        if (exit) {
            location.reload();
        }
    });


    socket.on('cToggleChat', function (data) {
        result = data;
        if (userType == 'student') {
            if (result) {
                $('#message').removeAttr('disabled');
                $('#chatlog').append('<b>SERVER:</b> <i>Chat has been enabled by the Professor.</i>' + '<br>');
                $('#chatDiv').animate({scrollTop: $('#chatDiv').prop('scrollHeight')}, 500);
            } else {
                $('#message').attr('disabled','disabled');
                $('#chatlog').append('<b>SERVER:</b> <i>Chat has been disabled by the Professor.</i>' + '<br>');
                $('#chatDiv').animate({scrollTop: $('#chatDiv').prop('scrollHeight')}, 500);
            }
        } else {
            if (result) {
                if($('#tcIcon').hasClass('glyphicon-eye-phone-alt')) {
                    $('#tcIcon').removeClass('glyphicon-eye-phone-alt');
                }
                $('#tcIcon').addClass('glyphicon-phone-alt').removeClass('glyphicon-earphone');
                $('#tcTxt').text('');
                $('#tcTxt').append('Disable Chat');
                $('#chatlog').append('<b>SERVER:</b> <i>Student chat has been enabled.</i> <br>');
                $('#chatDiv').animate({scrollTop: $('#chatDiv').prop('scrollHeight')}, 500);
            } else {
                $('#tcIcon').addClass('glyphicon-earphone').removeClass('glyphicon-phone-alt');
                $('#tcTxt').text('');
                $('#tcTxt').append('Enable Chat');
                $('#chatlog').append('<b>SERVER:</b> <i>Student chat has been disabled.</i> <br>');
                $('#chatDiv').animate({scrollTop: $('#chatDiv').prop('scrollHeight')}, 500);
            }
        }
    });

    socket.on('cOpenFloor', function (data) {
        result = data;
        if (userType == 'student') {
            if (result) {
                $('#chatlog').append('<b>SERVER:</b> <i>The Professor has allowed student discussion.</i>' + '<br>');
                $('#chatDiv').animate({scrollTop: $('#chatDiv').prop('scrollHeight')}, 500);
            } else {
                $('#chatlog').append('<b>SERVER:</b> <i>The Professor has disabled student discussion.</i>' + '<br>');
                $('#chatDiv').animate({scrollTop: $('#chatDiv').prop('scrollHeight')}, 500);
            }
        } else {
            if (result) {
                $('#omIcon').addClass('glyphicon-eye-close').removeClass('glyphicon-eye-open');
                $('#omTxt').text('');
                $('#omTxt').append('Close Floor');
                $('#chatlog').append('<b>SERVER:</b> <i>Floor is open for discussion. ' +
                    'Students can see each other\'s messages</i> <br>');
                $('#chatDiv').animate({scrollTop: $('#chatDiv').prop('scrollHeight')}, 500);
            } else {
                $('#omIcon').addClass('glyphicon-eye-open').removeClass('glyphicon-eye-close');
                $('#omTxt').text('');
                $('#omTxt').append('Open Floor');
                $('#chatlog').append('<b>SERVER:</b> <i>Floor is closed. ' +
                    'Students can no longer see each other\'s messages</i> <br>');
                $('#chatDiv').animate({scrollTop: $('#chatDiv').prop('scrollHeight')}, 500);
            }
        }
    });

    socket.on('error', function (error) {
        $('#errors').empty();
        $('#errors').append(error);
        $('#errors').show();
    });

    socket.on('disconnect', function () {
        var roomName = $('#roomName').val();
        $('#index').fadeIn('fast');
        $('#mainChat').hide();
        $('#login').hide();
        $('#adminMenu').hide();
        $('#clientMenu').hide();
        $('#loginForm')[0].reset();
        $('#loginForm').attr('disabled', 'disabled');
        $('#roomTitle').empty();
        $('#chatlog').empty();
        $('#users').empty();
        userType = '';
        socket.socket.reconnect();
    });

});
