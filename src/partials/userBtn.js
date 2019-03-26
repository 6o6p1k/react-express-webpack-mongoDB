import React from 'react';
import OnContextMenu from './onContextMenuWindow.js'

class UserBtn extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            onContextMenu: false,
            onContextMenuName:"",
        }
    }

    rightClickMenuOn =(name)=> {
        console.log("rightClickMenuOn name: ",name);
        this.setState({
            onContextMenu:true,
            onContextMenuName:name,
        })
    };

    rightClickMenuOnHide =()=> {
        console.log("rightClickMenuOnHide");
        this.setState({
            onContextMenu: false,
            onContextMenuName:"",
        });
    };

    render() {
        //console.log('UserBtn props: ',this.props);
        let itm = this.props.itm;
        let i = this.props.i;
        return (
            <div key={i}
                    onClick={()=>{
                        if(this.props.addMe) {this.props.addMe()
                        }else {this.props.inxHandler();this.props.getUserLog();}
                    }}
                 /*onContextMenu={()=>{this.rightClickMenuOn(itm.name);}}*/
                 onContextMenu={(e)=>{e.preventDefault();this.rightClickMenuOn(itm.name); return false;}}
                 onMouseLeave={this.rightClickMenuOnHide}
                 type="button"
                 className={(this.props.messageBlockHandlerId === i)?"btn clicked":"btn"}>
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
                {(this.state.onContextMenu)?(
                    <OnContextMenu rightClickMenuOnHide={this.rightClickMenuOnHide}/>
                ):('')}
            </div>
        )
    }
}

export default UserBtn;