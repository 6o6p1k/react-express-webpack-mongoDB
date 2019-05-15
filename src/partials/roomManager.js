import React from 'react';


class RoomManager extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            room: this.props.room

        }
    }

    dateToString =(datestr)=> {
        let currentdate = new Date(datestr);
        return currentdate.getHours() + ":" + currentdate.getMinutes() + "/" + currentdate.getDate() + ":" + (currentdate.getMonth()+1) + ":" + currentdate.getFullYear()// + ":"+ currentdate.getSeconds();
    };

    render() {
        console.log("roomManager: ", this.props.room);

        return (
            <div>
                <div className="chat-room-info">
                    <a className="chat-room-name">{this.state.room.name}: </a>
                    <a className="chat-room-members-count">{this.state.room.members.length} members</a>
                    {this.state.room.blockedContacts.length > 0 ? <a className="chat-room-members-count">{this.state.room.members.length} members</a>:""}
                    <a className="chat-room-members-count">, {this.state.room.messages.length} messages.</a>
                    <a className="chat-room-members-count"> Created at: {this.dateToString(this.state.room.created_at)}</a>
                </div>
            </div>
        )
    }
}

export default RoomManager;