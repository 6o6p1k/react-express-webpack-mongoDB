import React from 'react';
import OnContextMenu from './onContextMenuWindow.js'
let contentMenuStyle = {
    display: location ? 'block' : 'none',
    position: 'absolute',
    left: location ? location.x : 0,
    top: location ? location.y : 0
};
class UserBtn extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            onContextMenu: false,
            onContextMenuUserName:"",
            authorizedStatus:undefined,
            banStatus:undefined,
            contextMenuLocation: contentMenuStyle
        }
    }

    componentDidMount(){

    }

    rightClickMenuOn =(itm,e)=> {
        //console.log("rightClickMenuOn itm: ",itm);
        //console.log("rightClickMenuOn e.pageX: ",e.pageX," ,e.pageY",e.pageY);
        this.setState({
            onContextMenu:true,
            onContextMenuUserName:itm.name,
            authorizedStatus:itm.authorized,
            banStatus:itm.banned,
            contextMenuLocation: {left: e.pageX, top:e.pageY}
        })
    };

    rightClickMenuOnHide =()=> {
        //console.log("rightClickMenuOnHide");
        this.setState({
            onContextMenu: false,
            onContextMenuUserName:"",
            authorizedStatus:undefined,
            banStatus:undefined,
            contextMenuLocation: contentMenuStyle
        });
    };

    onContextMenuResponse =(res,username)=> {
        //console.log("onContextMenuResponse res: ", res);
        switch (res){
            case "inviteUser":
                this.props.onContextMenuHandler(res,username,this.state.onContextMenuUserName);
                this.setState({onContextMenu:false});
                break;
            case "leaveRoom" || "viewRoomData" || "moveRoomOnTop" || "clearRoomWindow":
                this.props.onContextMenuHandler(res,null,this.state.onContextMenuUserName);
                this.setState({onContextMenu:false});
                break;
            default:
                this.props.onContextMenuHandler(res,this.state.onContextMenuUserName,null);
                this.setState({onContextMenu:false});
        }
    };

    render() {
        console.log('UserBtn props: ',this.props.itm);
        let itm = this.props.itm;
        let i = this.props.i;
        return (
            <div key={i}
                 onClick={()=>{
                     if(this.props.addMe) {
                     this.props.addMe()
                 } else {
                         this.props.inxHandler();
                         this.props.getUserLog();
                 }}}
                 onContextMenu={(e)=>{e.preventDefault();this.rightClickMenuOn(itm,e); return false;}}
                 onMouseLeave={this.rightClickMenuOnHide}
                 type="button"
                 className={`btn user ${this.props.messageBlockHandlerId === i ?"clicked ":""}`}>
                {this.props.roomList ?
                    <div className="user-icon">
                        <img src="../../img/group-of-people-in-a-formation.png" alt=""/>
                    </div>
                : itm.banned ?
                        <div className="user-icon">
                            <img src="../../img/profile-red.png" alt=""/>
                        </div>
                : itm.authorized ?
                        <div className="user-icon">
                            <img src="../../img/profile.png" alt=""/>
                        </div>
                 :""}

                {itm ?
                    <div className="userStatus">
                        <ul>


                            <li>
                                {itm.msgCounter !== 0 || itm.msgCounter === undefined ?
                                    <div className="unread-mess">
                                       {itm.msgCounter}
                                    </div>
                                    :""}
                            </li>
                            {!this.props.roomList ? <li className={` statusNet ${itm.onLine ? "onLine":"offLine"}`}/>:""}

                        </ul>
                    </div>
                    :""}
                {this.props.name ? <font>{this.props.name}</font> : <font color={!itm.authorized ? "#a2a215" : itm.banned ? "#c33131": itm.onLine ? "#fff" :"#a09b9b"}>{itm.name}</font>}
                {itm ?
                        <div className="userItm">
                            <div className="typing">
                                {itm.typing ?
                                    <div className="loader">
                                        <span/>
                                    </div>
                                    :""}
                            </div>
                        </div>
                    :""}
                {this.state.onContextMenu ?
                    <OnContextMenu
                        authorizedStatus={this.state.authorizedStatus}
                        banList={this.props.banList}
                        roomList={this.props.roomList}
                        rightClickMenuOnHide={this.rightClickMenuOnHide}
                        onContextMenuResponse={this.onContextMenuResponse}
                        contextMenuLocation={this.state.contextMenuLocation}
                        userList={this.props.userList}
                    />
                    :''}
            </div>
        )
    }
}

export default UserBtn;
