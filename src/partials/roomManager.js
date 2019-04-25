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
                    <div className="chat-room-name">{this.state.room.name}</div>
                    {this.state.room.blockedContacts.length > 0 ? <div className="chat-room-members-count">{this.state.room.members.length} members</div>:""}
                    <div className="chat-room-members-count">{this.state.room.messages.length} messages</div>
                </div>
            </div>
        )
    }
}

export default RoomManager;