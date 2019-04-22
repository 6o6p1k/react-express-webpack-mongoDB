import React from 'react';




class OnContextMenu extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            onEnterUserList:false,

        }
    }

    showHideUserList =()=>{
        this.setState({onEnterUserList: !this.state.onEnterUserList},()=>console.log("showHideUserList: ",this.state.onEnterUserList))
    };



    render() {
        const OnEnterUserList =()=>{
            console.log("onEnterUserList: ",this.props.userList);
            return (
                <ul className="userDropDown"  onMouseLeave={()=>this.showHideUserList()}>
                    {this.props.userList.map((name,i) => <li className='dropDownBtn' key={i} onClick={()=>{this.props.onContextMenuResponse("Invite user",name)}}>{name}</li>)}
                </ul>
            )
        };
        return (
            <div>
                {this.props.roomList === true ?(
                    <ul className="userDropDown" onMouseLeave={this.props.rightClickMenuOnHide} style={this.props.contextMenuLocation}>
                        {this.state.onEnterUserList ? <OnEnterUserList/>:""}
                        <li className='dropDownBtn' onMouseEnter={(e)=>{e.preventDefault();e.stopPropagation();this.showHideUserList()}} onMouseLeave={()=>this.showHideUserList()} >Invite user</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("moveOnTop")}}>Move on top</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("viewRoomData")}}>View group data</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("clearChatWindow")}}>Clear chat window</li>
                        <li className='dropDownBtn' onClick={(e)=>{e.preventDefault();e.stopPropagation();this.props.onContextMenuResponse("deleteRoom")}}>Delete and exit</li>
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