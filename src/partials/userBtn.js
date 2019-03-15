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
        let userData = this.props.userData;
        const inxHandler = this.props.inxHandler;
        const getUserLog = this.props.getUserLog;
        const addMe = this.props.addMe;
        return (
            <button key={i}
                    onClick={()=>{
                        if(addMe) {
                            addMe(itm.name)
                        }else {
                            inxHandler();
                            getUserLog();
                        }
                    }}
                    name={itm.name}
                    type="button"
                    className={(messageBlockHandlerId === i)?"btn clicked":"btn"}>
                {
                    userData ? <font color={userData.onLine ? "blue":"red"}>{itm.name}</font> : <font>{itm.name}</font>
                }
                {
                    (userData)?(
                        <div className="userItm">

                            {
                                (userData.msgCounter !== 0)?(
                                    <div className="unread-mess">
                                        {userData[i].msgCounter}
                                    </div>
                                ):('')
                            }
                            <div className="typing">
                                {(userData.typing)?(
                                    <div className="loader">
                                        <span/>
                                    </div>
                                ):('')}
                            </div>
                        </div>
                    ):("")
                }
            </button>
        )
    }
}

export default UserBtn;