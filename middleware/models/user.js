var AuthError = require('./../error').AuthError;
var crypto = require('crypto');
var mongoose = require(".././libs/mongoose");
var util = require('util');


var user = new mongoose.Schema({
    username: {type: String, unique: true, required: true},//lowercase: true,
    hashedPassword: {type: String, required: true},
    salt: {type: String, required: true},
    created: {type: Date, default: Date.now},
    //email: { type: String, lowercase: true, unique: true },
    contacts: [],
    blockedContacts: [],
    rooms:[]
});
var room = new mongoose.Schema({
    name: { type: String, lowercase: true, unique: true },
    members: [],
    blockedContacts: [],
    created_at: { type: Date, default: Date.now },
});
var message = new mongoose.Schema({
    uniqSig: {type: String, unique: true, required: true},
    members: [],//["userName1","username2"]
    messages: [],//{ author: John, body: 'Hi what's up', status: true, data: Date.now},{ author: Petr, body: 'Nothing out here :(' , status: false, data: Date.now}
});

////Internal methods
function setGetSig(arr) {
    arr.sort();
    return arr[0] + '_' + arr[1];
};

//User methods
user.virtual('password').set(function (password) {
        this._plainPassword = password;
        this.salt = Math.random() + '';
        this.hashedPassword = this.encryptPassword(password);
    });

user.virtual('password').get(function () {
        return this._plainPassword;
    });

user.methods.encryptPassword = function (password) {
    return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
};

user.methods.checkPassword = function (password) {
    return this.encryptPassword(password) === this.hashedPassword;
};


user.statics.userMFCTBC = async function (reqUser,contact) {//MoveFromContactsToBlockedContacts
    let User = this;
    let user = {};
    //console.log('userMFBCTC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        user = await User.findOne({username:reqUser});
        if(user){
            let filteredArr = user.contacts.filter(itm => itm !== contact);//remuve users from Contacts using names from incoming arr
            if(user.blockedContacts.includes(contact)) return {err:"You always moved contact.",user:null};
            user.contacts = filteredArr;//update arr
            user.blockedContacts.push(contact);//add from incoming arr to user contacts
            await user.save();
            return {err:null,user:user};
        }else return ({err:"No user name "+reqUser+" found.",user:null});
    } catch(err) {
        console.log('userMFBCTC err: ',err);
        return {err:err,user:null};
    }
};

user.statics.userMFBCTC = async function (reqUser,contact) {//MoveFromBlockedContactsToContacts
    let User = this;
    let user = {};
    //console.log('userMFBCTC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        user = await User.findOne({username:reqUser});
        if(user){
            let filteredArr = user.blockedContacts.filter(itm=> itm !== contact);//remuve contact
            if(user.contacts.includes(contact)) return {err:"You always send request",user:null};
            user.blockedContacts = filteredArr;//update arr
            user.contacts.push(contact);//add from incoming arr to user contacts
            await user.save();
            return {err:null,user:user};
        }else return ({err:"No user name "+reqUser+" found.",user:null});
    } catch(err) {
        console.log('userMFBCTC err: ',err);
        return {err:err,user:null};
    }
};

user.statics.userATC = async function (reqUser,contact) {//AddToContacts
    let User = this;
    let user = {};
    console.log('userATC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        user = await User.findOne({username:reqUser});
        if(user){
            if(user.contacts.includes(contact)) return ({err:null,user:user});
            user.contacts.push(contact);//add users from incoming arr
            await user.save();
            return ({err:null,user:user});
        }else return ({err:"No user name "+reqUser+" found.",user:null});
    } catch(err) {
        console.log('userATC err: ',err);
        return {err:err,user:null};
    }
};

user.statics.userATBC = async function (reqUser,contact) {//AddToBlockedContacts
    let User = this;
    let user = {};
    console.log('userATBC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        user = await User.findOne({username:reqUser});
        if(user){
            if(user.blockedContacts.includes(contact)) return ({err:null,user:user});
            user.blockedContacts.push(contact);//add users from incoming arr
            await user.save();
            return ({err:null,user:user});
        }else return ({err:"No user name "+reqUser+" found.",user:null});
    } catch(err) {
        console.log('userATBC err: ',err);
        return {err:err,user:null};
    }
};

user.statics.userRFAL = async function (reqUser,contact) {//RemoveFromAllList
    let User = this;
    let user = {};
    console.log('userRFAL userReq: ',reqUser,",","moving contact: ",contact);
    try {
        user = await User.findOne({username:reqUser});
        if(user){
            let filterBC = user.blockedContacts.filter(itm => itm !== contact);//remove from blockedContacts
            let filterC = user.contacts.filter(itm => itm !== contact);//remove from blockedContacts
            user.blockedContacts = filterBC;
            user.contacts = filterC;
            await user.save();
            return {err:null,user:user};
        }else return ({err:"No user name "+reqUser+" found.",user:null});
    } catch(err) {
        console.log('userATBC err: ',err);
        return {err:err,user:null};
    }
};

user.statics.userFindContacts = async function (nameString) {
    let User = this;
    let users = [];
    let err = {};
    console.log('userFindContacts data: ',nameString);
    try {
        users = await User.find( { "username": { "$regex": nameString, "$options": "i" } } );
        console.log('userFindContacts data users: ',users);
        return {err:null,users:users};
    } catch(err) {
        console.log('userFindContacts err: ',err);
        return {err:err,user:null};
    }
};

user.statics.findOneAndCheckPass = async function (data) {
    let User = this;
    let user = {};
    let err = {};
    console.log('findOneAndCheckPass data: ',data);
    try {
        user = await User.findOne({username: data.username});
        if(user.checkPassword(data.password)) {
            return {err:null,user:user};
        } else {
            err = new AuthError("Password is incorrect");
            console.log('user.err: ',err);
            return {err:err,user:null};
        }

    } catch(err) {
        console.log('findOneAndCheckPass err: ',err);
        return {err:err,user:null};
    }

};

user.statics.authorize = async function(paramAuth) {
    let User = this;
    let user = {};
    let err = {};
    try {
        user = await User.findOne({username: paramAuth.username});
        console.log('async user:',user);
        if (user) {
            if(user.checkPassword(paramAuth.password)) {
                return {err:null,user:user};
            } else {
                err = new AuthError("Password is incorrect");
                console.log('user.err: ',err);
                return {err:err,user:null};
            }
        } else {
            err = new AuthError("User not found! ");
            console.log('user.err: ',err);
            return {err:err,user:null};
        }
    } catch (err) {
        console.log('authorize err: ',err);
        return {err:err,user:null};
    }
};

user.statics.changeData = async function(paramAuth) {
    let User = this;
    let user = {};
    let err = {};
    try {
        user = await User.findOne({username: paramAuth.oldUsername});
        console.log('async changeData user:',user);
        if (user) {
            if(user.checkPassword(paramAuth.oldPassword)) {
                user.username = paramAuth.newUsername;
                user.password = paramAuth.newPassword;
                await user.save();
                return {err:null,user:user};
            } else {
                err = new AuthError("Password is incorrect");
                console.log('user.err: ',err);
                return {err:err,user:null};
            }
        } else {
            err = new AuthError("Old Username is incorrect");
            console.log('user.err: ',err);
            return {err:err,user:null};
        }
    } catch (err) {
        console.log('changeData err: ',err);
        return {err:err,user:null};
    }
};
//
//message methods
message.statics.messageHandler = async function (data) {
    var Message = this;
    let mes = {};
    let err = {};
    let sig = setGetSig(data.members);
    console.log('DB messageHandler: ',data);
    try {
        mes = await Message.findOne({uniqSig:sig});
        if(data.message) {//write data
            if(mes){
                mes.messages.push(data.message);
                await mes.save();
                return {err:null,mes:mes};
            }else {
                mes = new Message({uniqSig:sig,messages:[data.message],members:data.members});
                await mes.save();
                return {err:null,mes:mes};
            }
        }else {//read data
            if(!mes) {
                mes = new Message({uniqSig:sig,messages:[],members:data.members});
                await mes.save();
                return {err:null,mes:mes};
            }else {
                return {err:null,mes:mes};
            }
        }
    } catch(err) {
        console.log('messageHandlerGlobalChat err: ',err);
        return {err:err,user:null};
    }
};

message.statics.roomMessageHandler = async function (data) {
    var Message = this;
    let mes = {};
    let err = {};

    console.log('DB roomMessageHandler: ',data);
    try {
        mes = await Message.findOne({uniqSig:data.roomName});
        console.log("message.statics.roomMessageHandler mes: ", mes);
        if(data.message) {//write data
            if(mes){
                mes.messages.push(data.message);
                if(!mes.members.includes(data.message.user)) mes.members.push(data.message.user);
                await mes.save();
                return {err:null,mes:mes};
            }else {
                mes = new Message({uniqSig:data.roomName,messages:[data.message]});
                await mes.save();
                return {err:null,mes:mes};
            }
        }else {//read data
            if(!mes) {
                mes = new Message({uniqSig:data.roomName,messages:[]});
                await mes.save();
                return {err:null,mes:mes};
            }else {
                return {err:null,mes:mes};
            }
        }
    } catch(err) {
        console.log('messageHandlerGlobalChat err: ',err);
        return {err:err,user:null};
    }
};
//
//room methods
var User = mongoose.model('User', user);

room.statics.createRoom = async function(roomName,username) {//create new room and push roomName to user room list
    let Room = this;
    let room = {};
    let err = {};
    try {
        let user = await User.findOne({username:username});
        room = await Room.findOne({name:roomName});
        if(!room){
            room = new Room({name:roomName});
            user.rooms.push(roomName);//
            room.members.push({name:username,enable:true,admin:true});
            await room.save();
            await user.save();
            return {err:null,room:room,user:user}
        }else{
            return {err:"Room name: "+roomName+" always exist. Choose another room name.",room:null,user:null};
        }
    } catch (err) {
        console.log('Create room err: ',err);
        return {err:err,room:null,user:null};
    }
};
//invite user to room
room.statics.inviteUserToRoom = async function(roomName,invited) {
    let Room = this;
    let err = {};
    try {
        let user = await User.findOne({username:invited});
        let room = await Room.findOne({name:roomName});
        if(room.members.find(itm => itm.name === invited) === undefined) return {err:"User name "+invited+" always included in room.",room:null,user:null};
        if(room.blockedContacts.find(itm => itm.name === invited) === undefined) return {err:"User name "+invited+" included in ban list.",room:null,user:null};
        if(user.blockedContacts.includes(roomName)) return {err:"Group name "+roomName+" included in ban list.",room:null,user:null};
        user.rooms.push(roomName);
        room.members.push({name:invited,enable:true,admin:false});
        await user.save();
        await room.save();
        return {err:null,room:room,user:user};
    } catch (err) {
        console.log('Create room err: ',err);
        return {err:err,room:null,user:null};
    }
};
//leave  room
room.statics.leaveRoom = async function(roomName,name) {
    let Room = this;
    let err = {};
    try {
        let user = await User.findOne({username:name});
        let room = await Room.findOne({name:roomName});
        if(room.members.find(itm => itm.name === name).admin === true) return {err:"You can not leave the group. You are is admin.",room:null,user:null};
        let filterUserRooms = user.rooms.filter(itm => itm !== roomName);
        let filterMemberRoom = room.members.filter(itm => itm.name !== name);
        user.rooms = filterUserRooms;
        room.members = filterMemberRoom;
        await user.save();
        await room.save();
        return {err:null,room:room,user:user};
    } catch (err) {
        console.log('Create room err: ',err);
        return {err:err,room:null,user:user};
    }
};
//delete  room
room.statics.deleteRoom = async function(roomName,name) {
    let Room = this;
    let err = {};
    try {
        let user = await User.findOne({username:name});
        let room = await Room.findOne({name:roomName});
        if(room.members.find(itm => itm.name === name).admin === false) return {err:"You can not delete the group. You are is not admin.",user:null};
        let filterUserRooms = user.rooms.filter(itm => itm !== roomName);
        user.rooms = filterUserRooms;
        await Room.deleteOne({name:roomName});
        await user.save();
        return {err:null,user:user};
    } catch (err) {
        console.log('Create room err: ',err);
        return {err:err,user:null};
    }
};
//
module.exports.User = mongoose.model('User', user);
module.exports.Room = mongoose.model('Room', room);
module.exports.Message = mongoose.model('Message', message);





