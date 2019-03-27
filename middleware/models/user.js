var AuthError = require('./../error').AuthError;
var crypto = require('crypto');
var mongoose = require(".././libs/mongoose");
var util = require('util');
var DevError = require('./../error/index').DevError;


var user = new mongoose.Schema({
    username: {type: String, unique: true, required: true},//lowercase: true,
    hashedPassword: {type: String, required: true},
    salt: {type: String, required: true},
    created: {type: Date, default: Date.now},
    //email: { type: String, lowercase: true, unique: true },
    contacts: [],
    blockedContacts: [],
});
var room = new mongoose.Schema({
    name: { type: String, lowercase: true, unique: true },
    users: [],
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
    var pass = crypto.createHmac('sha1', this.salt).update(password).digest('hex');
    return pass;
};

user.methods.checkPassword = function (password) {
    return this.encryptPassword(password) === this.hashedPassword;
};




user.statics.userMFCTBC = async function (reqUser,contact) {//MoveFromContactsToBlockedContacts
    var User = this;
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
        }
    } catch(err) {
        console.log('userMFBCTC err: ',err);
        return {err:err,user:null};
    }
};

user.statics.userMFBCTC = async function (reqUser,contact) {//MoveFromBlockedContactsToContacts
    var User = this;
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
        }
    } catch(err) {
        console.log('userMFBCTC err: ',err);
        return {err:err,user:null};
    }
};

user.statics.userATC = async function (reqUser,contact) {//AddToContacts
    var User = this;
    let user = {};
    console.log('userATC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        user = await User.findOne({username:reqUser});
        if(user){
            if(user.contacts.includes(contact)) return {err:"This user aways in you contact list.",user:null};
            user.contacts.push(contact);//add users from incoming arr
            await user.save();
            return ({err:null,user:user});
        }
    } catch(err) {
        console.log('userATC err: ',err);
        return {err:err,user:null};
    }
};

user.statics.userATBC = async function (reqUser,contact) {//AddToBlockedContacts
    var User = this;
    let user = {};
    console.log('userATBC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        user = await User.findOne({username:reqUser});
        if(user){
            if(user.blockedContacts.includes(contact)) return {err:"You always send request",user:null};
            user.blockedContacts.push(contact);//add users from incoming arr
            await user.save();
            return ({err:null,user:user});
        }
    } catch(err) {
        console.log('userATBC err: ',err);
        return {err:err,user:null};
    }
};

user.statics.userRFAL = async function (reqUser,contact) {//RemoveFromAllList
    var User = this;
    let user = {};
    console.log('userATBC userReq: ',reqUser,",","moving contact: ",contact);
    try {
        user = await User.findOne({username:reqUser});
        if(user){
            let filterBC = user.blockedContacts.filter(itm => itm !== contact);//remove from blockedContacts
            let filterC = user.contacts.filter(itm => itm !== contact);//remove from blockedContacts
            user.blockedContacts = filterBC;
            user.contacts = filterC;
            await user.save();
            return {err:null,user:user};
        }
    } catch(err) {
        console.log('userATBC err: ',err);
        return {err:err,user:null};
    }
};

user.statics.userFindContacts = async function (nameString) {
    var User = this;
    let users = [];
    let err = {};
    console.log('userFindContacts data: ',nameString);
    try {
        users = await User.find( { "username": { "$regex": nameString, "$options": "i" } } );
        //users = await User.find({username:nameString});
        //users = await User.aggregate([{ $match: {username:nameString}}]);

        if(users){
            console.log('userFindContacts data users: ',users);
            return {err:null,users:users};
        }
    } catch(err) {
        console.log('userFindContacts err: ',err);
        return {err:err,user:null};
    }
};

user.statics.findOneAndCheckPass = async function (data) {
    var User = this;
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
    var User = this;
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
    var User = this;
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
        //console.log("message.statics.messageHandlerRoomChat mes: ", mes);
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
//

module.exports.User = mongoose.model('User', user);
module.exports.Room = mongoose.model('Room', room);
module.exports.Message = mongoose.model('Message', message);





