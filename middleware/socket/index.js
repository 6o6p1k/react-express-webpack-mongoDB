var config = require('./../../config');
var async = require('async');
var cookie = require('cookie');
var sessionStore = require('./../libs/sessionStore');
var HttpError = require('./../error/index').HttpError;
var DevError = require('./../error/index').DevError;
var User = require('../models/user').User;
var Message = require('../models/user').Message;
var globalChatUsers = {};
var common = require('../common').commonEmitter;




function getConSid(a) {
    var ConSid = '';
    for (var i=0;i<a.length;i++) {
        if(a[i]==':') {
            for (var j=i+1;j<a.length;j++) {
                if(a[j] != '.') {
                    ConSid += a[j];
                    //continue;
                }
                else {return ConSid;};
            }
        }
    }
}

function loadUser(session, callback) {
    if (!session.user) {
        console.log('Session %s is anonymous', session.id);
        return callback(null, null);
    }
    console.log('retrieving user: ', session.user);
    User.findById(session.user, function(err, user) {
        if (err) return callback(err);

        if (!user) {
            return callback(null, null);
        }
        console.log('user found by Id result: ',user);
        callback(null, user);
    });
}

function dateToString(obj){
    let dateMls = obj.date;
    let currentdate = new Date(dateMls);
    obj.date = currentdate.getHours() + ":" + currentdate.getMinutes() + "/" + currentdate.getDate() + ":" + (currentdate.getMonth()+1) + ":" + currentdate.getFullYear();// + ":"+ currentdate.getSeconds();
    return obj;
}


module.exports = function (server) {

    var io = require('socket.io').listen(server);

    function findClientsSocket(roomId, namespace) {
        var res = []
            // the default namespace is "/"
            , ns = io.of(namespace ||"/");

        if (ns) {
            for (var id in ns.connected) {
                if(roomId) {
                    var index = ns.connected[id].rooms.indexOf(roomId);
                    if(index !== -1) {
                        res.push(ns.connected[id]);
                    }
                } else {
                    res.push(ns.connected[id]);
                }
            }
        }
        return res;
    }

    io.set('authorization', function (handshake, callback) {
        handshake.cookies = cookie.parse(handshake.headers.cookie || '');
        var sidCookie = handshake.cookies[config.get('session:key')];
        //console.log('sidCookie: ',sidCookie);
        if (!sidCookie) return callback(JSON.stringify(new HttpError(401, 'No Cookie')));
        let sid = getConSid(sidCookie);
        console.log('authorizationSessionId: ',sid);
        sessionStore.load(sid,(err,session)=>{
            if(err) return callback(new DevError(500, 'Session err: ' + err));
            //console.log('authorization session: ',session,'err: ',err);
            if (!session) return callback(JSON.stringify(new HttpError(401, 'No session')));
            handshake.session = session;
            loadUser(session,(err,user)=>{
                if(err) return callback(JSON.stringify(new DevError(500, 'DB err: ' + err)));
                console.log('loadUser userId: ',user);
                if(!user) return callback(JSON.stringify(new  HttpError(401, 'Anonymous session may not connect')));
                if(globalChatUsers[user.username]) return callback(JSON.stringify(new HttpError(423, 'Locked! You tried to open Chat Page in another tab.')));
                handshake.user = user;
                return callback(null, true);
            });
        });
    });

    common.on('session:reload', function (sid,callback) {
        console.log('session:reloadSid: ',sid);
        var clients = findClientsSocket();
        //console.log('clients: ',clients);
        clients.forEach(function (client) {
            let sidCookie = cookie.parse(client.handshake.headers.cookie);
            //console.log('sidCookie: ',sidCookie);
            let sessionId = getConSid(sidCookie.sid);
            console.log('session:reloadSessionId: ',sessionId);
            if (sessionId !== sid) return;
            sessionStore.load(sid, function (err, session) {
                if (err) {
                    console.log('sessionStore.load err: ',err);
                    //client.emit('error', err);
                    if(err) return callback(err);
                    //client.disconnect();
                }
                if (!session) {
                    console.log('sessionStore.load no session find');
                    client.emit('logout');
                    client.disconnect();
                    return;
                }
                console.log('restore session');
                client.handshake.session = session;
            });
        });
    });

    io.sockets.on('connection', async function (socket) {
        //Global Chat Events
        let username = socket.request.user.username;//req username
        let reqSocketId = socket.id;//req user socket id
        let userDB = await User.findOne({username:username});

        console.log("connection");
        //update global chat users obj
        globalChatUsers[username] = {
            sockedId:reqSocketId,
            contacts:userDB.contacts
        };
        //update UserData
        socket.emit('updateUserData',userDB);

        //req get users from globalChatUsers who online
        socket.on('getUsersOnLine', async function (cb) {
            let contacts = globalChatUsers[username].contacts;
            console.log("getUsersOnLine, username: ",username,", contacts: ",contacts);
            let usersOnLine = contacts.filter(name => globalChatUsers[name]);
            //res for my contacts what Iam onLine
            contacts.forEach((name)=>{
                if(globalChatUsers[name]) socket.broadcast.to(globalChatUsers[name].sockedId).emit('onLine', username);
            });
            cb(usersOnLine);
        });
        //req send for my contacts what Iam onLine
        socket.on('onLine', async function () {
            let contacts = globalChatUsers[username].contacts;
            console.log("onLine, username: ",username,", contacts: ",contacts);
            contacts.forEach((name)=>{
                if(globalChatUsers[name]) socket.broadcast.to(globalChatUsers[name].sockedId).emit('onLine', username);
            })
        });

        //req to add me to contact list
        socket.on('addMe', async function (data,cb) {
            console.log('addMe: ',data);
            let userRG = await User.userATC(username,data.name);//add to contacts
            let userRD = await User.userATBC(data.name,username);//add to blocked contacts
            if(userRG.err) return cb("Request rejected. DB err: "+userRG.err,null);
            if(userRD.err) return cb("Request rejected. DB err: "+userRD.err,null);
            console.log("addMe userRG: ",userRG," ,userRD: ",userRD);
            let {errMessage,mes} = await Message.messageHandler({members:[username,data.name]});
            if(errMessage) {
                console.log("addMe errMessage: ", errMessage);
                return cb("Send message filed. DB err: " + errMessage,null);
            }
            if(mes.messages.length === 0) {//Save message in DB only one time
                await Message.messageHandler({members:[username,data.name],message:{user: username, text: "Please add me to you contact list.", status: false, date: data.date}});
                if(globalChatUsers[data.name]) {//Send message "Add me to you contact list" if user online
                    socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('updateUsers', userRD.user);
                } else return cb(null,userRG.user);
            }else return cb("Request rejected. You always send request. Await then user response you.",null);
        });
        //res to add me
        socket.on('resAddMe', async function (data,cb) {
            console.log('resAddMe: ',data);
            let userRG = await User.userMFBCTC(username,data.name);
            if(userRG.err) return cb("Request rejected. DB err: "+userRG.err,null);
            if(globalChatUsers[data.name]) {//Send message "Add me to you contact list" if user online
                let {err,mes} = await Message.messageHandler({members:[username,data.name],message:{ user: username, text: "I added you to my contact list.", status: false, date: data.date}});
                socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('message', { user: username, text: "I added you to my contact list.", status: false, date: data.date});
                socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('onLine', username);
                cb(null,userRG.user);
                socket.emit('onLine', data.name);
            }else return cb(null,userRG.user);
        });

        //Find contacts
        socket.on('findContacts', async function (data,cb) {
            console.log('findContacts: ',data);
            let {err,users} = await User.userFindContacts(data);
            //console.log('findContacts users: ',users);
            if(err) return console.log("findContacts err:",err);
            if(users) {
                let usersArr = users.map(itm=>itm.username);
                return  cb(usersArr);
            }
        });
        //chat users history cb
        socket.on('getUserLog', async function (reqUsername,reqMesCountCb,cb) {
            console.log("getUserLog reqUsername: ", reqUsername);
            let {err,mes} = await Message.messageHandler({members:[username,reqUsername]});
            if(err) {
                console.log("getUserLog err: ", err);
                return cb(err,null);
            }else {
                console.log("getUserLog mes: ", mes);
                let messages = mes.messages.map((itm)=> dateToString(itm));
                console.log("getUserLog messages: ",messages);
                return cb(null,messages);
            }
        });
        //chat message typing
        socket.on('typing', function (name) {
            //console.log('typing');
            if(!globalChatUsers[name]) return;
            let sid = globalChatUsers[name].sockedId;
            socket.broadcast.to(sid).emit('typing', username);
        });
        //chat message receiver
        socket.on('message', async function (text,resToUserName,dateNow, cb) {
            console.log('message text: ',text, 'resToUserName: ',resToUserName, 'dateNow: ',dateNow);
            if (text.length === 0 || !resToUserName) return;
            if (text.length >= 60) return socket.emit('message', { user: resToUserName, text: "Admin: To long message!", status: false, date: Date.now()});
            let resUser = await User.findOne({username:resToUserName});
            if(!resUser.contacts.includes(username)) {
                console.log('message cancel');
                return socket.emit('message', { user: resToUserName, text: "Admin: user "+resToUserName+" do not add you in his white list!", status: false, date: Date.now()});
            }
            let {err,mes} = await Message.messageHandler({members:[username,resToUserName],message:{ user: username, text: text, status: false, date: dateNow}});
            if(!globalChatUsers[resToUserName]) return;
            let sid = globalChatUsers[resToUserName].sockedId;
            console.log('message text: ',text, 'sid: ',sid, 'resToUserName: ',resToUserName, 'dateNow: ',dateNow);
            socket.broadcast.to(sid).emit('message', { user: username, text: text, status: false, date: dateNow});
            cb && cb();
        });
        // when the user disconnects perform this
        socket.on('disconnect', async function () {
            let contacts = globalChatUsers[username].contacts;
            console.log("disconnect, username: ",username,", contacts: ",contacts);
            //res for my contacts what Iam offLine
            contacts.forEach((name)=>{
                if(globalChatUsers[name]) socket.broadcast.to(globalChatUsers[name].sockedId).emit('offLine', username);
            });
            //del user from globalUsers
            delete globalChatUsers[username];
        });
    });

    return io;
};
