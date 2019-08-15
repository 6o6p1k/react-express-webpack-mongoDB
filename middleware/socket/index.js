var config = require('./../../config');
var cookie = require('cookie');
var sessionStore = require('./../libs/sessionStore');
var HttpError = require('./../error/index').HttpError;
var DevError = require('./../error/index').DevError;
var User = require('../models/user').User;
var Message = require('../models/user').Message;
var Room = require('../models/user').Room;
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
        //console.log('Session %s is anonymous', session.id);
        return callback(null, null);
    }
    //console.log('retrieving user: ', session.user);
    User.findById(session.user, function(err, user) {
        if (err) return callback(err);

        if (!user) {
            return callback(null, null);
        }
        //console.log('user found by Id result: ',user);
        callback(null, user);
    });
}

async function asyncIncludes(arr, chkItm) {
    for (itm of arr) {
        if(itm === chkItm) return true;
    }
    return false;
}

async function aggregateUserData(username) {
    try {
        let userData = await User.findOne({username:username});
        let contacts = userData.contacts;
        let blockedContacts = userData.blockedContacts;
        let rooms = userData.rooms;
        let wL = contacts.map(async (name,i) =>{
            let status = !!globalChatUsers[name];
            let nameUserDB = await User.findOne({username:name});
            let banned = nameUserDB.blockedContacts.includes(username);
            let authorized =  !(!nameUserDB.contacts.includes(username) && !nameUserDB.blockedContacts.includes(username));
            let {err,mes} = await Message.messageHandler({members:[username,name]});
            let col = mes.messages.filter(itm => itm.status === false && itm.user !== username).length;
            return contacts[i] = {name:name,  msgCounter :col, allMesCounter: mes.messages.length, typing:false, onLine:status, banned:banned, authorized:authorized, created_at:nameUserDB.created, userId:nameUserDB._id}
        });
        let bL = blockedContacts.map(async (name,i) =>{
            let status = !!globalChatUsers[name];
            let nameUserDB = await User.findOne({username:name});
            let banned = nameUserDB.blockedContacts.includes(username);
            let authorized =  !(!nameUserDB.contacts.includes(username) && !nameUserDB.blockedContacts.includes(username));
            let {err,mes} = await Message.messageHandler({members:[username,name]});
            let col = mes.messages.filter(itm => itm.status === false && itm.user !== username).length;
            return blockedContacts[i] = {name:name, msgCounter :col, allMesCounter: mes.messages.length,typing:false, onLine:status, banned:banned, authorized:authorized, created_at:nameUserDB.created, userId:nameUserDB._id}
        });
        let rL = rooms.map(async (name,i) =>{
            let room = await Room.findOne({name:name});
            let {err,mes} = await Message.roomMessageHandler({roomName:name});
            let col = 0;
            for(let itm of mes.messages) {
                if (itm.user === username || itm.status) continue;
                if(!(await asyncIncludes(itm.statusCheckArr, username))) col +=1;
            }
            return rooms[i] = {name:name, msgCounter :col, allMesCounter: mes.messages.length,members:room.members,blockedContacts:room.blockedContacts,created_at:room.created_at, groupId:room._id}
        });
        userData.contacts = await Promise.all(wL);
        userData.blockedContacts = await Promise.all(bL);
        userData.rooms = await Promise.all(rL);
        return userData;
    } catch (err) {
        console.log("aggregateUserData err: ",err)
    }
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
        //console.log('authorizationSessionId: ',sid);
        sessionStore.load(sid,(err,session)=>{
            if(err) return callback(new DevError(500, 'Session err: ' + err));
            //console.log('authorization session: ',session,'err: ',err);
            if (!session) return callback(JSON.stringify(new HttpError(401, 'No session')));
            handshake.session = session;
            loadUser(session,(err,user)=>{
                if(err) return callback(JSON.stringify(new DevError(500, 'DB err: ' + err)));
                //console.log('loadUser userId: ',user);
                if(!user) return callback(JSON.stringify(new  HttpError(401, 'Anonymous session may not connect')));
                if(globalChatUsers[user.username]) {
                    console.log("multiChatConnection");
                    delete globalChatUsers[user.username];
                    return callback(JSON.stringify(new HttpError(423, 'Locked! You tried to open Chat Page in another tab.')));
                }
                handshake.user = user;
                return callback(null, true);
            });
        });
    });

    common.on('session:reload', function (sid,callback) {
        //console.log('session:reloadSid: ',sid);
        var clients = findClientsSocket();
        //console.log('clients: ',clients);
        clients.forEach(function (client) {
            let sidCookie = cookie.parse(client.handshake.headers.cookie);
            //console.log('sidCookie: ',sidCookie);
            let sessionId = getConSid(sidCookie.sid);
            //console.log('session:reloadSessionId: ',sessionId);
            if (sessionId !== sid) return;
            sessionStore.load(sid, function (err, session) {
                if (err) {
                    //console.log('sessionStore.load err: ',err);
                    //client.emit('error', err);
                    if(err) return callback(err);
                    //client.disconnect();
                }
                if (!session) {
                    //console.log('sessionStore.load no session find');
                    client.emit('logout');
                    client.disconnect();
                    return;
                }
                //console.log('restore session');
                client.handshake.session = session;
            });
        });
    });

    io.sockets.on('connection', async function (socket) {
        //Global Chat Events
        let username = socket.request.user.username;//req username
        let reqSocketId = socket.id;//req user socket id
        const userDB = await User.findOne({username:username});
        //console.log("connection");
        //update global chat users obj
        globalChatUsers[username] = {
            sockedId:reqSocketId,
            contacts:userDB.contacts, //use only for username otherwise the data may not be updated.
            blockedContacts:userDB.blockedContacts, //use only for username otherwise the data may not be updated.
        };
        //update UserData
        socket.emit('updateUserData',await aggregateUserData(username));
        //move to black list
        socket.on('banUser', async function (data,cb) {
            try {
                console.log("banUser name:" ,data.name);
                let userRG = await User.userMFCTBC(username,data.name);//move to blockedContacts
                if(userRG.err) return cb("Move user to black list filed. DB err: " + userRG.err,null);
                let {err,mes} = await Message.messageHandler({members:[username,data.name],message:{ user: username, text: "I added you to my black list.", status: false, date: data.date}});
                let idx = mes.messages[mes.messages.length-1]._id;
                let mesg = {_id:idx,  user: username, text: "I added you to my black list.", status: false, date: data.date};
                if(globalChatUsers[data.name]) {
                    socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('updateUserData',await aggregateUserData(data.name));//update user data
                    socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('message',mesg);
                }
                cb(null,await aggregateUserData(username),mesg);
            } catch (err) {
                console.log("banUser err: ",err);
            }
        });
        //move to white list
        socket.on('unBanUser', async function (data,cb) {
            try {
                console.log("unBanUser name:" ,data.name);
                let userRG = await User.userMFBCTC(username,data.name);//move to Contacts
                if(userRG.err) return cb("Move user to black list filed. DB err: " + userRG.err,null);
                let {err,mes} = await Message.messageHandler({members:[username,data.name],message:{ user: username, text: "I added you to my contact list.", status: false, date: data.date}});
                let idx = mes.messages[mes.messages.length-1]._id;
                let mesg = {_id:idx, user: username, text: "I added you to my contact list.", status: false, date: data.date};
                if(globalChatUsers[data.name]) {
                    socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('updateUserData',await aggregateUserData(data.name));//update user data
                    socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('message',mesg);
                }
                cb(null,await aggregateUserData(username),mesg);
            } catch (err) {
                console.log("unBanUser err: ",err);
            }
        });
        //remove completely
        socket.on('deleteUser', async function (data,cb) {
            try {
                console.log("deleteUser name:" ,data);
                let userRG = await User.userRFAL(username,data.name);//remove from contacts & blockedContact
                console.log("deleteUser userRG.user:" ,userRG.user);
                if(userRG.err) return cb("Delete user filed. DB err: " + userRG.err,null);
                let {err,mes} = await Message.messageHandler({members:[username,data.name],message:{ user: username, text: "I deleted you from my contact list.", status: false, date: data.date}});
                let idx = mes.messages[mes.messages.length-1]._id;
                if(globalChatUsers[data.name]) {
                    socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('updateUserData',await aggregateUserData(data.name));//update user data
                    socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('message', {_id:idx, user: username, text: "I deleted you from my contact list.", status: false, date: data.date});
                    cb(null,await aggregateUserData(username));
                } else cb(null,await aggregateUserData(username));
            } catch (err) {
                console.log("deleteUser err: ",err);
            }
        });
        //check user online
        socket.on('checkOnLine', function (name,cb) {
            cb(!!globalChatUsers[name]);
        });
        //req show me online
        socket.on('sayOnLine', function () {
            console.log('sayOnLine');
            if(!globalChatUsers[username]) return;
            let contacts = globalChatUsers[username].contacts;
            let blockedContacts = globalChatUsers[username].blockedContacts;
            console.log("sayOnLine, username: ",username,", contacts: ",contacts,", blockedContacts: ",blockedContacts);
            //res for my contacts what Iam onLine
            contacts.concat(blockedContacts).forEach((name)=>{
                if(globalChatUsers[name]) socket.broadcast.to(globalChatUsers[name].sockedId).emit('onLine', username);
            });
        });
        //req show me offLine
        socket.on('sayOffLine', function () {
            console.log('sayOffLine');
            let contacts = globalChatUsers[username].contacts;
            let blockedContacts = globalChatUsers[username].blockedContacts;
            console.log("sayOffLine, username: ",username,", contacts: ",contacts,", blockedContacts: ",blockedContacts);
            //res for my contacts what Iam onLine
            contacts.concat(blockedContacts).forEach((name)=>{
                if(globalChatUsers[name]) socket.broadcast.to(globalChatUsers[name].sockedId).emit('offLine', username);
            });
        });
        //req to add me to contact list
        socket.on('addMe', async function (data,cb) {
            try {
                console.log('addMe: ',data);
                let userRG = await User.userATC(username,data.name);//add to contacts
                let userRD = await User.userATBC(data.name,username);//add to blocked contacts
                if(userRG.err) return cb("Request rejected. DB err: "+userRG.err,null);
                if(userRD.err) return cb("Request rejected. DB err: "+userRD.err,null);
                let {err,mes} = await Message.messageHandler({members:[username,data.name]});
                if(err) return cb("Send message filed. DB err: " + err,null);
                if(mes.messages[mes.messages.length-1] !== "Please add me to you contact list." || mes.messages.length === 0) {//Save message in DB if last !== "Please add me to you contact list." || len == 0
                    let {err,mes} = await Message.messageHandler({members:[username,data.name],message:{user: username, text: "Please add me to you contact list.", status: false, date: data.date}});
                    let idx = mes.messages[mes.messages.length-1]._id;
                    let mesg = {_id:idx, user: username, text: "Please add me to you contact list.", status: false, date: data.date};
                    if(globalChatUsers[data.name]) {//Send message "Add me to you contact list" if user online
                        socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('updateUserData',await aggregateUserData(data.name));
                        socket.broadcast.to(globalChatUsers[data.name].sockedId).emit('message',mesg);
                    }
                    cb(null,await aggregateUserData(username),mesg);
                }else cb("Request rejected. You always send request. Await then user response you.",null);
            } catch (err) {
                console.log("addMe err: ",err);
            }
        });
        //Find contacts
        socket.on('findContacts', async function (data,cb) {
            //console.log('findContacts: ',data);
            let {err,users} = await User.userFindContacts(data);
            if(err) {
                console.log("findContacts err:",err);
                return cb(err,null)
            } else {
                let usersArr = users.map(itm=>itm.username).filter(name => name !== username);
                return  cb(null,usersArr);
            }
        });
        //Check contact
        socket.on('checkContact', async function (data,cb) {
            console.log('checkContact: ',data);
            let user = await User.findOne({username:data}) || await User.findOne({_id:data});
            if(user) {
                return cb(user.username);
            } else return cb(null)
        });
        //chat users history cb
        socket.on('getUserLog', async function (reqUsername,reqMesCountCb,cb) {
            try {
                console.log("getUserLog reqUsername: ", reqUsername," ,reqMesCountCb: ",reqMesCountCb);
                let {err,mes} = await Message.messageHandler({members:[username,reqUsername]});
                if(reqMesCountCb) {
                    let beginInx = mes.messages.length - reqMesCountCb < 0 ? 0 : mes.messages.length - reqMesCountCb;
                    var cutMes = mes.messages.slice(beginInx)
                }
                if(err) {
                    return cb(err,null);
                }else {
                    return cb(null,cutMes ? cutMes : mes.messages);
                }
            } catch (err) {
                console.log("getUserLog err: ",err);
            }
        });
        //setMesStatus
        function setGetSig(arr) {
            arr.sort();
            return arr[0] + '_' + arr[1];
        }
        socket.on('setMesStatus',async function (idx,reqUsername,cb) {
            try {
                console.log("setMesStatus: indexArr: ",idx," ,reqUsername: ",reqUsername);
                let mes = await Message.findOne({uniqSig:setGetSig([username,reqUsername])});
                let currentMes = mes.messages.id(idx);
                if(currentMes.status === true) return;
                currentMes.status = true;
                await mes.save();
                if(globalChatUsers[reqUsername]) socket.broadcast.to(globalChatUsers[reqUsername].sockedId).emit('updateMsgStatus',username,idx,currentMes.status);
                cb(null);
            } catch (err) {
                console.log("setMesStatus err: ",err);
            }
        });
        //setRoomMesStatus
        socket.on('setRoomMesStatus',async function (idx,reqRoom,cb) {
            try {
                console.log("setRoomMesStatus: indexArr: ",idx," ,reqRoom: ",reqRoom," ,username: ",username);
                let mes = await Message.findOne({uniqSig:reqRoom});
                let currentMes = mes.messages.id(idx);
                if(currentMes.user === username) return;
                if(currentMes.status === true || currentMes.statusCheckArr.includes(username)) return cb(null);
                currentMes.statusCheckArr.push(username);
                await Message.findOneAndUpdate({uniqSig:reqRoom ,"messages._id": idx},{"messages.$.statusCheckArr" : currentMes.statusCheckArr});
                if(currentMes.statusCheckArr.length === mes.members.length - 1) {
                    currentMes.status = true;
                    currentMes.statusCheckArr = [];
                    await Message.findOneAndUpdate({uniqSig:reqRoom ,"messages._id": idx},{"messages.$.statusCheckArr" : [],"messages.$.status" : true});
                }
                for (let name of mes.members) {
                    if(globalChatUsers[name] && name !== username) {
                        socket.broadcast.to(globalChatUsers[name].sockedId).emit('updateMsgStatus',reqRoom,idx,currentMes.statusCheckArr.length !== 0 ? currentMes.statusCheckArr : currentMes.status);
                    }
                }
                cb(null);
            } catch (err) {
                console.log("setRoomMesStatus err: ",err);
            }
        });
        //chat message typing
        socket.on('typing', function (name) {
            if(!globalChatUsers[name]) return;
            let sid = globalChatUsers[name].sockedId;
            socket.broadcast.to(sid).emit('typing', username);
        });
        //chat message receiver
        socket.on('message', async function (text,resToUserName,dateNow,cb) {
            try {
                console.log('message');
                if (text.length === 0 || !resToUserName) return;
                if (text.length >= 60) return socket.emit('message', { user: "Admin", text: "To long message!", status: false, date: Date.now()});
                let resUser = await User.findOne({username:resToUserName});
                if(globalChatUsers[username].blockedContacts.includes(resToUserName)) return socket.emit('message', { user: resToUserName, text: "Admin: You can not write to baned users.", status: false, date: Date.now()});
                if(!resUser.contacts.includes(username)) return socket.emit('message', { user: resToUserName, text: "Admin: user "+resToUserName+" do not add you in his white list!", status: false, date: Date.now()});
                let {err,mes} = await Message.messageHandler({members:[username,resToUserName],message:{ user: username, text: text, status: false, date: dateNow}});
                let idx = mes.messages[mes.messages.length-1]._id;
                if(!globalChatUsers[resToUserName]) return cb && cb(idx);
                let sid = globalChatUsers[resToUserName].sockedId;
                socket.broadcast.to(sid).emit('message', {_id:idx, user: username, text: text, status: false, date: dateNow});
                cb && cb(idx);
            } catch (err) {
                console.log("message err: ",err);
            }
        });
        //room events
        //create new room
        socket.on('createRoom', async function  (roomName,dateNow,cb) {
            try {
                console.log('createRoom: ',roomName);
                let {err,room,user} = await Room.createRoom(roomName,username);
                if(err) {
                    return cb(err,null)
                } else {
                    let {err,mes} = await Message.roomMessageHandler({roomName:roomName,message:{ user: username, text: username+" created a new group "+roomName+".", status: false, date: dateNow}});
                    return cb(null,await aggregateUserData(username))
                }
            } catch (err) {
                console.log("createRoom err: ",err);
            }
        });
        //invite users to room
        socket.on('inviteUserToRoom', async function  (roomName,invitedUser,dateNow,cb) {
            try {
                console.log('inviteUserToRoom: ',roomName);
                let {err,room,user} = await Room.inviteUserToRoom(roomName,invitedUser);
                if(err) {
                    return cb(err,null)
                } else {
                    let {err,mes} = await Message.roomMessageHandler({roomName:roomName,message:{ user: username, text: username+" added new user "+invitedUser+".", status: false, date: dateNow}});
                    let idx = mes.messages[mes.messages.length-1]._id;
                    let mesg = {_id:idx,room:roomName,user:username, text: username+" added new user "+invitedUser+".", status: false, date: dateNow};
                    if(globalChatUsers[invitedUser]) socket.broadcast.to(globalChatUsers[invitedUser].sockedId).emit('updateUserData',await aggregateUserData(invitedUser));
                    for (let itm of room.members) {
                        if(globalChatUsers[itm.name]) {
                            socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('updateUserData',await aggregateUserData(itm.name));
                            socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('messageRoom',mesg);
                        }
                    }
                    cb(null,await aggregateUserData(username),mesg)
                }
            } catch (err) {
                console.log("inviteUserToRoom err: ",err);
            }
        });
        //leave room
        socket.on('leaveRoom', async function  (roomName,dateNow,cb) {
            try {
                console.log("leaveRoom: ",roomName);
                let {err,room,user} = await Room.leaveRoom(roomName,username);
                if(!room) return cb(null,await aggregateUserData(username))
                if(err) {
                    console.log('leaveRoom err: ',err);
                    return cb(err,null)
                }
                else {
                    let {err,mes} = await Message.roomMessageHandler({roomName:roomName,message:{ user: username, text: username+" left the group.", status: false, date: dateNow}});
                    let idx = mes.messages[mes.messages.length-1]._id;
                    for (let itm of room.members) {
                        if(globalChatUsers[itm.name]) {
                            socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('updateUserData',await aggregateUserData(itm.name));
                            socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('messageRoom',{_id:idx, room:roomName, user:username, text: username+" left the group.", status: false, date: dateNow,
                            });
                        }
                    }
                    cb(null,await aggregateUserData(username))
                }
            } catch (err) {
                console.log("leaveRoom err: ",err);
            }
        });
        //get room log
        socket.on('getRoomLog', async function  (roomName,reqMesCountCb,cb) {
            try {
                console.log("getRoomLog: ",roomName);
                let room = await Room.findOne({name:roomName});
                if(!room) return cb("Error Group do not exist!",null);
                if(room.blockedContacts.some(itm => itm.name === username)) return cb("You have been included in the block list. Message history is no longer available to you.",null);
                if(!room.members.some(itm => itm.name === username)) return cb("You are not a member of the group.",null);
                let {err,mes} = await Message.roomMessageHandler({roomName:roomName});
                if(reqMesCountCb) {
                    let beginInx = mes.messages.length - reqMesCountCb < 0 ? 0 : mes.messages.length - reqMesCountCb;
                    var cutMes = mes.messages.slice(beginInx)
                }
                if(err) {
                    return cb(err,null)
                } else cb(null,cutMes ? cutMes : mes.messages);
            } catch (err) {
                console.log("getRoomLog err: ",err);
            }
        });
        //room message handler
        socket.on('messageRoom', async function  (text,roomName,dateNow,cb) {
            try {
                console.log('messageRoom text: ',text, 'roomName: ',roomName, 'dateNow: ',dateNow);
                if (text.length === 0) return;
                if (text.length >= 60) return socket.emit('messageRoom', { room:roomName,user: "Admin", text: "To long message.", status: false, date: Date.now()});
                let room = await Room.findOne({name:roomName});
                if(!room.members.some(itm => itm.name === username)) return socket.emit('messageRoom', {room:roomName, user: "Admin", text: "You are not a member of the group.", status: false, date: Date.now()});
                if(room.blockedContacts.some(itm => itm.name === username)) return socket.emit('messageRoom', {room:roomName, user: "Admin", text: "You have been included in the block list. Send messages to you is no longer available.", status: false, date: Date.now()});
                let {err,mes} = await Message.roomMessageHandler({roomName:roomName,message:{ user: username, text: text, status: false, date: dateNow}});
                let idx = mes.messages[mes.messages.length-1]._id;
                room.members.forEach(itm =>{
                    if(globalChatUsers[itm.name]) socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('messageRoom',{_id:idx, room:roomName, user:username, text: text, status: false, date: dateNow,});
                });
                cb && cb(idx);
            } catch (err) {
                console.log("messageRoom err: ",err);
            }
        });
        //block user in room
        //UnDoing FE
        socket.on('blockRoomUser', async function  (roomName,bannedUser,dateNow,cb) {
            try {
                console.log('blockRoomUser roomName: ',roomName," ,bannedUser: ",bannedUser);
                let {err,room} = await Room.blockUserInRoom(roomName,username,bannedUser);
                if(err) {
                    return cb(err,null)
                } else {
                    let {err,mes} = await Message.roomMessageHandler({roomName:roomName,message:{user:username,text:"The group administrator "+username+" has added user "+bannedUser+" to the block list.",status: false,date: dateNow}});
                    let idx = mes.messages[mes.messages.length-1]._id;
                    let mesg = {_id:idx,room:roomName, user:username, text: "The group administrator "+username+" has added user "+bannedUser+" to the block list.", status: false, date: dateNow};
                    for (let itm of room.members){
                        if(globalChatUsers[itm.name]) {
                            socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('updateUserData',await aggregateUserData(itm.name));
                            socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('messageRoom',mesg);
                        }
                    }
                    cb(null,await aggregateUserData(username),mesg)
                }
            } catch (err) {
                console.log("blockRoomUser err: ",err);
            }
        });
        //unblock user in room
        socket.on('unBlockRoomUser', async function  (roomName,unbannedUser,dateNow,cb) {
            try {
                console.log('unBlockRoomUser roomName: ',roomName," ,bannedUser: ",unbannedUser);
                let {err,room} = await Room.unblockUserInRoom(roomName,username,unbannedUser);
                if(err) {
                    return cb(err,null)
                } else {
                    let {err,mes} = await Message.roomMessageHandler({roomName:roomName,message:{ user: username, text: "The group administrator "+username+" has removed user "+unbannedUser+" from the block list.", status: false, date: dateNow}});
                    let idx = mes.messages[mes.messages.length-1]._id;
                    let mesg = {_id:idx, room:roomName, user:username, text: "The group administrator "+username+" has removed user "+unbannedUser+" from the block list.", status: false, date: dateNow};
                    for (let itm of room.members){
                        if(globalChatUsers[itm.name]) {
                            socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('updateUserData',await aggregateUserData(itm.name));
                            socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('messageRoom',mesg);
                        }
                    }
                    cb(null,await aggregateUserData(username),mesg)
                }
            } catch (err) {
                console.log("unBlockRoomUser err: ",err);
            }
        });
        //set room admin
        socket.on('setRoomAdmin', async function  (roomName,newAdminName,dateNow,cb) {
            try {
                console.log('setRoomAdmin roomName: ',roomName," ,userName: ",newAdminName);
                let {err,room} = await Room.setAdminInRoom(roomName,username,newAdminName);
                if(err) {
                    return cb(err,null)
                } else {
                    let {err,mes} = await Message.roomMessageHandler({roomName:roomName,message:{ user: username, text: username+" has appointed "+newAdminName+" a new administrator.", status: false, date: dateNow}});
                    let idx = mes.messages[mes.messages.length-1]._id;
                    let mesg = {_id:idx, room:roomName, user:username, text: username+" has appointed "+newAdminName+" a new administrator.", status: false, date: dateNow};
                    for (let itm of room.members){
                        if(globalChatUsers[itm.name]) {
                            socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('updateUserData',await aggregateUserData(itm.name));
                            socket.broadcast.to(globalChatUsers[itm.name].sockedId).emit('messageRoom',mesg);
                        }
                    }
                    cb(null,await aggregateUserData(username),mesg)
                }
            } catch (err) {
                console.log("setRoomAdmin err: ",err);
            }
        });
        //enable/disable notification
        socket.on('changeNtfStatus', async function  (roomName,userName,cb) {
            try {
                console.log('changeNtfStatus roomName: ',roomName," ,userName: ",userName);
                let room = await Room.findOne({name:roomName});
                if(!room.members.some(itm => itm.name === userName) || room.blockedContacts.some(itm => itm.name === userName)) {
                    return cb("You are not a member of this group or you are on the block list.",null);
                }
                let idx = room.members.find(itm => itm.name === userName)._id;
                let statusNot = room.members.find(itm => itm.name === userName).enable;
                room = await Room.findOneAndUpdate({name:roomName ,"members._id": idx},{"members.$.enable" : !statusNot});
                console.log("changeNtfStatus room: ",room);
                cb(null,await aggregateUserData(username))
            } catch (err) {
                console.log("setRoomAdmin err: ",err);
            }
        });

        //
        // when the user disconnects perform this
        socket.on('disconnect', async function () {
            try {
                let contacts = globalChatUsers[username].contacts || await User.findOne({username:username}).contacts;
                let blockedContacts = globalChatUsers[username].blockedContacts || await User.findOne({username:username}).blockedContacts;
                console.log("disconnect, username: ",username,", contacts: ",contacts);
                //res for my contacts what Iam offLine
                contacts.concat(blockedContacts).forEach((name)=>{
                    if(globalChatUsers[name]) socket.broadcast.to(globalChatUsers[name].sockedId).emit('offLine', username);
                });
                //del user from globalUsers
                delete globalChatUsers[username];
            } catch (err) {
                console.log("disconnect err: ",err);
            }
        });
    });
    return io;
};


