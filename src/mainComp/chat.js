import React from 'react';
import Page from '../layout/page.js';
import io from 'socket.io-client';
import {Redirect} from 'react-router-dom'
import UserBtn from '../partials/userBtn.js'
import Modal from '../partials/modalWindow.js'
import Confirm from '../partials/confirmModalWindow.js'


class Chat extends React.Component {

    constructor(props) {
        let user = JSON.parse(sessionStorage.getItem('user')).user;
        console.log("/chat user: ",user);
        super(props);
        this.state = {
            modalWindow:false,
            errorRedirect: false,
            loginRedirect:false,
            err:{},

            user: user,

            messages: [],
            msgCounter: 0,

            message: '',

            users: this.addUsers(user.contacts) || [],
            filteredUsers: [],
            foundContacts: [],
            unregisteredContacts: this.addUsers(user.blockedContacts) || [],

            arrayBlockHandlerId: undefined,
            messageBlockHandlerId: undefined,

            resAddMeHandler:false,
            resAddMeAddMeName:"",
            addMeHandler:false,
            reqAddMeName:"",
            confirmMessage:"",
        };
        console.log("/chat this.state: ",this.state);
    }

    componentDidUpdate(prevProps, prevState){
        if(prevState.unregisteredContacts.length !== this.state.unregisteredContacts.length || prevState.users.length !== this.state.users.length) {
            this.setState({
                arrayBlockHandlerId: undefined,
                messageBlockHandlerId: undefined,
            })
        }


        //move scroll bootom
        //this.scrollToBottom(this.refs.InpUl);
    }

    componentDidMount(){
        //move scroll bootom
        this.scrollToBottom(this.refs.InpUl);

        let socket = io.connect('', {reconnection: true});
        this.socket = socket
            .on('updateUserData',(userData)=>{
                this.setState({
                    user:userData,
                    users:this.addUsers(userData.contacts),
                    unregisteredContacts:this.addUsers(userData.blockedContacts),
                });
            })

            .emit('getGlobalLog', (messages)=> {
                //console.log('getGlobalLog: ',messages);
                this.setState({messages: messages});
            })
            .emit('getUsersOnLine', (onLineUsers)=>{
                console.log("getUsersOnLine: ",onLineUsers);
                let users = this.state.users;
                users.map((itm,i) => onLineUsers.includes(itm.name) ? users[i].onLine = true : users[i].onLine = false );
                this.setState({users:users})
            })
            .on('updateUsers',(userData)=>{
                this.setState({
                    users:userData.contacts,
                    unregisteredContacts:userData.blockedContacts,
                });
            })
            .on('onLine', (name)=> {
                console.log('receiver user onLine: ',name);
                let users = this.state.users;
                if(this.getUsersIdx("users",name) !== -1) users[this.getUsersIdx("users",name)].onLine = true;
                this.setState({users:users});
            })
            .on('offLine', (name)=> {
                //console.log('receiver user offLine: ',name);
                let users = this.state.users;
                if(this.getUsersIdx("users",name)!== -1) users[this.getUsersIdx("users",name)].onLine = false;
                this.setState({users:users});
            })
            .on('messageGlobal', (data)=> {
                //receiver
                //console.log('receiverGlobal data: ',data);
                this.printMessage({name:data.user,text:data.text,status:data.status,date:data.date},undefined);//{ user: username, text: text, status: false, date: dateNow}
                this.msgCounter(undefined);
            })
            .on('message', (data)=> {
                //receiver
                this.printMessage({name:data.user,text:data.text,status:data.status,date:data.date},this.getUsersIdx("users",data.user));
                this.msgCounter(this.getUsersIdx("users",data.user));
            })
            .on('typing', (username)=> {
                //receiver
                this.typingHandler(this.getUsersIdx("users",username));
            })

            .on('error',(message)=>{
                console.log('Server error happened: ',message);
                if(typeof message === 'string' || message instanceof String) {
                    let data = JSON.parse(message);
                    if(data.status == 423 || data.status == 401) {
                        this.setState({err: data});
                        sessionStorage.setItem('error', message);
                        console.log('this.state.err: ',this.state.err);
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
                console.log('logout');
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('error');
                this.setState({loginRedirect:true})
            });
    }

    componentWillUnmount(){
        this.socket.disconnect();
    };

    getUserLog =(reqUsername,reqArrName,reqMesCountCb)=>{
        let reqUser = this.state[reqArrName][this.getUsersIdx(reqArrName,reqUsername)];
        this.socket.emit('getUserLog',reqUsername,reqMesCountCb,(arr)=>{
            console.log("getUserLog: ",arr);
            reqUser.messages = arr;
            this.setState({reqUser});
        })
    };

    scrollToBottom = (element) => {
        element.scrollTop = element.scrollHeight;
    };

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

    typing =(sId,ev)=> {
        //console.log('this.typing sId: ', sId);
        this.setState({message: ev.target.value});
        if(sId) {this.socket.emit('typing', sId)}
    };

    typingHandler =(i)=> {
        const typingUser = this.state.users[i];
        typingUser.typing = true;
        this.setState({typingUser});
        setTimeout(()=>{
            typingUser.typing = false;
            this.setState({typingUser});
        },2000)
    };

    msgCounter =(i)=> {
        if (i === undefined ) {
            //console.log('msgCounter !i : ', i);
            if(this.state.messageBlockHandlerId !== undefined) this.setState({msgCounter: this.state.msgCounter + 1});
        } else {
            if(this.state.messageBlockHandlerId !== i) {
                const currentUser = this.state.users[i];
                currentUser.msgCounter = currentUser.msgCounter + 1;
                this.setState({currentUser});
                //console.log('msgCounter i: ', i, 'user[i]: ', user);
            }
        }
    };

    inxHandler =(arrName,inx)=> {
        console.log('inxHandler arrName: ',arrName,", arrName inx: ", inx);
        this.setState({
            messageBlockHandlerId: inx,
            arrayBlockHandlerId:arrName
        });
        if(arrName === undefined || inx === undefined) return;
        const eUser = this.state[arrName][inx];
        if (inx === undefined && this.state.msgCounter !== 0) {
            this.setState({msgCounter:0})
        } else {
            if (eUser && eUser.msgCounter !== 0) {
                eUser.msgCounter = 0;
                this.setState({eUser});
            }
        }
    };

    sendMessage =(name)=> {
        //console.log('this.sendMessage i: ', i);
        const currentDate = new Date();
        const text = this.state.message;
        if (i === undefined) {
            //console.log('this.sendMessage text: ', text,",","currentDate: ",currentDate);
            this.socket.emit('message', text,null,null,currentDate, ()=> {
                this.printMessage({name:this.state.user.username,text:text,date:currentDate,status:false});
            });
            this.setState({message:''});
            return false;
        } else {
            this.socket.emit('message', text,name,currentDate, ()=> {
                this.printMessage({name:this.state.user.username,text:text,date:currentDate,status:false},i);
            });
            this.setState({message:''});
            return false;
        }

    };

    getUsersIdx =(arrName,username)=> {
        return this.state[arrName].map((itm)=>{return itm.name;}).indexOf(username);
    };

    printMessage =(data,i)=> {
        console.log("printMessage: ",data);
        let currentdate = new Date(data.date);
        let datetime = currentdate.getDate() + "/"
            + (currentdate.getMonth()+1)  + "/"
            + currentdate.getFullYear() + " @ "
            + currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();
        if (i === undefined) {
            this.setState({messages: [...this.state.messages,{user:data.name,text:data.text,status:data.status,date:datetime}]});
            //console.log('this.state.messages: ',this.state.messages);
        } else {
            const currentUser = this.state.users[i];
            currentUser.messages = [...currentUser.messages,{user:data.name,text:data.text,status:data.status,date:datetime}];
            this.setState({currentUser});
            //console.log('this.state.users[i]: ',this.state.users[i]);
        }
    };

    addUsers =(nameArr)=> {
        nameArr.map((name,i) =>{
            nameArr[i] = {
                name:name,
                messages:[],
                msgCounter :0,
                typing:false,
                onLine:false,
            }
        });
        return nameArr;
    };

    hideModal =()=> {
        this.setState({modalWindow: false});
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
                }
                this.setState({
                    users:userData.contacts,
                    unregisteredContacts:userData.blockedContacts,
                    addMeHandler: false,
                    confirmMessage:"",
                    reqAddMeName:"",
                });
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
        console.log('resAddMeHandler: ',confirmRes);
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
                }
                this.setState({
                    users:userData.contacts,
                    unregisteredContacts:userData.blockedContacts,
                    resAddMeHandler:false,
                    resAddMeAddMeName:"",
                    confirmMessage:""
                });
            })
        }else{
            this.setState({
                resAddMeHandler:false,
                resAddMeAddMeName:"",
                confirmMessage:""
            });
        }
    };



    render() {

        //console.log('/chat user:', this.state);
        if(this.state.errorRedirect) {return <Redirect to='/error'/>}//passing props in Redirect to={{pathname:'/error',state:{error:this.state.err}}} get props: this.props.location.state.error
        if(this.state.loginRedirect) {return <Redirect to='/login'/>}
        return (
            <Page user={this.state.user} title="CHAT PAGE" className="container">
                {(this.state.modalWindow)?(
                    <Modal show={this.state.modalWindow} handleClose={this.hideModal} err={this.state.err}/>
                ):('')}
                {(this.state.addMeHandler)?(
                    <Confirm confirmHandler={this.addMeHandler} show={this.state.addMeHandler} message={this.state.confirmMessage}/>
                ):('')}
                {(this.state.resAddMeHandler)?(
                    <Confirm confirmHandler={this.resAddMeHandler} show={this.state.resAddMeHandler} message={this.state.confirmMessage}/>
                ):('')}
                <div className="chat-room">
                    <div className="chat-users">
                        <div className="login-form">
                            <input name="nameSearchInp" className="form-control" autoComplete="off" autoFocus placeholder="Search..."
                                    onChange={ev => this.setFiltered(ev.target.value)}
                            />
                            <button  key='GC' onClick={()=>this.inxHandler(undefined,undefined)} type="button" className={(this.state.messageBlockHandlerId === undefined)?"btn clicked":"btn"}>
                                GLOBAL CHAT
                                {(this.state.msgCounter !== 0)?(
                                    <div className="unread-mess">
                                        {this.state.msgCounter}
                                    </div>
                                ):('')}
                            </button>
                            {
                                (this.state.filteredUsers.length === 0)?(
                                    (this.state.foundContacts.length !== 0)? (
                                        this.state.foundContacts.map((name,i) =><UserBtn
                                            key={i}
                                            i={i}
                                            itm={{name:name}}
                                            addMe={this.addMe}
                                        />)
                                    ):(
                                        this.state.users.map((itm,i) => <UserBtn
                                            key={i}
                                            itm={itm}
                                            i={i}
                                            getUserLog={() => this.getUserLog(itm.name,"users",null)}
                                            inxHandler={()=> this.inxHandler("users",i)}
                                            userData={this.state.users[this.getUsersIdx("users",itm.name)]}
                                            messageBlockHandlerId={this.state.messageBlockHandlerId}
                                        />)
                                    )

                                ):(
                                    this.state.users.filter(items => this.state.filteredUsers
                                        .map(i => i.name)
                                        .includes(items.name))
                                        .map((itm,i) => <UserBtn
                                            key={i}
                                            itm={itm}
                                            i={this.getUsersIdx("users",itm.name)}
                                            getUserLog={(reqUsername,reqArrName,reqMesCountCb) => this.getUserLog(itm.name,"users",null)}
                                            inxHandler={(arrName,inx) => this.inxHandler("users",i)}
                                            userData={this.state.users[this.getUsersIdx("users",itm.name)]}
                                            messageBlockHandlerId={this.state.messageBlockHandlerId}
                                        />)
                                )
                            }
                            <div>black list users</div>
                            {
                                (this.state.unregisteredContacts.length !== 0)? (
                                    this.state.unregisteredContacts.map((itm,i) =>
                                        <UserBtn
                                            key={i}
                                            itm={itm}
                                            i={i}
                                            getUserLog={(reqUsername,reqArrName,reqMesCountCb) => this.getUserLog(itm.name,"unregisteredContacts",null)}
                                            inxHandler={(arrName,inx) => this.inxHandler("unregisteredContacts",i)}
                                            userData={this.state.unregisteredContacts[this.getUsersIdx("unregisteredContacts",itm.name)]}
                                            messageBlockHandlerId={this.state.messageBlockHandlerId}
                                        />)
                                ):("")
                            }
                        </div>
                    </div>

                    {
                        ((a,e) => {
                            console.log('message-block: e:',e,", a:",a);
                            let eUser = undefined;
                            if(a !== undefined && e !== undefined) {
                                eUser = this.state[a][e];
                                console.log('eUser: ',eUser);
                            }

                            return (
                                <div className="message-block">
                                    <div name="chatRoom" id="chatDiv">
                                        <ul name="InpUl" className="chat-list" ref="InpUl">
                                            {
                                                (e === undefined || !eUser) ? (
                                                    this.state.messages.map((data, i) => {
                                                        return (
                                                            <li key={i}
                                                                className={(data.user === this.state.user.username) ? ("right") : ("")}>{data.user + '>>>' + data.text + '>>>' + data.date}</li>
                                                        )
                                                    })
                                                ) : (
                                                    eUser.messages.map((data, i) => {
                                                        return (
                                                            <li key={i}
                                                                className={(data.user === this.state.user.username) ? ("right") : ("")}>{data.user + '>>>' + data.text + '>>>' + data.date}</li>
                                                        )
                                                    })
                                                )
                                            }
                                        </ul>
                                        <form onSubmit={(ev) => {
                                                ev.preventDefault();
                                                ev.stopPropagation();
                                                this.sendMessage(e)
                                        }}
                                              name="chatRoomForm">
                                            <div className="input-group">
                                                <input name="formInp" className="form-control" autoComplete="off"
                                                       autoFocus placeholder="Message..."
                                                       value={this.state.message}
                                                       onChange={ev => (eUser) ? (this.typing(eUser.sId, ev)) : (this.typing(null, ev))}
                                                />
                                                {
                                                    (a !== "unregisteredContacts") ? (
                                                        <span className="input-group-btn">
                                                            <button onClick={() => this.sendMessage(e)} name="msgBtn" type="button" className="btn">SEND</button>
                                                        </span>
                                                    ):(
                                                        <span className="input-group-btn">
                                                            <button onClick={() => this.resAddMe(eUser.name)} name="msgBtn" type="button" className="btn">SEND RESPONSE TO ADD</button>
                                                        </span>
                                                    )
                                                }

                                            </div>
                                        </form>
                                    </div>
                                </div>
                            );
                        })(this.state.arrayBlockHandlerId,this.state.messageBlockHandlerId)
                     }

                </div>
            </Page>
        );
    }
}

export default Chat;


