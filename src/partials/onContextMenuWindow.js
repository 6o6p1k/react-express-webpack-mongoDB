import React from 'react';
//import OnContextUserList from './onContextListWindow.js'

class OnContextMenu extends React.Component {

    onEnterUserList =()=>{
        console.log("onEnterUserList");
        return (
            <ul className="userDropDown" onMouseLeave={this.props.rightClickMenuOnHide}>

                {this.props.userList.map(name => {
                    <li className='dropDownBtn' onClick={()=>{this.props.onContextMenuResponse("Invite user",name)}}>{name}</li>
                })}

            </ul>
            )
    };

    render() {
        return (
            <ul className="userDropDown" onMouseLeave={this.props.rightClickMenuOnHide} style={this.props.contextMenuLocation}>
                {this.props.roomList === true ?(
                    <div>
                        <li className='dropDownBtn' onMouseEnter={(e)=>{e.preventDefault();e.stopPropagation();this.onEnterUserList()}}>Invite user</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("moveOnTop")}}>Move on top</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("viewRoomData")}}>View group data</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("clearChatWindow")}}>Clear chat window</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("deleteRoom")}}>Delete and exit</li>
                    </div>
                ):(
                    <div>
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
                    </div>
                )}
            </ul>
        )
    }
}

export default OnContextMenu;