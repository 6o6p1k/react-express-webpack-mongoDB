import React from 'react';

class UserBtn extends React.Component {
    constructor(props){
        super(props);
    }

    render() {
        //console.log('UserBtn props: ',this.props);
        let itm = this.props.itm;
        let i = this.props.i;
        let messageBlockHandlerId = this.props.messageBlockHandlerId;
        let users = this.props.users;
        const inxHandler = this.props.inxHandler;
        const getUserLog = this.props.getUserLog;
        return (
            <button key={i} onClick={()=>{inxHandler(i);getUserLog(itm.name,null)}} name={itm.name}  type="button" className={(messageBlockHandlerId === i)?"btn clicked":"btn"}>
                {itm.name}
                {(users[i].msgCounter !== 0)?(
                    <div className="unread-mess">
                        {users[i].msgCounter}
                    </div>
                ):('')}
                <div className="typing">
                    {(users[i].typing)?(
                        <div className="loader">
                            <span/>
                        </div>
                    ):('')}
                </div>
            </button>
        )
    }
}

export default UserBtn;