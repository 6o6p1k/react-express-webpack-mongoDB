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
        let curentRoom = this.props.curentRoom;

        return (
            <div className={this.props.show ? 'modal display-block' : 'modal display-none'}>
                <section className='modal-main'>
                    <div className='modal-main-btnRight' onClick={this.props.handleClose}>X</div>
                    <div className="chat-room-info">
                        <h1 className="chat-room-name">{curentRoom.name}: </h1>
                        <p className="chat-room-members-count">Id: {curentRoom.groupId}</p>
                        <p className="chat-room-members-count">Members count: {curentRoom.members.length !== 0 ? curentRoom.members.length : "NA"} </p>
                        <p className="chat-room-members-count">Banned members count: {curentRoom.blockedContacts.length} </p>
                        <p className="chat-room-members-count">Messages: {curentRoom.messages.length} </p>
                        <p className="chat-room-members-count">Created at: {this.dateToString(curentRoom.created_at)}</p>
                    </div>
                    <div className="userList white"  >
                        {curentRoom.members ?
                            curentRoom.members.map((itm,i) => <li className='btn user' key={i}>{itm.name}</li>) :""
                        }
                    </div>
                    <div className="userList black"  >
                        {curentRoom.blockedContacts ?
                            curentRoom.blockedContacts.map((itm,i) => <li className='btn user' key={i}>{itm.name}</li>) :""
                        }

                    </div>
                </section>
            </div>

        )
    }
}

export default RoomPropsWindow;