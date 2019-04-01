import React from 'react';
import OnContextMenu from './onContextMenuWindow.js'

class UserBtn extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            onContextMenu: false,
            onContextMenuUserName:"",
            authorizedStatus:undefined,
            banStatus:undefined,
        }
    }

    componentDidMount(){

    }

    rightClickMenuOn =(itm)=> {
        console.log("rightClickMenuOn itm: ",itm);
        this.setState({
            onContextMenu:true,
            onContextMenuUserName:itm.name,
            authorizedStatus:itm.authorized,
            banStatus:itm.banned
        })
    };

    rightClickMenuOnHide =()=> {
        console.log("rightClickMenuOnHide");
        this.setState({
            onContextMenu: false,
            onContextMenuUserName:"",
            authorizedStatus:undefined,
            banStatus:undefined,
        });
    };

    onContextMenuResponse =(res)=> {
        //console.log("onContextMenuResponse res: ", res);
        (()=>{this.props.onContextMenuHandler(res,this.state.onContextMenuUserName)})()
    };

    render() {
        //console.log('UserBtn props: ',this.props);
        let itm = this.props.itm;
        let i = this.props.i;
        return (
            <div key={i}
                 onClick={()=>{
                     if(this.props.addMe) {
                     this.props.addMe()
                 } else {
                         this.props.inxHandler();
                         this.props.getUserLog();
                 }}}
                 onContextMenu={(e)=>{e.preventDefault();this.rightClickMenuOn(itm); return false;}}
                 onMouseLeave={this.rightClickMenuOnHide}
                 type="button"
                 className={(this.props.messageBlockHandlerId === i)?"btn clicked":"btn user"}>
                {this.props.name ? <font>{this.props.name}</font> : <font color={itm.onLine ? "#fff":"#da3a2f"}>{itm.name}</font>}
                {(itm)?(
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
                ):("")}
                {(this.state.onContextMenu)?(<OnContextMenu authorizedStatus={this.state.authorizedStatus}
                                                            banList={this.props.banList}
                                                            rightClickMenuOnHide={this.rightClickMenuOnHide}
                                                            onContextMenuResponse={this.onContextMenuResponse}/>):('')}
            </div>
        )
    }
}

export default UserBtn;