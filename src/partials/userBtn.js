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
        const inxHandler = this.props.inxHandler;
        const getUserLog = this.props.getUserLog;
        const addMe = this.props.addMe;
        return (
            <button key={i}
                    onClick={()=>{
                        if(addMe) {
                            addMe()
                        }else {
                            inxHandler();
                            getUserLog();
                        }
                    }}
                    type="button"
                    className={(messageBlockHandlerId === i)?"btn clicked":"btn"}>
                {
                    this.props.name ? <font>{this.props.name}</font> : <font color={itm.onLine ? "blue":"red"}>{itm.name}</font>
                }
                {
                    (itm)?(
                        <div className="userItm">
                            {(itm.msgCounter !== 0 || itm.msgCounter === undefined)?(
                                    <div className="unread-mess">
                                        {itm.msgCounter}
                                    </div>
                                ):('')}
                            <div className="typing">
                                {(itm.typing)?(
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