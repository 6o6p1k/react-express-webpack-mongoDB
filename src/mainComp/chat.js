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
import searchImg from '../../public/img/magnifier.svg'
import addGroupImg from '../../public/img/add-group-of-people.png'
import addUserImg from '../../public/img/add-user-button.png'
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

            promptCreateRoom:false,
            promptSearchUser:false,
            promptRes:"",
            showSearch: false,

            roomPropsWindow:false,
            userPropsWindow:false,

            connectionLost:false,

            scrollTopMax: undefined,
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
        //receivers
        this.socket = socket
            //.emit('sayOnLine')

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
            .on('updateMsgStatus',(itmName,idx,status)=>{
                console.log("updateMsgData itmName: ",itmName," ,id: ",idx);
                //let indexCorrection = allMesCounter - this.state.messagesStore[itmName].length;//index correction factor = all messages - showed msg in message store
                if(!itmName || !idx || !status) return;
                if(itmName === this.state.user.username) return;
                let messagesStore = this.state.messagesStore;
                if(!messagesStore[itmName]) return;
                messagesStore[itmName].find(itm => itm._id === idx).status = status;
                this.setState({messagesStore});
            })
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
                this.printMessage(data,data.user);
                this.msgCounter("users",this.getUsersIdx("users",data.user));
            })
            .on('messageRoom',(data)=>{
                //messageRoom receiver
                this.printMessage(data,data.room);
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

            .on('disconnect', ()=>{
                console.log("WSocket connection lost!");
                this.setState({connectionLost:true})
            })
            .on('connect', ()=>{
                console.log("WSocket connection restored!");
                this.setState({connectionLost:false});
                this.socket.emit('sayOnLine');
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
    //send .disconnect() then user logOut
    componentWillUnmount(){
        this.socket.disconnect();
    };

    scrollToBottom = (element) => {
        //console.log("this.state.scrollTopMax: ",this.state.scrollTopMax);
        element.scrollTop = element.scrollTopMax - this.state.scrollTopMax || element.scrollHeight;
    };

    //req subscribers log
    getLog =(a,e,reqMesCountCb)=>{
        if(this.state.arrayBlockHandlerId === a && this.state.messageBlockHandlerId === this.getUsersIdx(a,e) && reqMesCountCb === null) return;
        let messagesStore = this.state.messagesStore;
        if(!messagesStore[e]) messagesStore[e] = [];
        if(messagesStore[e].length >= 15 && reqMesCountCb === null) return;
        if(!reqMesCountCb) reqMesCountCb = 15;
        if(messagesStore[e].length === this.state[a][this.getUsersIdx(a,e)].allMesCounter) return;
        console.log("getLog: ",a," ,",e," ,",reqMesCountCb);
        this.socket.emit(a === "rooms" ? 'getRoomLog' : 'getUserLog',e,reqMesCountCb,(err,arr)=>{
            //console.log("getUserLog arr: ",arr," ,err: ",err);
            if(err) {
                this.setState({
                    modalWindow:true,
                    err:{message:err},
                })
            }else {
                messagesStore[e] = arr;
                this.setState({messagesStore},()=>this.scrollToBottom(this.refs.InpUl));
            }
        });
    };
    //filter subscribers then user type in search field
    filterSearch =(str)=> {
        return characters => characters.name.substring(0,str.length).toLowerCase() === str.toLowerCase();
    };
    //filter subscribers then user type in search field or send req for search in DB
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
    //typing msg receiver
    typing =(name,ev)=> {
        //console.log('this.typing sId: ', sId);
        this.setState({message: ev.target.value});
        if(name) {this.socket.emit('typing', name)}
    };
    //unread msgs counter
    msgCounter =(a,i,unreadFlag)=> {
        console.log("msgCounter a: ",a," ,i: ",i);
        let current = this.state[a][i];
        let currentUserMes = this.state.messagesStore[current.name];
        let unReadMes = 0;
        if(!unreadFlag) current.allMesCounter = current.allMesCounter + 1;
        currentUserMes.forEach(itm => itm.status === false  && itm.user !== this.state.user.username ? unReadMes += 1 : "");
        current.msgCounter = unReadMes;
        this.setState({current},()=>console.log("msgCounter this.state[a][i]:", current));
    };
    //set current subscriber
    inxHandler =(a,i)=> {
        //console.log('inxHandler arrName: ',a,", arrName inx: ", i);
        this.setState({messageBlockHandlerId: i, arrayBlockHandlerId: a});
    };
    //transform data in milliseconds to string
    dateToString =(dateMlS)=> {
        let currentdate = new Date(dateMlS);
        return currentdate.getHours() + ":" + currentdate.getMinutes() + "/" + currentdate.getDate() + ":" + (currentdate.getMonth()+1) + ":" + currentdate.getFullYear()// + ":"+ currentdate.getSeconds();
    };
    //send msg handler
    sendMessage =(name)=> {
        let date = Date.now();
        switch (this.state.arrayBlockHandlerId){
            case "rooms":
                console.log("sendMessage rooms");
                this.socket.emit('messageRoom', this.state.message, name, date, (id)=> {//This name means Group Name
                    this.printMessage({_id:id, user:this.state.user.username, text:this.state.message, date:date, status:false},name);
                    this.msgCounter("rooms",this.getUsersIdx("rooms",name));
                    this.setState({message:''});
                });
                break;
            case "users":
                console.log("sendMessage users");
                this.socket.emit('message', this.state.message, name, date, (id)=> {//This name means User Name
                    console.log("sendMessage users cb(mes.id): ",id);
                    this.printMessage({_id:id, user:this.state.user.username, text:this.state.message, date:date, status:false},name);
                    this.msgCounter("users",this.getUsersIdx("users",name));
                    this.setState({message:''});
                });
                break;
            default:
                console.log("sendMessage: Sorry, we are out of " + res + ".");
        }
    };
    //send req for log data
    getUsersIdx =(a,i)=> {
        return this.state[a].map((itm)=>{return itm.name;}).indexOf(i);
    };
    //pushing incoming msgs
    printMessage =(data,name)=> {//a - array itm, i - index in a - array
        console.log("printMessage: ",data);
        let messagesStore = this.state.messagesStore;
        if(!messagesStore[name]) messagesStore[name] = [];
        messagesStore[name].push({_id:data._id,user:data.user,text:data.text,status:data.status,date:data.date});
        this.setState({messagesStore});
    };

    //User functional//
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

    searchUser = (data)=> {
        console.log("searchUser: ",data);
        this.socket.emit('checkContact',data,(name)=>{
            if(name) {
                this.addMe(name)
            } else {
                this.setState({
                    modalWindow:true,
                    modalWindowMessage:"User with name or id: "+data+" not found.",
                })
            }
        })
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
            this.socket.emit('addMe', {name:this.state.reqAddMeName,date:Date.now()},(err,userData,msgData)=>{
                console.log("addMe callback err: ",err," ,userData: ",userData);
                if(err) {
                    this.setState({
                        modalWindow:true,
                        err:{message:err},
                        addMeHandler: false,
                        confirmMessage:"",
                        reqAddMeName:"",
                        foundContacts:[]
                    })
                }else {
                    this.setState({
                        users:userData.contacts,
                        addMeHandler: false,
                        confirmMessage:"",
                        reqAddMeName:"",
                        foundContacts:[]
                    },()=>this.printMessage(msgData,this.state.reqAddMeName));
                }
                this.refs["nameSearchInp"].value = "";
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
            let date = Date.now();
            let addUserName = this.state.resAddMeAddMeName;
            this.socket.emit('unBanUser', {name:addUserName,date:date},(err,userData,msgData)=>{
                console.log("unBanUser callback err: ",err," ,userData: ",userData);
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
                    this.printMessage(msgData,addUserName);
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

    userStatusHandler =(confirmRes)=> {
        console.log('userStatusHandler: ',confirmRes,' ,this.state.changeStatusAct: ',this.state.changeStatusAct,', this.state.changeStatusName: ',this.state.changeStatusName);
        if(confirmRes){
            this.socket.emit(this.state.changeStatusAct, {name:this.state.changeStatusName,date:Date.now()},(err,userData,msgData)=>{
                console.log("userStatusHandler callback err: ",err," , userData: ",userData," ,msgData: ",msgData);
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
                    if(msgData) this.printMessage(msgData,this.state.changeStatusName);
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
    //Right click handler
    onContextMenuHandler =(res,username,roomName)=>{
        let date = Date.now();
        switch (res) {
            case "inviteUser":
                console.log("onContextMenuHandler inviteUser roomName: ",roomName,", username: ",username);
                this.socket.emit('inviteUserToRoom',roomName,username,date,(err,data,msgData)=>{
                    console.log("inviteUserToRoom' cb err: ",err,", cb rooms: ",data);
                    if(err) {
                        this.setState({
                            modalWindow:true,
                            err:{message:err},
                        })
                    }else {
                        this.setState({rooms:data.rooms});
                        this.printMessage(msgData,roomName);
                    }
                });
                break;
            case "banRoomUser":
                console.log("onContextMenuHandler banRoomUser roomName: ",roomName,", username: ",username);
                this.socket.emit('blockRoomUser',roomName,username,date,(err,data,msgData)=>{
                    console.log("blockRoomUser' cb err: ",err,", cb rooms: ",data);
                    if(err) {
                        this.setState({
                            modalWindow:true,
                            err:{message:err},
                        })
                    }else {
                        this.setState({rooms:data.rooms});
                        this.printMessage(msgData,roomName);
                    }
                });
                break;
            case "unBanRoomUser":
                console.log("onContextMenuHandler unBlockRoomUser roomName: ",roomName,", username: ",username);
                this.socket.emit('bunBlockRoomUser',roomName,username,date,(err,data,msgData)=>{
                    console.log("unBlockRoomUser' cb err: ",err,", cb rooms: ",data);
                    if(err) {
                        this.setState({
                            modalWindow:true,
                            err:{message:err},
                        })
                    }else {
                        this.setState({rooms:data.rooms});
                        this.printMessage(msgData,roomName);
                    }
                });
                break;
            case "viewRoomData":
                console.log("onContextMenuHandler viewRoomData: ",roomName);
                this.getLog("rooms",roomName,null);
                this.setState({
                    messageBlockHandlerId:this.getUsersIdx("rooms",roomName),
                    arrayBlockHandlerId:"rooms",
                },()=>this.hideShowProps("roomPropsWindow"));
                break;
            case "leaveRoom":
                console.log("onContextMenuHandler leaveRoom roomName: ",roomName);
                this.socket.emit('leaveRoom',roomName,date,(err,data)=>{
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
                this.socket.emit('unBanUser', {name:username,date:date},(err,userData,msgData)=>{
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
                        this.printMessage(msgData,username);
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
                if(this.getUsersIdx("users",username) >= 0) {
                    this.getLog("users",username,null);
                    return this.setState({
                        messageBlockHandlerId:this.getUsersIdx("users",username),
                        arrayBlockHandlerId:"users"
                    },()=>this.hideShowProps("userPropsWindow"));
                }
                if(this.getUsersIdx("blockedContacts",username) >= 0) {
                    this.getLog("blockedContacts",username,null);
                    return this.setState({
                        messageBlockHandlerId:this.getUsersIdx("blockedContacts",username),
                        arrayBlockHandlerId:"blockedContacts"
                    },()=>this.hideShowProps("userPropsWindow"));
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

    //Group functional//
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

    ////////

    //Triggers
    hideModal =()=> {
        this.setState({modalWindow: false,modalWindowMessage:"",err:{}});
    };

    hideShowProps = (name) => {
        this.setState({[name]: !this.state[name]});
    };

    hideShowPrompt = (name) => {
        this.setState({[name]: !this.state[name]});
    };

    toggleSearch = ()=>{
        this.setState({showSearch: !this.state.showSearch})
    };
    //scrollHandler emit load new part of history log
    onScrollHandler =(e,name,array,itm)=> {
        //console.log("scrollHandler: ",e.target);
        if(e.target.scrollTop === 0) {
            //console.log("scrollHandler on top: ",e," ,",name," ,",array," ,",itm);
            let msgCount = this.state.messagesStore[name].length;
            this.setState({scrollTopMax: e.target.scrollTopMax},()=>this.getLog(array,name,msgCount+10));
        }
    };
    //message bar handler
    setAsRead = (itmName,i,a,e,idx)=>{
        if(Array.isArray(this.state.messagesStore[itmName][i].status) && this.state.messagesStore[itmName][i].status.includes(this.state.user.username)) return;
        //let indexCorrection = this.state[a][e].allMesCounter - this.state.messagesStore[itmName].length;//index correction factor = all messages - showed msg in message store
        //console.log("setAsRead: ",itmName," ,i: ",i," ,indexCorrection: ",indexCorrection,"this.state[a][e].allMesCounter: ",
            //this.state[a][e].allMesCounter," ,this.state.messagesStore[itmName].length: ",this.state.messagesStore[itmName].length);
        console.log("setAsRead itmName: ",itmName," ,idx: ",idx);
        this.socket.emit(this.state.arrayBlockHandlerId === "rooms" ? 'setRoomMesStatus' : 'setMesStatus',idx,itmName,(err)=>{
            if(err) {
                this.setState({
                    modalWindow:true,
                    err:{message:err},
                })
            } else {
                let messagesStore = this.state.messagesStore;
                messagesStore[itmName].find(itm => itm._id === idx).status = true;
                this.setState({messagesStore},()=> {console.log("setAsRead DONE!");this.msgCounter(this.state.arrayBlockHandlerId,this.state.messageBlockHandlerId,true)})
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
                {this.state.connectionLost ?
                    <Modal show={this.state.connectionLost} err={this.state.err}
                           message={"Connection lost! Wait until the connection is established."}/>
                    : ""}
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
                {(this.state.promptCreateRoom) ? (
                    <Prompt
                        promptHandler={this.createRoom}
                        show={this.state.promptCreateRoom}
                        handleClose={()=>this.hideShowPrompt("promptCreateRoom")}
                        name={"Group name"}
                        type={""}
                        placeholder={"Group name"}
                        message={"Input the desired group name."}/>
                ) : ('')}
                {(this.state.promptSearchUser) ? (
                    <Prompt
                        promptHandler={this.searchUser}
                        show={this.state.promptSearchUser}
                        handleClose={()=>this.hideShowPrompt("promptSearchUser")}
                        name={"User name"}
                        type={""}
                        placeholder={"name/id"}
                        message={"Input user name or id."}/>
                ) : ('')}
                {(this.state.roomPropsWindow) ?
                    (<RoomProps
                        curentRoom={this.state.rooms[this.state.messageBlockHandlerId]}
                        handleClose={()=>this.hideShowProps("roomPropsWindow")}
                        show={this.state.roomPropsWindow}
                    />) : ("")}
                {(this.state.userPropsWindow) ?
                    (<UserProps
                        curentUser={this.state[this.state.arrayBlockHandlerId][this.state.messageBlockHandlerId]}
                        handleClose={()=>this.hideShowProps("userPropsWindow")}
                        show={this.state.userPropsWindow}
                    />) : ("")}
                <div className="chat-room">
                    <div className="chat-users">
                        <div className="login-form">
                            {this.state.showSearch ?
                                <input name="nameSearchInp" ref="nameSearchInp"//this.refs.nameSearchInp.target.value
                                       className={`form-control searchInChat ${this.state.showSearch ? "show" : ""}`}
                                       autoComplete="off" autoFocus placeholder="Search..."
                                       onChange={ev => this.setFiltered(ev.target.value)}
                                />
                                : ""}

                            <div className="userList btnList">
                                <button onClick={() => this.toggleSearch()} name="msgBtn" type="button"
                                        className="btn search">
                                    <img src={searchImg} alt="search"/>
                                    <span className="tooltiptext">Search</span>
                                </button>

                                <button onClick={() => this.hideShowPrompt("promptCreateRoom")} name="msgBtn" type="button" className="btn">
                                    <img src={addGroupImg} alt="add user"/>
                                    <span className="tooltiptext">Create group</span>
                                </button>

                                <button onClick={() => this.hideShowPrompt("promptSearchUser")} name="msgBtn" type="button" className="btn">
                                    <img src={addUserImg} alt="add user"/>
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
                            //console.log('message-block: e:',e,", a:",a);
                            let eUser = {};
                            let eStore = {};
                            if (a !== undefined && e !== undefined) {eUser = this.state[a][e]}
                            else eUser = undefined;
                            if(eUser !== undefined && eUser.name !== undefined) {eStore = this.state.messagesStore[eUser.name]}
                            else eStore = undefined;
                            return (
                                <div className="message-block">
                                    <div name="chatRoom" id="chatDiv">
                                        {a === "rooms" ?
                                            <div onClick={() => this.hideShowProps("roomPropsWindow")}>
                                                <ItmProps room={eUser}/>
                                            </div> : e !== undefined ?
                                                <div onClick={() => this.hideShowProps("userPropsWindow")}>
                                                    <ItmProps user={eUser}/>
                                                </div> : ""}

                                        <ul onScroll={(evn)=>this.onScrollHandler(evn,eUser.name,a,e)} name="InpUl" className="chat-list" ref="InpUl">
                                            {
                                                (eUser && eStore) ? (
                                                    eStore.map((data, i) => {
                                                        return (
                                                            (data.user === this.state.user.username)?(
                                                                <li key={i} className="right">{data.text}
                                                                    <span className="messageData">{data.user}
                                                                        <span className="messageTime">{this.dateToString(data.date)}</span>
                                                                        <span className="messageTime">{data.status === true ? " R" : Array.isArray(data.status) ? (
                                                                             data.status.map((name,i) => <span key={i} className="messageTime">{name}</span>)
                                                                           ):("")}</span>
                                                                    </span>
                                                                </li>
                                                            ):(
                                                                <VisibilitySensor
                                                                    key={i+"VisibilitySensor"}
                                                                    containment={this.refs.InpUl}
                                                                    onChange={(inView)=> inView && data.status !== true ? this.setAsRead(eUser.name,i,a,e,data._id) : ""}
                                                                >
                                                                    <li key={i}
                                                                        onClick={()=>{
                                                                            data.status === false || (Array.isArray(data.status) && !data.status.includes(this.state.user.username)) ?
                                                                                this.setAsRead(eUser.name,i,a,e,data._id) : ""
                                                                        }}

                                                                    >{data.text}
                                                                        <span className="messageData">{data.user}
                                                                            <span className="messageTime">{this.dateToString(data.date)}</span>
                                                                            {data.status === true ?
                                                                                "" : Array.isArray(data.status) ? data.status.includes(this.state.user.username) ? "" :
                                                                                    <span className="messageTime">UR</span> :
                                                                                    <span className="messageTime">UR</span>
                                                                            }

                                                                        </span>
                                                                    </li>
                                                                </VisibilitySensor >

                                                            )
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


