import React from 'react';


class RoomManager extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            room: this.props.room

        }
    }

    render() {
        console.log("roomManager: ", this.props.room);

        return (
            <div>
                <div className="chat-room-info">
                    <a className="chat-room-name">{this.state.room.name}: </a>
                    <a className="chat-room-members-count">{this.state.room.members.length} members</a>
                    {this.state.room.blockedContacts.length > 0 ? <a className="chat-room-members-count">{this.state.room.members.length} members</a>:""}
                    <a className="chat-room-members-count">, {this.state.room.messages.length} messages.</a>
                </div>
            </div>
        )
    }
}

export default RoomManager;