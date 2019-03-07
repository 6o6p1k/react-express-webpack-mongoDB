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



function cookArray(obj,callback){
    let arr = [];
    for (var prop in obj) {
        //console.log("obj." + prop + " = " + obj[prop]);
        arr.push({name:prop,sId:obj[prop].sockedId,messages:[],msgCounter:0,typing:false,})
    }
    callback(arr);
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

    io.sockets.on('connection', function (socket) {
        //Global Chat Events
        let username = socket.request.user.username;//req username
        let reqSocketId = socket.id;//req user socket id
        globalChatUsers[username] = {sockedId:reqSocketId};//update global chat users obj
        socket.broadcast.emit('addUsers',{name:username,sId:globalChatUsers[username].sockedId});//send to all users what they must add you
        //console.log('globalChatUsers: ',globalChatUsers);
        //get extended user data
        socket.on('getExtendedUserData', async function (name,cb) {
            console.log('getUserData: ',name);
            if(!globalChatUsers[username]) return cb(new HttpError(401, 'Socket connection err. Please reconnect and try one more.'));
            let {err,user} = await User.findOne({username:name});
            if(err) return (new DevError(500, 'DB err: ' + err));
            if(user) return  cb(user);
        });
        //req to add me to contact list
        socket.on('addMe', async function (data,cb) {
            console.log('addMe: ',data);
            let {errRequesting,userRequesting} = await User.find({username:username});//get requesting user
            let {errRequested,userRequested} = await User.find({username:data.name});//get requested user
            if(errRequesting || errRequested) return cb("Request send filed. No users found named "+ data.name + "&" + username);
            userRequesting.blockedContacts.push(data.name);
            userRequested.blockedContacts.push(username);
            await userRequesting.save();
            await userRequested.save();

            let {errMessage,mes} = await Message.messageHandler({members:[username,data.name]});
            if(errMessage) return cb("Request send filed. Something wrong");
            if(mes.messages.length === 0) {//Save message in DB only one time
                await Message.messageHandler({members:[username,data.name],message:{
                    user: username,
                    text: "Do you want add user name:"+username+" to you contact list?",
                    status: false,
                    date: data.date}});
                if(globalChatUsers[data.name]) {//Send message "Add me to you contact list" if user online
                    socket.broadcast.to(globalChatUsers[data.name].id).emit('addMe', {
                        user: username,
                        text: "Do you want add user name: "+username+" to you contact list?",
                        status: false,
                        date: data.date});
                }
                return cb("Request send successful")
            }else return cb("You always send request. Await then user response you.");
        });
        //res to add me
        socket.on('resAddMe', async function (data,cb) {
            console.log('resAddMe: ',data);
            let {errRequesting,userRequesting} = await User.find({username:username});//get requesting user
            let {errRequested,userRequested} = await User.find({username:data.name});//get requested user
            if(errRequesting || errRequested) return cb("Request send filed. No users found named "+ data.name + "&" + username);
            userRequesting.blockedContacts.filter(itm=> itm === data.name);
            userRequested.blockedContacts.filter(itm=> itm === username);
            userRequesting.contacts.push(data.name);
            userRequested.contacts.push(username);
            await userRequesting.save();
            await userRequested.save();
            if(globalChatUsers[data.name]) {//Send message "Add me to you contact list" if user online
                socket.broadcast.to(globalChatUsers[data.name].id).emit('addMe', {
                    user: username,
                    text: "User name:"+username+" add you for his contact list.",
                    status: false,
                    date: data.date});
            }

            cb("User name"+data.name+"added to you contact list")

        });
        //Add users to contact list
        socket.on('addUsers', async function (data,cb) {
            console.log('addUsers: ',data);

            let {err,user} = await User.userAddToContacts(data);
            if(err) return (new DevError(500, 'DB err: ' + err));
            if(user) return  cb(user);
        });
        //Remuve users to contact list
        socket.on('remUsers', async function (data,cb) {
            console.log('remUsers: ',data);
            let {err,user} = await User.userRemFromContacts(data);
            if(err) return (new DevError(500, 'DB err: ' + err));
            if(user) return  cb(user);
        });
        //Find contacts
        socket.on('findContacts', async function (data,cb) {
            console.log('findContacts: ',data);
            let {err,users} = await User.userFindContacts(data);
            if(err) return (new DevError(500, 'DB err: ' + err));
            if(users) return  cb(users);
        });
        //chat users list cb
        socket.on('getUsers', function (cb) {
            console.log('globalChatUsers: ',globalChatUsers);
            if(!globalChatUsers[username]) return cb(new HttpError(401, 'No user found!'));
            socket.broadcast.emit('addUsers',{name:username,sId:globalChatUsers[username].sockedId});//send to all users what they must add you
            cookArray(globalChatUsers,(arr)=>cb(arr))
        });
        //get history global chat
        socket.on('getGlobalLog', async function (cb) {
            let {err,mes} = await Message.messageHandler({members:"GLOBAL"});
            //console.log("getGlobalLog mes: ",mes,",","err: ",err);
            return cb(mes.messages);
        });
        //chat users history cb
        socket.on('getUserLog', async function (reqUsername,reqMesCountCb,cb) {
            //reqMesCountCb How mach last messages need request
            //for who reqUsername need request
            //console.log('getUserLog reqUsername: ',reqUsername,',','');
            if(!globalChatUsers[reqUsername]) return cb(new HttpError(401, 'User do not connect!'));
            let {err,mes} = await Message.messageHandler({members:[username,reqUsername]});
            if(err) {
                console.log("getUserLog err: ", err);
                return cb([{user:"Admin",text:err}]);
            }else {
                console.log("getUserLog mes: ", mes);
                return cb(mes.messages);
            }
        });
        //chat message typing
        socket.on('typing', function (id) {
            //console.log('typing');
            socket.broadcast.to(id).emit('typing', username);
        });
        //chat message receiver
        socket.on('message', async function (text,id,resToUserName,dateNow, cb) {
            console.log('message text: ',text, 'id: ',id, 'iresToUserName: ',resToUserName, 'dateNow: ',dateNow);
            if (text.length === 0) return;
            if (text.length >= 60) {
                socket.broadcast.emit('message', 'Admin', 'to long message');
                return;
            }
            if (id) {                //append to individual chat log
                console.log('!GC');
                let {err,mes} = await Message.messageHandler({members:[username,resToUserName],message:{ user: username, text: text, status: false, date: dateNow}});
                //console.log("message!GC: ",mes,",","err: ",err);
                socket.broadcast.to(id).emit('message', { user: username, text: text, status: false, date: dateNow});
                cb && cb();
            } else {                //append global chat log
                console.log('GC');
                let {err,mes} = await Message.messageHandler({members:["GLOBAL"],message:{ user: username, text: text, status: false, date: dateNow}});
                //console.log("messageGC: ",mes,",","err: ",err);
                socket.broadcast.emit('messageGlobal', { user: username, text: text, status: false, date: dateNow});
                cb && cb();
            }
 
        });
        // when the user disconnects perform this
        socket.on('disconnect', function () {
            console.log('disconnect username: ',username);
            delete globalChatUsers[username];
            socket.broadcast.emit('remuveUserName',username);//send to all users what they must remuve you
        });
    });

    return io;
};
