var AuthError = require('../../error/index').AuthError;
var CryptoJS = require('crypto-js');
var util = require('util');
const Sequelize = require('sequelize');
const config = require('../../../config');
let pgConf = config.get('pg');
const sequelize = new Sequelize(pgConf.database,pgConf.username, pgConf.password, {
    host: 'localhost',
    dialect: 'postgres',
});
const { Op } = require("sequelize");

const User = sequelize.define('user', {
    _id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true
    },
    username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: Sequelize.VIRTUAL,
        set: function (pass){
            let salt = Math.random() + '';
            let hash = CryptoJS.HmacSHA1(pass,salt).toString(CryptoJS.enc.Hex);
            console.log("setPass : ",pass," ,hash: ",hash, " salt: ",salt);
            this.setDataValue('password', pass);
            this.setDataValue('salt', salt);
            this.setDataValue('hashedPassword', hash);
        },
    },
    hashedPassword:{
        type: Sequelize.STRING,
        allowNull: false,
    },
    salt:{
        type: Sequelize.STRING,
        allowNull: false,
    },
}, {tableName: 'user'});
User.sync();
//
var Contacts = sequelize.define('Contacts', {
    userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    contactId: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
}, { timestamps: false,tableName: 'Contacts' });
Contacts.sync();
//
var BlockedContacts = sequelize.define('BlockedContacts', {
    userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    blockedContactId: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
}, { timestamps: false,tableName: 'BlockedContacts' });
BlockedContacts.sync();
//
User.belongsToMany(User, {as:'contacts',otherKey:'contactId',foreignKey:'userId',through: 'Contacts'});
User.belongsToMany(User, {as:'blockedContacts',otherKey:'blockedContactId',foreignKey:'userId',through: 'BlockedContacts'});
//
var Room = sequelize.define('room', {
    _id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
}, {tableName: 'room'});
Room.sync();
//
var UserRoom = sequelize.define('UserRoom', {
    roomId: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    enable:{
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue:false,
    },
    admin:{
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue:false,
    },
}, { timestamps: false,tableName: 'UserRoom' });
UserRoom.sync();
//
Room.belongsToMany(User, {as: 'members', through: UserRoom});
//Magic methods setMembers, addMembers, removeMembers eth..
Room.belongsToMany(User, {as: 'blockedMembers', through: UserRoom});
//Magic methods setBlockedMembers, addBlockedMembers, removeBlockedMembers eth..
User.belongsToMany(Room, {as:'rooms', through: UserRoom});
//Magic methods setRooms, addRooms, removeRooms eth..
//
const Message = sequelize.define('message', {
    _id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true
    },
    text: {//message text
        type: Sequelize.STRING,
        allowNull: false,
    },
    author:{
        type: Sequelize.STRING,
        allowNull: false,
    },
    sig: {//message text
        type: Sequelize.STRING,
        allowNull: false,
    },
    forwardFrom:{
        type: Sequelize.INTEGER,
    },
    date:{
        type: Sequelize.DATE,
        allowNull: false,
    },
}, {tableName: 'message'});
Message.sync();
//
const MessageData  = sequelize.define('MessageData', {
    messageId:{
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    userId:{
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    status:{//author
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue:false,
    },
});
MessageData.sync();
//
Message.belongsToMany(User, {as: 'recipients',through: MessageData});
Message.belongsTo(User, {foreignKey:'forwardFrom'});
Message.sync();

Message.prototype.reformatData = async function() {
    let mes = JSON.stringify(this);
    mes = JSON.parse(mes);
    console.log("Message.prototype.reformatData mes: ", mes);
    if(Array.isArray(mes)){
        return mes.map((itm) => {
            itm.recipients.forEach((user) => {
                user['status'] = user.MessageData.status;
                delete user.MessageData
            });
            return itm;
        });
    } else {
        mes.recipients.forEach((user) => {
            user['status'] = user.MessageData.status;
            delete user.MessageData
        });
        return mes;
    }
};

//message methods
Message.messageHandler = async function (data,limit) {
    var Message = this;
    //let mes = {};
    let err = {};
    //let sig = setGetSig(data.members);
    console.log('DB messageHandler: ',data);
    try {
        if(data.message) {//write data
            let mes = await Message.create({text: data.message.text,sig:data.sig,date:data.message.date,author:data.message.author});
            for (let name of data.members) {
                if(name !== data.message.author) await mes.addRecipient(await User.findOne({where:{username:name}}))
            }
            mes = await Message.findOne({
                where: {_id:mes._id},
                include:{
                    model:User,
                    as:'recipients',
                    attributes: ['username'],
                    through: {attributes: ['status']}
                }
            });
            //await mes.reformatData();
            //console.log('DB messageHandler mes: ',mes);
            return {err:null,mes:mes};//return current message
        }else {//read data and return log
            let mes = await Message.findAll({
                limit:limit,
                where:{sig:data.sig},
                order: [
                    [ 'createdAt', 'DESC' ],
                ],
                include:{
                    model:User,
                    as:'recipients',
                    attributes: ['username'],
                    through: {attributes: ['status']}
                }
            });
            mes.sort((a,b) => a.createdAt > b.createdAt);
            //await mes.reformatData();
            //console.log('DB messageHandler mes2: ',mes);
            return {err:null,mes: mes};
        }
    } catch(err) {
        console.log('messageHandler err: ',err);
        return {err:err,mes:null};
    }
};
//////////////////////////////////////////////////////////////////
//internal methods
User.prototype.encryptPassword = function(password) {
    console.log("encryptPassword password: ",password);
    return CryptoJS.HmacSHA1(password,this.salt).toString(CryptoJS.enc.Hex);
};

User.prototype.checkPassword = function(password) {
    console.log("checkPassword password: ",password);
    return  this.encryptPassword(password) === this.hashedPassword;
};

User.prototype.reformatData = async function() {
    let nameUserDB = this;
    //console.log("reformatData: ",nameUserDB);
    nameUserDB = nameUserDB.toJSON();
    if(nameUserDB.contacts) nameUserDB.contacts = nameUserDB.contacts.map(itm => itm.username) || [];
    if(nameUserDB.blockedContacts) nameUserDB.blockedContacts = nameUserDB.blockedContacts.map(itm => itm.username) || [];
    if(nameUserDB.rooms) nameUserDB.rooms = nameUserDB.rooms.map(itm => itm.name)  || [];
    return nameUserDB
};

Room.prototype.reformatData = async function() {
    let nameUserDB = this;
    //console.log("reformatData: ",nameUserDB);
    nameUserDB = nameUserDB.toJSON();
    nameUserDB.members = nameUserDB.members.map(itm => itm.username);
    nameUserDB.blockedMembers = nameUserDB.blockedMembers.map(itm => itm.username);
    return nameUserDB
};

//user methods
User.authorize = async function(paramAuth) {
    let User = this;
    let user = {};
    let err = {};
    try {
        user = await User.findOne({where:{username: paramAuth.username}});
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
//
User.userATC = async function (reqUser,contact) {//AddToContacts
    let User = this;
    let user = {};
    console.log('userATC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        if(reqUser === contact) return ({err:"Rejected, you tried to add themselves.",user:null});
        user = await User.findOne({
            where:{username:reqUser},
            include: [
                {model: User,as:'contacts'},
                {model: User,as:'blockedContacts'},
            ],
        });
        console.log('AddToContacts user: ',user);
        if(!user) return ({err:"No user name "+reqUser+" found.",user:null});
        if(user.contacts.map(itm => itm.name).includes(contact)) return ({err:null,user:user});
        let newContact = await User.findOne({where:{username:contact}});
        if(!newContact) return ({err:"No user name "+contact+" found.",user:null});
        user = await user.addContacts(newContact);
        return ({err:null,user:user});
    } catch(err) {
        console.log('userATC err: ',err);
        return {err:err,user:null};
    }
};
//
User.userATBC = async function (reqUser,contact) {//AddToBlockedContacts
    let User = this;
    let user = {};
    console.log('userATBC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        if(reqUser === contact) return ({err:"Rejected, you tried to add themselves.",user:null});
        user = await User.findOne({
            where:{username:reqUser},
            include: [
                {model: User,as:'contacts'},
                {model: User,as:'blockedContacts'},
            ],
        });
        if(!user) return ({err:"No user name "+reqUser+" found.",user:null});
        if(user.blockedContacts.map(itm => itm.name).includes(contact)) return ({err:"You always add this user to Blocked contacts.",user:null});
        let newContact = await User.findOne({where:{username:contact}});
        if(!newContact) return ({err:"No user name "+contact+" found.",user:null});
        user = await user.addBlockedContacts(newContact);
        return ({err:null,user:user});
    } catch(err) {
        console.log('userATBC err: ',err);
        return {err:err,user:null};
    }
};
//
User.userMFBCTC = async function (reqUser,contact) {//MoveFromBlockedContactsToContacts
    let User = this;
    let user = {};
    //console.log('userMFBCTC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        if(reqUser === contact) return ({err:"Rejected, you tried to add themselves.",user:null});
        user = await User.findOne({
            where:{username:reqUser},
            include:[
                {model: User,as:'contacts'},
                {model: User,as:'blockedContacts'},
                ]
        });
        await user.reformatData();
        if(!user) return ({err:"No user name "+reqUser+" found.",user:null});
        if(user.contacts.includes(contact)) return ({err:"You always add this user to contacts.",user:null});
        let newContact = await User.findOne({where:{username:contact}});
        if(!newContact) return ({err:"No user name "+contact+" found.",user:null});
        await user.removeBlockedContacts(newContact);
        user = await user.addContacts(newContact);
        return {err:null,user:user};
    } catch(err) {
        console.log('userMFBCTC err: ',err);
        return {err:err,user:null};
    }
};
//
User.userMFCTBC = async function (reqUser,contact) {//MoveFromContactsToBlockedContacts
    let User = this;
    let user = {};
    //console.log('userMFBCTC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        if(reqUser === contact) return ({err:"Rejected, you tried to add themselves.",user:null});
        user = await User.findOne({
            where:{username:reqUser},
            include:[
                {model: User,as:'contacts'},
                {model: User,as:'blockedContacts'},
            ]
        });
        await user.reformatData();
        if(!user) return ({err:"No user name "+reqUser+" found.",user:null});
        if(user.blockedContacts.includes(contact)) return {err:"You always moved contact.",user:null};
        let newContact = await User.findOne({where:{username:contact}});
        if(!newContact) return ({err:"No user name "+contact+" found.",user:null});
        await user.removeContacts(newContact);
        user = await user.addBlockedContacts(newContact);
        return {err:null,user:user};
    } catch(err) {
        console.log('userMFCTBC err: ',err);
        return {err:err,user:null};
    }
};
//
//
// //
// User.userRFAL = async function (reqUser,contact) {//RemoveFromAllList
//     let User = this;
//     let user = {};
//     console.log('userRFAL userReq: ',reqUser,",","moving contact: ",contact);
//     try {
//         user = await User.findOne({rew:true,where:{username:reqUser}});
//         if(!user) return ({err:"No user name "+reqUser+" found.",user:null});
//         user = await User.update(
//             {
//                 blockedContacts:[...user.blockedContacts.filter(itm => itm !== contact)],
//                 contacts:[...user.contacts.filter(itm => itm !== contact)]
//             },
//             {where:{username:reqUser}}
//         );
//         return {err:null,user:user};
//     } catch(err) {
//         console.log('userRFAL err: ',err);
//         return {err:err,user:null};
//     }
// };
// //
// User.findOneAndCheckPass = async function (data) {
//     let User = this;
//     let user = {};
//     let err = {};
//     console.log('findOneAndCheckPass data: ',data);
//     try {
//         user = await User.findOne({where:{username: data.username}});
//         if(user.checkPassword(data.password)) {
//             return {err:null,user:user};
//         } else {
//             err = new AuthError("Password is incorrect");
//             console.log('user.err: ',err);
//             return {err:err,user:null};
//         }
//     } catch(err) {
//         console.log('findOneAndCheckPass err: ',err);
//         return {err:err,user:null};
//     }
//
// };
//

//
// user.statics.changeData = async function(paramAuth) {
//     let User = this;
//     let user = {};
//     let err = {};
//     try {
//         user = await User.findOne({username: paramAuth.oldUsername});
//         console.log('async changeData user:',user);
//         if (user) {
//             if(user.checkPassword(paramAuth.oldPassword)) {
//                 user.username = paramAuth.newUsername;
//                 user.password = paramAuth.newPassword;
//                 await user.save();
//                 return {err:null,user:user};
//             } else {
//                 err = new AuthError("Password is incorrect");
//                 console.log('user.err: ',err);
//                 return {err:err,user:null};
//             }
//         } else {
//             err = new AuthError("Old Username is incorrect");
//             console.log('user.err: ',err);
//             return {err:err,user:null};
//         }
//     } catch (err) {
//         console.log('changeData err: ',err);
//         return {err:err,user:null};
//     }
// };
// //

// //room methods
// var User = mongoose.model('User', user);
// var Message = mongoose.model('Message', message);
//create new room and push roomName to user room list


Room.createRoom = async function(roomName,username) {
    let Room = this;
    let room = {};
    let err = {};
    try {
        let user = await User.findOne({where:{username:username}});
        room = await Room.findOne({where:{name:roomName}});
        if(!room){
            room = await Room.create({name:roomName});
            room.members.push({});
            user.rooms.push(room.name);
            room.save();
            user.save();
            console.log('Room.createRoom room: ',Object.keys(room.__proto__));
            console.log('Room.createRoom user: ',Object.keys(user.__proto__));
            await room.addMembers(user);
            await user.addRooms(room,{through:{enable:true,admin:true}});
            return {err:null,room:room,user:user}
        }else{
            return {err:"A group named "+roomName+" already exists. Choose another group name.",room:null,user:null};
        }
    } catch (err) {
        console.log('createRoom err: ',err);
        return {err:err,room:null,user:null};
    }
};
// //invite user to room
// room.statics.inviteUserToRoom = async function(roomName,invited) {
//     let Room = this;
//     let err = {};
//     try {
//         let user = await User.findOne({username:invited});
//         let room = await Room.findOne({name:roomName});
//         let mes = await Message.findOne({uniqSig:roomName});
//         if(room.members.some(itm => itm.name === invited)) return {err:"User "+invited+" is already included in the group.",room:null,user:null};
//         if(room.blockedContacts.some(itm => itm.name === invited)) return {err:"User "+invited+" is included in the block list.",room:null,user:null};
//         if(user.blockedContacts.includes(roomName)) return {err:"A group named "+roomName+" included in block list.",room:null,user:null};
//         user.rooms.push(roomName);
//         room.members.push({name:invited,enable:true,admin:false});
//         if(!mes.members.includes(invited)) mes.members.push(invited);
//         await user.save();
//         await room.save();
//         await mes.save();
//         return {err:null,room:room,user:user};
//     } catch (err) {
//         console.log('inviteUserToRoom err: ',err);
//         return {err:err,room:null,user:null};
//     }
// };
// //block user in room
// room.statics.blockUserInRoom = async function(roomName,adminRoom,blocked) {
//     let Room = this;
//     let err = {};
//     try {
//         let room = await Room.findOne({name:roomName});
//         if(room.members.find(itm => itm.name === adminRoom).admin !== true) return {err:"You are not admin of this group.",room:null};
//         if(room.members.find(itm => itm.name === blocked).admin === true) return {err:"You can not block a group administrator.",room:null};
//         if(!room.members.some(itm => itm.name === blocked) || room.blockedContacts.some(itm => itm.name === blocked)) return {err:"User "+blocked+" is not a member of this group or is already on the block list.",room:null};
//
//         let idx = room.members.find(itm => itm.name === blocked)._id;
//         let blockedUser = room.members.id(idx);
//         room.members.id(idx).remove();
//         room.blockedContacts.push(blockedUser);
//
//         await room.save();
//         return {err:null,room:room};
//     } catch (err) {
//         console.log('blockUserInRoom err: ',err);
//         return {err:err,room:null};
//     }
// };
// //unblock user in room
// room.statics.unblockUserInRoom = async function(roomName,adminRoom,unblocked) {
//     let Room = this;
//     let err = {};
//     try {
//         let room = await Room.findOne({name:roomName});
//         if(room.members.find(itm => itm.name === adminRoom).admin !== true) return {err:"You are not admin of this group.",room:null};
//         if(room.members.some(itm => itm.name === unblocked) || !room.blockedContacts.some(itm => itm.name === unblocked)) return {err:"User "+unblocked+" is an allowed members of this group.",room:null};
//
//         let idx = room.blockedContacts.find(itm => itm.name === unblocked)._id;
//         let unBlockedUser = room.blockedContacts.id(idx);
//         room.blockedContacts.id(idx).remove();
//         room.members.push(unBlockedUser);
//
//         await room.save();
//         return {err:null,room:room};
//     } catch (err) {
//         console.log('unblockUserInRoom err: ',err);
//         return {err:err,room:null};
//     }
// };
// //set admin room
// room.statics.setAdminInRoom = async function(roomName,adminRoom,newAdmin) {
//     let Room = this;
//     let err = {};
//     try {
//         let room = await Room.findOne({name:roomName});
//         if(room.members.find(itm => itm.name === adminRoom).admin !== true) return {err:"You are not admin of this group.",room:null};
//         if(!room.members.some(itm => itm.name === newAdmin) || room.blockedContacts.some(itm => itm.name === newAdmin)) {
//             return {err:"User "+newAdmin+" is not a member of this group or is already on the block list.",room:null};
//         }
//         if(room.members.find(itm => itm.name === newAdmin).admin === true) return {err:"User "+newAdmin+" is already admin of this group.",room:null};
//         let idx = room.members.find(itm => itm.name === newAdmin)._id;
//         room = await Room.findOneAndUpdate({name:roomName ,"members._id": idx},{"members.$.admin" : true});
//         console.log("setAdminInRoom room: ",room);
//         return {err:null,room:room};
//     } catch (err) {
//         console.log('setAdminInRoom err: ',err);
//         return {err:err,room:null};
//     }
// };
// //leave  room
// room.statics.leaveRoom = async function(roomName,name) {
//     let Room = this;
//     let err = {};
//     try {
//         let user = await User.findOne({username:name});
//         let room = await Room.findOne({name:roomName});
//         //if(room.members.find(itm => itm.name === name).admin === true) return {err:"You can not leave this group. You are admin.",room:null,user:null};
//         let filterUserRooms = user.rooms.filter(itm => itm !== roomName);
//         let filterMemberRoom = room.members.filter(itm => itm.name !== name);
//         console.log("filterMemberRoom: ",filterMemberRoom);
//         if(filterMemberRoom.length === 0) {
//             //Delete room protocol. if no one user left.
//             await Room.deleteOne({name:roomName});
//             await Message.deleteOne({uniqSig:roomName});
//             user.rooms = filterUserRooms;
//             await user.save();
//             await room.save();
//             console.log("Delete room protocol successful done");
//             return {err:null,room:null,user:user};
//         }
//         user.rooms = filterUserRooms;
//         room.members = filterMemberRoom;
//         await user.save();
//         await room.save();
//         return {err:null,room:room,user:user};
//     } catch (err) {
//         console.log('leaveRoom err: ',err);
//         return {err:err,room:null,user:user};
//     }
// };
//delete  room
/*room.statics.deleteRoom = async function(roomName,name) {
    let Room = this;
    let err = {};
    try {
        let user = await User.findOne({username:name});
        let room = await Room.findOne({name:roomName});
        if(room.members.find(itm => itm.name === name).admin === false) return {err:"You can not delete this group. You are not admin.",user:null};
        let filterUserRooms = user.rooms.filter(itm => itm !== roomName);//dell room in user room list
        user.rooms = filterUserRooms;
        let roomMesId = await Message.findOne({uniqSig:roomName})._id;
        await Room.deleteOne({name:roomName});//dell room
        await Message.deleteOne({_id:roomMesId});//dell room history
        await user.save();
        return {err:null,user:user};
    } catch (err) {
        console.log('Create room err: ',err);
        return {err:err,user:null};
    }
};*/
//
// module.exports.User = mongoose.model('User', user);
// module.exports.Room = mongoose.model('Room', room);
// module.exports.Message = mongoose.model('Message', message);

module.exports.User = User;
module.exports.Message = Message;
module.exports.Room = Room;
module.exports.MessageData = MessageData;




