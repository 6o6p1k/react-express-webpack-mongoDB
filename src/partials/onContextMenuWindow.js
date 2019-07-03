import React from 'react';


class OnContextMenu extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            onEnterUserList:false,
            onEnterUserRoomList:false,
            onEnterBanUserRoomList:false,
        }
    }

    showHideList =(list)=>{
        this.setState({[list]: !this.state[list]});
    };



    render() {
        const OnEnterUserList =()=>{
            return (
                <ul className="userInvite"  >
                    {this.props.userList.map((name,i) => <li className='dropDownBtn' key={i} onClick={()=>{this.props.onContextMenuResponse("inviteUser",name)}}>{name}</li>)}
                </ul>
            )
        };
        const OnEnterUserRoomList =()=>{
            return (
                <ul className="userInvite" >
                    {this.props.userRoomList.map((name,i) => <li className='dropDownBtn' key={i} onClick={()=>{this.props.onContextMenuResponse("banRoomUser",name)}}>{name}</li>)}
                </ul>
            )
        };
        const OnEnterBanUserRoomList =()=>{
            return (
                <ul className="userInvite" >
                    {this.props.userBanRoomList.map((name,i) => <li className='dropDownBtn' key={i} onClick={()=>{this.props.onContextMenuResponse("unBanRoomUser",name)}}>{name}</li>)}
                </ul>
            )
        };
        return (

            <div>
                {this.props.roomList === true ?(
                    <ul className="userDropDown"  style={this.props.contextMenuLocation}>
                        <li className='dropDownBtn invite' onMouseEnter={(e)=>{e.preventDefault();e.stopPropagation();this.showHideList("onEnterUserList")}} onMouseLeave={()=>this.showHideList("onEnterUserList")} >Invite user
                            <OnEnterUserList/>
                        </li>
                        <li className='dropDownBtn invite' onMouseEnter={(e)=>{e.preventDefault();e.stopPropagation();this.showHideList("onEnterUserRoomList")}} onMouseLeave={()=>this.showHideList("onEnterUserRoomList")} >Ban user
                            <OnEnterUserRoomList/>
                        </li>
                        {
                            this.props.userBanRoomList.length !== 0 ?
                                <li className='dropDownBtn invite' onMouseEnter={(e)=>{e.preventDefault();e.stopPropagation();this.showHideList("onEnterBanUserRoomList")}} onMouseLeave={()=>this.showHideList("onEnterBanUserRoomList")} >Unban user
                                    <OnEnterBanUserRoomList/>
                                </li> : ''
                        }
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("moveRoomOnTop")}}>Move group on top</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("viewRoomData")}}>View group data</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("clearRoomWindow")}}>Clear group window</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("leaveRoom")}}>Leave group</li>

                    </ul>
                ):(
                    <ul className="userDropDown" onMouseLeave={this.props.rightClickMenuOnHide} style={this.props.contextMenuLocation}>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("moveOnTop")}}>Move on top</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("viewUserData")}}>View user data</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("clearChatWindow")}}>Clear chat window</li>
                        {this.props.banList === false ?
                            <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("banUser")}}>Ban user</li>:
                            <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("unBanUser")}}>Allow user</li>
                        }
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("deleteUser")}}>Delete user</li>
                        {this.props.authorizedStatus === false ?
                            <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("reqAuth")}}>Request authorization</li>:""
                        }
                    </ul>
                )}

            </div>
        )
    }
}

export default OnContextMenu;