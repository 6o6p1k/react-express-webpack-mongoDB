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
        super(props);
        this.state = {
            modalWindow:false,
            modalFoundContacts:false,
            userBtnClassActive: false,
            errorRedirect: false,
            loginRedirect:false,
            err:{},
            user: user,
            messages: [],
            msgCounter: 0,
            message: '',
            users: [],
            filteredUsers: [],
            foundContacts: [],
            unregisteredContacts: [],
            messageBlockHandlerId: undefined,
            confirmRes:undefined,
            ConfirmModalWindow:false,
            confirmMessage:""
        };
    }

    componentDidUpdate(prevProps, prevState){
        if(this.state.messageBlockHandlerId !== undefined) {
            //console.log("this.state.messageBlockHandlerId: ",this.state.messageBlockHandlerId,",","prevState.users: ",prevState.users);
            if(this.state.users[this.state.messageBlockHandlerId] === undefined || prevState.users[this.state.messageBlockHandlerId].name !== this.state.users[this.state.messageBlockHandlerId].name) {
                this.setState({messageBlockHandlerId: undefined});
            }
        }
        //move scroll bootom
        //this.scrollToBottom(this.refs.InpUl);
    }

    componentDidMount(){
        //move scroll bootom
        this.scrollToBottom(this.refs.InpUl);

        let socket = io.connect('', {reconnection: true});
        this.socket = socket
            .emit('getUsers', (data)=> {
                //console.log("getUsers: ",data);
                let userList = data.filter((itm)=> itm.name !== this.state.user.username);//filter != current user
                //console.log("getUsers userList filtered: ",userList);
                this.setState({users: userList});
            })
            .emit('getGlobalLog', (messages)=> {
                //console.log('getGlobalLog: ',messages);
                this.setState({messages: messages});
            })
            .on('addUsers', (data)=> {this.addUser(data)})
            .on('remuveUserName', (data)=> {this.remuveUserName(data)})
            .on('messageGlobal', (data)=> {
                //receiver
                //console.log('receiverGlobal data: ',data);
                this.printMessage({name:data.user,text:data.text,status:data.status,date:data.date},undefined);//{ user: username, text: text, status: false, date: dateNow}
                this.msgCounter(undefined);
            })
            .on('message', (data)=> {
                //receiver
                this.printMessage({name:data.user,text:data.text,status:data.status,date:data.date},this.getUsersIdx(data.user));
                this.msgCounter(this.getUsersIdx(data.user));
            })
            .on('typing', (username)=> {
                //receiver
                this.typingHandler(this.getUsersIdx(username));
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
            })
    }

    componentWillUnmount(){
        this.socket.disconnect();
    };

    getUserLog =(reqUsername,reqMesCountCb)=>{
        let reqUser = this.state.users[this.getUsersIdx(reqUsername)];
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

/*    setFiltered = (nameStr) => {
        if(nameStr.length === 0) this.setState({filteredUsers: []});
        this.setState({filteredUsers: this.state.users.filter(this.filterSearch(nameStr))});
        //console.log('nameStr: ',nameStr,', ','filteredUsers: ',this.state.filteredUsers);
    };*/

    setFiltered = (nameStr) => {
        if(nameStr.length === 0) this.setState({filteredUsers: []});
        this.setState({filteredUsers: this.state.users.filter(this.filterSearch(nameStr))},()=>{
            if(this.state.filteredUsers.length === 0) {
                this.socket.emit('findContacts', nameStr,(usersArr)=>{
                    this.setState({
                        foundContacts:usersArr,
                        modalFoundContacts:true
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

    inxHandler =(inx)=> {
        //console.log('inxHandler: ',inx);
        this.setState({messageBlockHandlerId: inx});
        const eUser = this.state.users[inx];
        if (inx === undefined && this.state.msgCounter !== 0) {
            this.setState({msgCounter:0})
        } else {
            if (eUser && eUser.msgCounter !== 0) {
                eUser.msgCounter = 0;
                this.setState({eUser});
            }
        }
    };

    sendMessage =(i)=> {
        //transmit
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
            const reqUser = this.state.users[i];
            const socketId = reqUser.sId;
            const reqUserName = reqUser.name;
            this.socket.emit('message', text,socketId,reqUserName,currentDate, ()=> {
                this.printMessage({name:this.state.user.username,text:text,date:currentDate,status:false},i);
            });
            this.setState({message:''});
            return false;
        }

    };

    getUsersIdx =(username)=> {
        return this.state.users.map((itm)=>{return itm.name;}).indexOf(username);
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

    addUser =(data)=> {
        data.messages = [];
        data.msgCounter = 0;
        data.typing = false;
        let checkUsers = (this.state.users).map(i => i.name).includes(data.name);
        //console.log('checkUsers: ',checkUsers);
        if(!checkUsers && data.name !== this.state.user.username) this.setState({users: [...this.state.users,data]});
    };

    remuveUserName =(dataName)=> {
        let tempUsers = this.state.users;
        tempUsers = tempUsers.filter((i)=>{
            return i.name !== dataName;
        });
        this.setState({users: tempUsers});
    };

    hideModal =()=> {
        this.setState({modalWindow: false});
    };

    addMe =(name)=> {
        this.setState({
            ConfirmModalWindow:false,
            confirmMessage:"Send a request to the user "+name+" to add you?"
        })
    };

    confirmHandler = (confirmRes) => {
        console.log('confirmRes: ',confirmRes);
        if(confirmRes){
            this.socket.emit('findContacts', nameStr,(usersArr)=>{
                this.setState({
                    foundContacts:usersArr,
                    modalFoundContacts:true
                });
            })
        }else{

        }
        this.setState({
            confirmRes: confirmRes,
            ConfirmModalWindow: false,
            confirmMessage:""
        });
    };



    render() {

/*        const UserBtn =(props)=> {
            //console.log('UserBtn props: ',props);
            let itm = props.itm;
            let i = props.i;
            return (
                <button key={i} onClick={()=>this.inxHandler(i)} name={itm.name}  type="button" className={(this.state.messageBlockHandlerId === i)?"btn clicked":"btn"}>
                    {itm.name}
                    {(this.state.users[i].msgCounter !== 0)?(
                        <div className="unread-mess">
                            {this.state.users[i].msgCounter}
                        </div>
                    ):('')}
                    <div className="typing">
                        {(this.state.users[i].typing)?(
                            <div className="loader">
                                <span/>
                            </div>
                        ):('')}
                    </div>
                </button>
            )
        };*/
        //console.log('/chat user:', this.state);
        if(this.state.errorRedirect) {return <Redirect to='/error'/>}//passing props in Redirect to={{pathname:'/error',state:{error:this.state.err}}} get props: this.props.location.state.error
        if(this.state.loginRedirect) {return <Redirect to='/login'/>}
        return (
            <Page user={this.state.user} title="CHAT PAGE" className="container">
                {(this.state.modalWindow)?(
                    <Modal show={this.state.modalWindow} handleClose={this.hideModal} err={this.state.err}/>
                ):('')}
                {(this.state.ConfirmModalWindow)?(
                    <Confirm confirmHandler={this.confirmHandler} show={this.state.ConfirmModalWindow} message={this.state.confirmMessage}/>
                ):('')}
                <div className="chat-room">
                    <div className="chat-users">
                        <div className="login-form">
                            <input name="nameSearchInp" className="form-control" autoComplete="off" autoFocus placeholder="Search..."
                                    onChange={ev => this.setFiltered(ev.target.value)}
                            />
                            <button  key='GC' onClick={()=>this.inxHandler(undefined)} type="button" className={(this.state.messageBlockHandlerId === undefined)?"btn clicked":"btn"}>
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
                                            addMe={this.addMe(name)}
                                        />)
                                    ):(
                                        this.state.users.map((itm,i) => <UserBtn
                                            key={i}
                                            itm={itm}
                                            i={i}
                                            getUserLog={this.getUserLog}
                                            inxHandler={this.inxHandler}
                                            userData={this.state.users[this.getUsersIdx(itm.name)]}
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
                                            i={this.getUsersIdx(itm.name)}
                                            getUserLog={this.getUserLog}
                                            inxHandler={this.inxHandler}
                                            userData={this.state.users[this.getUsersIdx(itm.name)]}
                                            messageBlockHandlerId={this.state.messageBlockHandlerId}
                                        />)
                                )
                            }
                            <div>black list users</div>
                            {
                                (this.state.unregisteredContacts.length !== 0)? (
                                    this.state.unregisteredContacts.map((itm,i) =>
                                        <div className="searchedItems" key={i}>
                                            {itm}
                                            {/*cheackBox with handler add to selectedNames*/}
                                        </div>)
                                ):("")
                            }
                        </div>
                    </div>

                    {
                        ((e) => {
                            //console.log('message-block: e:',e);
                            const eUser = this.state.users[e];
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
                                                <span className="input-group-btn">
                                                    <button onClick={() => this.sendMessage(e)} name="msgBtn" type="button" className="btn">SEND</button>
                                                </span>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            );
                        })(this.state.messageBlockHandlerId)
                     }

                </div>
            </Page>
        );
    }
}

export default Chat;


