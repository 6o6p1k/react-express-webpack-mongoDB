import React from 'react';

class PromptWindow extends React.Component {
    constructor (props) {
        super(props);
        this.state = {

        };
    };


    render() {
        //console.log('Modal props: ',this.props);
        const showHideClassName = this.props.show ? 'modal display-block' : 'modal display-none';

        return (
            <div className={showHideClassName}>
                <section className='modal-main'>
                    <div className='modal-main-btnRight' onClick={this.props.handleClose}>X</div>
                    <div className="chat-room-info">
                        <a className="chat-room-name">{this.state.room.name}: </a>
                        <a className="chat-room-members-count">{this.state.room.members.length} members</a>
                        {this.state.room.blockedContacts.length > 0 ? <a className="chat-room-members-count">{this.state.room.members.length} members</a>:""}
                        <a className="chat-room-members-count">, {this.state.room.messages.length} messages.</a>
                    </div>
                    <div className="userList white"  >
                        {this.props.userList ?
                            this.props.userList.map((name,i) => <li className='btn user' key={i}>{name}</li>) :""
                        }
                    </div>
                    <div className="userList black"  >
                        {this.props.blockedContactsList ?
                            this.props.blockedContactsList.map((name,i) => <li className='btn user' key={i}>{name}</li>) :""
                        }
                    </div>
                </section>
            </div>

        )
    }
}

export default PromptWindow;