import React from 'react';

class RoomPropsWindow extends React.Component {
    constructor (props) {
        super(props);
        this.state = {

        };
    };

    dateToString =(datestr)=> {
        let currentdate = new Date(datestr);
        return currentdate.getHours() + ":" + currentdate.getMinutes() + "/" + currentdate.getDate() + ":" + (currentdate.getMonth()+1) + ":" + currentdate.getFullYear()// + ":"+ currentdate.getSeconds();
    };


    render() {
        console.log('groupPropsWindow: ',this.props);
        let currentRoom = this.props.curentRoom;

        return (
            <div className={this.props.show ? 'modal display-block' : 'modal display-none'}>
                <section className='modal-main'>
                    <div className='modal-main-btnRight' onClick={this.props.handleClose}>X</div>
                    <h1 className="chat-room-name">{currentRoom.name}: </h1>

                    <div className="chat-room-info">
                        <div>
                            <p className="chat-room-members-count">Id:</p>
                            <p className="chat-room-members-count">Members count:</p>
                            <p className="chat-room-members-count">Banned members count:</p>
                            <p className="chat-room-members-count">Messages:</p>
                            <p className="chat-room-members-count">Created at:</p>
                        </div>
                        <div>
                            <p className="chat-room-members-count">{currentRoom.groupId}</p>
                            <p className="chat-room-members-count">{currentRoom.members.length !== 0 ? currentRoom.members.length : "NA"} </p>
                            <p className="chat-room-members-count">{currentRoom.blockedContacts.length} </p>
                            <p className="chat-room-members-count">{currentRoom.messages.length} </p>
                            <p className="chat-room-members-count">{this.dateToString(currentRoom.created_at)}</p>
                        </div>
                    </div>
                    <div className="userList white"  >
                        {currentRoom.members.length > 0 ?
                        <h1 className="chat-room-name">White list users:</h1>
                            :""}
                        {
                            currentRoom.members ?
                                currentRoom.members.map((itm,i) =>
                                    <p className={`chat-room-members-count ${itm.admin === true ? "admin" :""}`} key={i}><span>{itm.name}</span></p>
                                )
                            : ""
                        }
                    </div>
                    <div className="userList black"  >
                        {currentRoom.blockedContacts.length > 0 ?
                        <h1 className="chat-room-name">Black list users:</h1>
                            :""}
                        {currentRoom.blockedContacts ?
                            currentRoom.blockedContacts.map((itm,i) => <p className='chat-room-members-count' key={i}>{itm.name}</p>) :""
                        }

                    </div>
                </section>
            </div>

        )
    }
}

export default RoomPropsWindow;
