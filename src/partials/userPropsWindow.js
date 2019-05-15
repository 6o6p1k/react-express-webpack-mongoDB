import React from 'react';

class UserPropsWindow extends React.Component {
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
        console.log('userPropsWindow: ',this.props);
        let curentUser = this.props.curentUser;

        return (
            <div className={this.props.show ? 'modal display-block' : 'modal display-none'}>
                <section className='modal-main'>
                    <div className='modal-main-btnRight' onClick={this.props.handleClose}>X</div>
                    <div className="chat-room-info">
                        <h1 className="chat-room-name">{curentUser.name}: </h1>
                        <p className="chat-room-members-count">Id: {curentUser.userId}</p>
                        <p className="chat-room-members-count">Messages: {curentUser.messages.length !== 0 ? curentUser.messages.length : "NA"} .</p>
                        <p className="chat-room-members-count">Created at: {this.dateToString(curentUser.created_at)}</p>
                        <p className="chat-room-members-count">Status: {curentUser.onLine ? "onLine":"offLine"}</p>
                        <p className="chat-room-members-count">Authorized: {curentUser.authorized ? "Yes":"No"}</p>
                        <p className="chat-room-members-count">Banned: {curentUser.banned ? "Yes":"No"}</p>
                    </div>
                </section>
            </div>

        )
    }
}

export default UserPropsWindow;