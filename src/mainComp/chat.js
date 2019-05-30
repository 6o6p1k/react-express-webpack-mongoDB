import React from 'react';
import Page from '../layout/page.js';
import io from 'socket.io-client';
import {Redirect} from 'react-router-dom'
import UserBtn from '../partials/userBtn.js'
import Modal from '../partials/modalWindow.js'
import Confirm from '../partials/confirmModalWindow.js'
import Prompt from '../partials/promptModalWindow.js'
import ItmProps from '../partials/itmProps.js'
import RoomProps from '../partials/roomPropsWindow.js'
import UserProps from '../partials/userPropsWindow.js'
//third-party applications
import VisibilitySensor from'react-visibility-sensor'






class Chat extends React.Component {

    constructor(props) {
        let user = JSON.parse(sessionStorage.getItem('user')).user;
        //console.log("/chat user: ",user);
        super(props);
        this.state = {
            modalWindow:false,
            modalWindowMessage:"",

            errorRedirect: false,
            loginRedirect:false,
            err:{},

            user: user,

            message: '',

            users: [],
            filteredUsers: [],
            foundContacts: [],
            blockedContacts: [],
            rooms: [],
            messagesStore: {},

            arrayBlockHandlerId: undefined,
            messageBlockHandlerId: undefined,

            resAddMeHandler:false,
            resAddMeAddMeName:"",
            addMeHandler:false,
            reqAddMeName:"",

            changeStatusHandler:false,
            changeStatusName:"",
            changeStatusAct:"",

            confirmMessage:"",

            promptModalWindow:false,
            promptRes:"",
            showSearch: false,

            roomPropsWindow:false,
            userPropsWindow:false



        };
    }
    componentDidUpdate(){
        //move scroll bootom
        //this.scrollToBottom(this.refs.InpUl);
    }

    componentDidMount(){
        console.log("CDM");
        //move scroll bootom
        //this.scrollToBottom(this.refs.InpUl);

        let socket = io.connect('', {reconnection: true});
        this.socket = socket
            .on('updateUserData',(userData)=>{
                console.log("updateUserData: ",userData);
                if(userData.username !== this.state.user.username) return;
                //let sortUsers = userData.contacts.sort((a,b)=> b.onLine - a.onLine);
                //let sortBlockedUsers = userData.blockedContacts.sort((a,b)=> b.onLine - a.onLine);
                this.setState({
                    user:userData,
                    users:userData.contacts,
                    blockedContacts:userData.blockedContacts,
                    rooms:userData.rooms,
                });
            })
            .on('updateMsgStatus',(itmName,itmIndex,status)=>{
                console.log("updateMsgData itmName: ",itmName," ,itmIndex: ",itmIndex);
                if(itmName === this.state.user.username) return;
                let messagesStore = this.state.messagesStore;
                messagesStore[itmName][itmIndex].status = status;
                this.setState({messagesStore});
            })
            .emit('sayOnLine')
            .on('onLine', (name)=> {
                //console.log('receiver user offLine: ',name," ,this.getUsersIdx: ", this.getUsersIdx("users",name));
                let users = this.state.users;
                let usersBC = this.state.blockedContacts;
                if(this.getUsersIdx("users",name) !== -1) {
                    users[this.getUsersIdx("users",name)].onLine = true;
                    //let sortUsers = users.sort((a,b)=> b.onLine - a.onLine);
                    this.setState({users:users});
                }
                if(this.getUsersIdx("blockedContacts",name) !== -1) {
                    usersBC[this.getUsersIdx("blockedContacts",name)].onLine = true;
                    //let sortUsers = usersBC.sort((a,b)=> b.onLine - a.onLine);
                    this.setState({blockedContacts:usersBC});
                }
            })
            .on('offLine', (name)=> {
                //console.log('receiver user offLine: ',name," ,this.getUsersIdx: ", this.getUsersIdx("users",name));
                let users = this.state.users;
                let usersBC = this.state.blockedContacts;
                if(this.getUsersIdx("users",name) !== -1) {
                    users[this.getUsersIdx("users",name)].onLine = false;
                    //let sortUsers = users.sort((a,b)=> b.onLine - a.onLine);
                    this.setState({users:users});
                }
                if(this.getUsersIdx("blockedContacts",name) !== -1) {
                    usersBC[this.getUsersIdx("blockedContacts",name)].onLine = false;
                    //let sortUsers = usersBC.sort((a,b)=> b.onLine - a.onLine);
                    this.setState({blockedContacts:usersBC});
                }
            })
            .on('message', (data)=> {
                //message receiver
                this.printMessage({user:data.user,text:data.text,status:data.status,date:data.date},data.user);
                this.msgCounter("users",this.getUsersIdx("users",data.user));
            })
            .on('messageRoom',(data)=>{
                console.log("messageRoom data: ",data);
                this.printMessage({user:data.user,text:data.text,status:data.status,date:data.date},data.room);
                this.msgCounter("rooms",this.getUsersIdx("rooms",data.room));
            })
            .on('typing', (username)=> {
                //receiver
                if(this.getUsersIdx("users",username) < 0) return;
                const typingUser = this.state.users[this.getUsersIdx("users",username)];
                typingUser.typing = true;
                this.setState({typingUser});
                setTimeout(()=>{
                    typingUser.typing = false;
                    this.setState({typingUser});
                },2000)
            })

            .on('error',(message)=>{
                console.log('Server error happened: ',message);
                if(typeof message === 'string' || message instanceof String) {
                    let data = JSON.parse(message);
                    if(data.status == 423 || data.status == 401) {
                        this.setState({err: data});
                        sessionStorage.setItem('error', message);
                        console.log('error page redirect: ',this.state.err);
                        this.setState({errorRedirect: true});
                    }
                    this.setState({
                        err: {message:data.message,status:data.status},
                        modalWindow: true
                    });
                } else {
                    this.setState({
                        err: message,
                        modalWindow: true
                    });
                }
            })
            .on('logout',()=>{
                //console.log('logout');
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('error');
                this.setState({loginRedirect:true})
            });
    }

    componentWillUnmount(){
        this.socket.disconnect();
    };



    getLog =(reqArrName,reqCellName,reqMesCountCb)=>{
        if(reqArrName === this.state.arrayBlockHandlerId && this.getUsersIdx(reqArrName,reqCellName) === this.state.messageBlockHandlerId) return;
        let messagesStore = this.state.messagesStore;
        if(!messagesStore[reqCellName]) {
            console.log("getUserLog");
            messagesStore[reqCellName] = [];
            this.socket.emit(reqArrName === "rooms" ? 'getRoomLog' : 'getUserLog',reqCellName,reqMesCountCb,(err,arr)=>{
                console.log("getUserLog arr: ",arr," ,err: ",err);
                if(err) {
                    this.setState({
                        modalWindow:true,
                        err:{message:err},
                    })
                }else {
                    messagesStore[reqCellName] = arr;
                    this.setState({messagesStore});
                    //this.setState({messagesStore},()=>this.msgCounter(reqArrName,this.getUsersIdx(reqArrName,reqCellName)));
                }
            })
        }
    };

/*    scrollToBottom = (element) => {
        element.scrollTop = element.scrollHeight;
    };*/

    filterSearch =(str)=> {
        return characters => characters.name.substring(0,str.length).toLowerCase() === str.toLowerCase();
    };

    setFiltered = (nameStr) => {
        console.log("setFiltered str: ",nameStr);
        if(nameStr.length === 0) this.setState({filteredUsers: []});
        this.setState({filteredUsers: this.state.users.filter(this.filterSearch(nameStr))},()=>{
            if(this.state.filteredUsers.length === 0) {
                this.socket.emit('findContacts', nameStr,(usersArr)=>{
                    this.setState({
                        foundContacts:usersArr
                    });
                })
            }
        });
    };

    typing =(name,ev)=> {
        //console.log('this.typing sId: ', sId);
        this.setState({message: ev.target.value});
        if(name) {this.socket.emit('typing', name)}
    };


    msgCounter =(a,i)=> {
        console.log("msgCounter a: ",a," ,i: ",i);
        let current = this.state[a][i];
        let currentUserMes = this.state.messagesStore[current.name];
        let unReadMes = 0;
        currentUserMes.forEach(itm => itm.status === false  && itm.user !== this.state.user.username ? unReadMes += 1 : "");
        console.log("unReadMes: ",unReadMes);
        current.msgCounter = unReadMes;
        this.setState({current});
    };

    inxHandler =(a,i)=> {
        //console.log('inxHandler arrName: ',a,", arrName inx: ", i);
        this.setState({messageBlockHandlerId: i, arrayBlockHandlerId: a});
    };

    dateToString =(dateMlS)=> {
        let currentdate = new Date(dateMlS);
        return currentdate.getHours() + ":" + currentdate.getMinutes() + "/" + currentdate.getDate() + ":" + (currentdate.getMonth()+1) + ":" + currentdate.getFullYear()// + ":"+ currentdate.getSeconds();
    };

    sendMessage =(name)=> {
        let date = Date.now();
        switch (this.state.arrayBlockHandlerId){
            case "rooms":
                console.log("sendMessage rooms");
                this.socket.emit('messageRoom', this.state.message, name, date, ()=> {//This name means Group Name
                    this.printMessage({user:this.state.user.username, text:this.state.message, date:date, status:false},name);
                    this.setState({message:''});
                });
                break;
            case "users":
                console.log("sendMessage users");
                this.socket.emit('message', this.state.message, name, date, ()=> {//This name means User Name
                    this.printMessage({user:this.state.user.username, text:this.state.message, date:date, status:false},name);
                    this.setState({message:''});
                });
                break;
            default:
                console.log("sendMessage: Sorry, we are out of " + res + ".");
        }
    };

    getUsersIdx =(a,i)=> {
        return this.state[a].map((itm)=>{return itm.name;}).indexOf(i);
    };

    printMessage =(data,name)=> {//a - array itm, i - index in a - array
        console.log("printMessage: ",data);
        let messagesStore = this.state.messagesStore;
        if(!messagesStore[name]) {messagesStore[name] = [];}
        messagesStore[name].push({user:data.user,text:data.text,status:data.status,date:data.date});
        this.setState({messagesStore});
    };

    moveToBlackList =(name)=> {
        this.socket.emit('moveToBlackList',name,(err,userData)=>{
            console.log("moveToBlackList callback err: ",err," ,userData: ",userData);
            if(err) {
                this.setState({
                    modalWindow:true,
                    err:{message:err},
                    addMeHandler: false,
                    confirmMessage:"",
                    reqAddMeName:"",
                })
            } else {
                this.setState({
                    users:userData.users,
                    blockedContacts:userData.blockedContacts,
                })
            }
        })
    };

    deleteUser =(name)=> {
        this.socket.emit('deleteUser',name,(err,userData)=>{
            console.log("deleteUser callback err: ",err," ,userData: ",userData);
            if(err) {
                this.setState({
                    modalWindow:true,
                    err:{message:err},
                    addMeHandler: false,
                    confirmMessage:"",
                    reqAddMeName:"",
                })
            } else {
                this.setState({
                    users:userData.users,
                    blockedContacts:userData.blockedContacts,
                })
            }
        })
    };

    hideModal =()=> {
        this.setState({modalWindow: false,modalWindowMessage:"",err:{}});
    };

    addMe =(name)=> {
        console.log("addMe: ",name);
        this.setState({
            addMeHandler:true,
            reqAddMeName:name,
            confirmMessage:"Send request to add user "+name+"?"
        })
    };

    resAddMe =(name)=>{
        console.log("resAddMe: ",name);
        this.setState({
            resAddMeHandler:true,
            resAddMeAddMeName:name,
            confirmMessage:"Allow user "+name+" to add you?"
        })
    };

    addMeHandler = (confirmRes) => {
        console.log('confirmRes: ',confirmRes);
        if(confirmRes){
            this.socket.emit('addMe', {name:this.state.reqAddMeName,date:Date.now()},(err,userData)=>{
                console.log("addMe callback err: ",err," ,userData: ",userData);
                if(err) {
                    this.setState({
                        modalWindow:true,
                        err:{message:err},
                        addMeHandler: false,
                        confirmMessage:"",
                        reqAddMeName:"",
                    })
                }else {
                    this.setState({
                        users:userData.contacts,
                        addMeHandler: false,
                        confirmMessage:"",
                        reqAddMeName:"",
                    });

                }
            })
        }else{
            this.setState({
                addMeHandler: false,
                confirmMessage:"",
                reqAddMeName:"",
            });
        }
    };

    resAddMeHandler =(confirmRes)=>{
        //('resAddMeHandler: ',confirmRes);
        if(confirmRes){
            this.socket.emit('resAddMe', {name:this.state.resAddMeAddMeName,date:Date.now()},(err,userData)=>{
                console.log("resAddMeHandler callback err: ",err," ,userData: ",userData);
                if(err) {
                    this.setState({
                        modalWindow:true,
                        err:{message:err},
                        resAddMeHandler:false,
                        resAddMeAddMeName:"",
                        confirmMessage:""
                    })
                }else {
                    this.setState({
                        users:userData.contacts,
                        blockedContacts:userData.blockedContacts,
                        resAddMeHandler:false,
                        resAddMeAddMeName:"",
                        confirmMessage:""
                    });

                }
            })
        }else{
            this.setState({
                resAddMeHandler:false,
                resAddMeAddMeName:"",
                confirmMessage:""
            });
        }
    };
    //bann, delete, unBann user handler
    userStatusHandler =(confirmRes)=> {
        console.log('userStatusHandler: ',confirmRes,' ,this.state.changeStatusAct: ',this.state.changeStatusAct,', this.state.changeStatusName: ',this.state.changeStatusName);
        if(confirmRes){
            this.socket.emit(this.state.changeStatusAct, {name:this.state.changeStatusName,date:Date.now()},(err,userData)=>{
                console.log("userStatusHandler callback err: ",err," ,userData: ",userData);
                if(err) {
                    this.setState({
                        modalWindow:true,
                        err:{message:err},
                        changeStatusHandler:false,
                        changeStatusName:"",
                        changeStatusAct:"",
                        confirmMessage:""
                    })
                }else {
                    this.setState({
                        users:userData.contacts,
                        blockedContacts:userData.blockedContacts,
                        changeStatusHandler:false,
                        changeStatusName:"",
                        changeStatusAct:"",
                        confirmMessage:""
                    });

                }
            })
        }else{
            this.setState({
                changeStatusHandler:false,
                changeStatusName:"",
                changeStatusAct:"",
                confirmMessage:""
            });
        }
    };

    onContextMenuHandler =(res,username,roomName)=>{
        switch (res) {
            case "inviteUser":
                console.log("onContextMenuHandler inviteUser roomName: ",roomName,", username: ",username);
                this.socket.emit('inviteUserToRoom',roomName,username,Date.now(),(err,data)=>{
                    console.log("inviteUserToRoom' cb err: ",err,", cb rooms: ",data);
                    if(err) {
                        this.setState({
                            modalWindow:true,
                            err:{message:err},
                        })
                    }else {
                        this.setState({rooms:data.rooms});
                    }
                });
                break;
            case "viewRoomData":
                console.log("onContextMenuHandler viewRoomData: ",roomName);
                this.getLog("rooms",roomName,null);
                this.setState({
                    messageBlockHandlerId:this.getUsersIdx("rooms",roomName),
                    arrayBlockHandlerId:"rooms",
                },()=>this.hideShowRoomProps());
                break;
            case "leaveRoom":
                console.log("onContextMenuHandler leaveRoom roomName: ",roomName);
                this.socket.emit('leaveRoom',roomName,Date.now(),(err,data)=>{
                    console.log("leaveRoom cb err: ",err,", cb rooms: ",data);
                    if(err) {
                        this.setState({
                            modalWindow:true,
                            err:{message:err},
                        })
                    }else {
                        this.setState({rooms:data.rooms});
                    }
                });
                break;
            case "moveRoomOnTop":
                console.log("onContextMenuHandler moveRoomOnTop: ",roomName);
                break;
            case "clearRoomWindow":
                console.log("onContextMenuHandler clearRoomWindow");
                break;
            case "deleteUser":
                console.log("onContextMenuHandler deleteUser");
                this.setState({
                    changeStatusHandler:true,
                    confirmMessage:"Are you sure you want to delete a user "+username+"?",
                    changeStatusName:username,
                    changeStatusAct:"deleteUser",
                });
                break;
            case "banUser":
                console.log("onContextMenuHandler banUser");
                this.setState({
                    changeStatusHandler:true,
                    confirmMessage:"Are you sure you want to ban a user "+username+"?",
                    changeStatusName:username,
                    changeStatusAct:"banUser",
                });
                break;
            case "unBanUser":
                console.log("onContextMenuHandler unBanUser");
                this.socket.emit('unBanUser', {name:username,date:Date.now()},(err,userData)=>{
                    console.log("unBanUser callback err: ",err," ,userData: ",userData);
                    if(err) {
                        this.setState({
                            modalWindow:true,
                            err:{message:err},
                            changeStatusHandler:false,
                            changeStatusName:"",
                            changeStatusAct:"",
                            confirmMessage:""
                        })
                    }else {
                        this.setState({
                            users:userData.contacts,
                            blockedContacts:userData.blockedContacts,
                        });
                    }
                });
                break;
            case "clearChatWindow":
                console.log("onContextMenuHandler clearChatWindow");
                break;
            case "viewUserData":
                console.log("onContextMenuHandler viewUserData: ",username);
                //this.setState({messageBlockHandlerId:this.getUsersIdx("users",username)},()=>this.hideShowUserProps());
                if(this.getUsersIdx("users",username) >= 0) {
                    this.getLog("users",username,null);
                    return this.setState({
                        messageBlockHandlerId:this.getUsersIdx("users",username),
                        arrayBlockHandlerId:"users"
                    },()=>this.hideShowUserProps());
                }
                if(this.getUsersIdx("blockedContacts",username) >= 0) {
                    this.getLog("blockedContacts",username,null);
                    return this.setState({
                        messageBlockHandlerId:this.getUsersIdx("blockedContacts",username),
                        arrayBlockHandlerId:"blockedContacts"
                    },()=>this.hideShowUserProps());
                }
                break;
            case "moveOnTop":
                console.log("onContextMenuHandler moveOnTop");
                break;
            case "reqAuth":
                console.log("onContextMenuHandler reqAuth");
                this.setState({reqAddMeName:username},()=>this.addMeHandler(true));
                break;
            default:
                console.log("onContextMenuHandler Sorry, we are out of " + res + ".");
        }
    };

    //Group functional
    createRoom =(roomName)=>{
        console.log("createRoom: ",roomName);
        this.socket.emit('createRoom',roomName,Date.now(),(err,userData)=>{
            console.log("createRoom res err: ",err," ,userData: ",userData);
            if(err){
                this.setState({
                    modalWindow:true,
                    err:{message:err},
                })
            }else {
                this.setState({
                    rooms:userData.rooms,
                    modalWindow:true,
                    modalWindowMessage:"Group created successful.",
                })
            }
        })
    };

    hideShowFunc = (stateName) => {
        this.setState({stateName: !this.state[stateName]});
    };

    hideShowPrompt = () => {
        this.setState({promptModalWindow: !this.state.promptModalWindow});
    };

    hideShowRoomProps = () => {
        this.setState({roomPropsWindow: !this.state.roomPropsWindow});
    };

    hideShowUserProps = () => {
        this.setState({userPropsWindow: !this.state.userPropsWindow});
    };

    toggleSearch = ()=>{
        this.setState({showSearch: !this.state.showSearch})
    };


    //message bar handler
    setAsRead = (itmName,i)=>{
        console.log("setAsRead: ",itmName," ,index: ",i);
        this.socket.emit(this.state.arrayBlockHandlerId === "rooms" ? 'setRoomMesStatus' : 'setMesStatus',i,itmName,(err)=>{
            console.log("setAsRead ,err: ",err);
            if(err) {
                this.setState({
                    modalWindow:true,
                    err:{message:err},
                })
            } else {
                let messagesStore = this.state.messagesStore;
                messagesStore[itmName][i].status = true;
                this.setState({messagesStore},()=> this.msgCounter(this.state.arrayBlockHandlerId,this.state.messageBlockHandlerId))
            }
        })
    };

    render() {
        console.log('/chat user:', this.state);
        if (this.state.errorRedirect) {
            return <Redirect to='/error'/>
        }//passing props in Redirect to={{pathname:'/error',state:{error:this.state.err}}} get props: this.props.location.state.error
        if (this.state.loginRedirect) {
            return <Redirect to='/login'/>
        }
        return (
            <Page user={this.state.user} title="CHAT PAGE" className="container">
                {this.state.modalWindow ?
                    <Modal show={this.state.modalWindow} handleClose={this.hideModal} err={this.state.err}
                           message={this.state.modalWindowMessage ? this.state.modalWindowMessage : ""}/>
                    : ""}
                {this.state.addMeHandler ?
                    <Confirm confirmHandler={this.addMeHandler} show={this.state.addMeHandler}
                             message={this.state.confirmMessage}/>
                    : ""}
                {this.state.resAddMeHandler ?
                    <Confirm confirmHandler={this.resAddMeHandler} show={this.state.resAddMeHandler}
                             message={this.state.confirmMessage}/>
                    : ""}
                {this.state.changeStatusHandler ?
                    <Confirm confirmHandler={this.userStatusHandler} show={this.state.changeStatusHandler}
                             message={this.state.confirmMessage}/>
                    : ""}
                {(this.state.promptModalWindow) ? (
                    <Prompt
                        promptHandler={this.createRoom}
                        show={this.state.promptModalWindow}
                        handleClose={this.hideShowPrompt}
                        name={"Group name"}
                        type={""}
                        placeholder={"Group name"}
                        message={"Input the desired group name."}/>
                ) : ('')}
                {(this.state.roomPropsWindow) ?
                    (<RoomProps
                        curentRoom={this.state.rooms[this.state.messageBlockHandlerId]}
                        handleClose={this.hideShowRoomProps}
                        show={this.state.roomPropsWindow}
                    />) : ("")}
                {(this.state.userPropsWindow) ?
                    (<UserProps
                        curentUser={this.state[this.state.arrayBlockHandlerId][this.state.messageBlockHandlerId]}
                        handleClose={this.hideShowUserProps}
                        show={this.state.userPropsWindow}
                    />) : ("")}
                <div className="chat-room">
                    <div className="chat-users">
                        <div className="login-form">
                            {this.state.showSearch ?
                                <input name="nameSearchInp"
                                       className={`form-control searchInChat ${this.state.showSearch ? "show" : ""}`}
                                       autoComplete="off" autoFocus placeholder="Search..."
                                       onChange={ev => this.setFiltered(ev.target.value)}
                                />
                                : ""}

                            <div className="userList btnList">
                                <button onClick={() => this.toggleSearch()} name="msgBtn" type="button"
                                        className="btn search">
                                    <img src="../img/magnifier.svg" alt="search"/>
                                    <span className="tooltiptext">Search</span>
                                </button>

                                <button onClick={() => this.hideShowPrompt()} name="msgBtn" type="button"
                                        className="btn">
                                    <img src="../img/add-group-of-people.png" alt="add user"/>
                                    <span className="tooltiptext">Create group</span>
                                </button>

                                <button name="msgBtn" type="button" className="btn">
                                    <img src="../img/add-user-button.png" alt="add user"/>
                                    <span className="tooltiptext">Add user</span>
                                </button>
                            </div>


                            <div className="userList white">white list users</div>
                            {this.state.filteredUsers.length === 0 ?
                                (this.state.foundContacts.length !== 0) ? (
                                    this.state.foundContacts.map((name, i) => <UserBtn
                                        key={i}
                                        i={i}
                                        name={name}
                                        addMe={() => this.addMe(name)}
                                    />)
                                ) : this.state.users.map((itm, i) => <UserBtn
                                    key={i}
                                    itm={itm}
                                    i={i}
                                    getUserLog={() => this.getLog("users", itm.name, null)}
                                    inxHandler={() => this.inxHandler("users", i)}
                                    messageBlockHandlerId={this.state.messageBlockHandlerId}
                                    onContextMenuHandler={this.onContextMenuHandler}
                                    banList={false}
                                    roomList={false}
                                />)
                                : this.state.users.filter(items => this.state.filteredUsers
                                    .map(i => i.name)
                                    .includes(items.name))
                                    .map((itm, i) => <UserBtn
                                            key={i}
                                            itm={itm}
                                            i={this.getUsersIdx("users", itm.name)}
                                            getUserLog={() => this.getLog("users", itm.name, null)}
                                            inxHandler={() => this.inxHandler("users", i)}
                                            messageBlockHandlerId={this.state.messageBlockHandlerId}
                                            onContextMenuHandler={this.onContextMenuHandler}
                                            banList={false}
                                            roomList={false}
                                        />
                                    )}

                            {this.state.blockedContacts.length !== 0 ?
                                <div>
                                    <div className="userList black">black list users</div>
                                    {
                                        this.state.blockedContacts.map((itm, i) =>
                                            <UserBtn
                                                key={i}
                                                itm={itm}
                                                i={i}
                                                getUserLog={() => this.getLog("blockedContacts", itm.name, null)}
                                                inxHandler={() => this.inxHandler("blockedContacts", i)}
                                                messageBlockHandlerId={this.state.messageBlockHandlerId}
                                                onContextMenuHandler={this.onContextMenuHandler}
                                                banList={true}
                                                roomList={false}
                                            />)
                                    }
                                </div>
                                : ""}
                            {this.state.rooms.length !== 0 ?
                                <div>
                                    <div className="userList white">group list</div>
                                    {
                                        this.state.rooms.map((itm, i) =>
                                            <UserBtn
                                                key={i}
                                                name={itm.name}
                                                itm={itm}
                                                i={i}
                                                getUserLog={() => this.getLog("rooms", itm.name, null)}
                                                inxHandler={() => this.inxHandler("rooms", i)}
                                                messageBlockHandlerId={this.state.messageBlockHandlerId}
                                                onContextMenuHandler={this.onContextMenuHandler}
                                                banList={false}
                                                roomList={true}
                                                userList={this.state.users.map(itm => itm.name)}
                                            />)
                                    }
                                </div>
                                : ""}
                        </div>
                    </div>

                    {
                        ((a, e) => {
                            console.log('message-block: e:',e,", a:",a);
                            let eUser = {};
                            if (a && e !== undefined) {
                                eUser = this.state[a][e];
                                console.log("eUser.name: ",eUser.name);
                            }
                            else {
                                eUser = undefined
                            }
                            return (
                                <div className="message-block">
                                    <div name="chatRoom" id="chatDiv">
                                        {a === "rooms" ?
                                            <div onClick={() => this.hideShowRoomProps()}>
                                                <ItmProps room={eUser}/>
                                            </div> : e !== undefined ?
                                                <div onClick={() => this.hideShowUserProps()}>
                                                    <ItmProps user={eUser}/>
                                                </div> : ""
                                        }

                                        <ul name="InpUl" className="chat-list" ref="InpUl">
                                            {
                                                (eUser) ? (
                                                    this.state.messagesStore[eUser.name].map((data, i) => {
                                                        return (
                                                            (data.user === this.state.user.username)?(

                                                                <li key={i} className="right">{data.text}
                                                                    <span className="messageData">{data.user}
                                                                        <span className="messageTime">{this.dateToString(data.date)}</span>
                                                                        <span className="messageTime">{data.status === true ? " R" : Array.isArray(data.status) ? (
                                                                             data.status.map(name => <span className="messageTime">{name}</span>)
                                                                           ):("")}</span>
                                                                    </span>
                                                                </li>
                                                            ):(
                                                                <VisibilitySensor containment={this.refs.InpUl}  onChange={(inView)=> inView && data.status !== true ? this.setAsRead(eUser.name,i,) : ""}>
                                                                    <li key={i} >{data.text}
                                                                        <span className="messageData">{data.user}<span className="messageTime">{this.dateToString(data.date)}</span></span>
                                                                    </li>
                                                                </VisibilitySensor >

                                                            )

/*                                                            <li key={i}
                                                                className={(data.user === this.state.user.username) ? ("right") : ("")}>{data.text}
                                                                <span className="messageData">{data.user}<span
                                                                    className="messageTime">{data.date}</span></span>
                                                            </li>*/
                                                        )
                                                    })
                                                ) : ("")
                                            }
                                        </ul>

                                        <form onSubmit={(ev) => {
                                            ev.preventDefault();
                                            ev.stopPropagation();
                                            //this.sendMessage(eUser.name)
                                        }} name="chatRoomForm" className="writeMessWrapp">
                                            <div className="input-group writeMess">
                                                        <textarea name="formInp" className="form-control"
                                                                  autoComplete="off"
                                                                  autoFocus placeholder="Message..."
                                                                  value={this.state.message}
                                                                  onChange={ev => (this.typing(eUser.name, ev))}
                                                        />
                                                {
                                                    (a !== "blockedContacts") ?
                                                        <button onClick={() => this.sendMessage(eUser.name)}
                                                                name="msgBtn" type="button" className="btn">
                                                            SEND</button> :
                                                        <button onClick={() => this.resAddMe(eUser.name)} name="msgBtn"
                                                                type="button" className="btn">ALLOW USER</button>
                                                }
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            );
                        })(this.state.arrayBlockHandlerId, this.state.messageBlockHandlerId)
                    }

                </div>
            </Page>
        );
    }
}

export default Chat;


