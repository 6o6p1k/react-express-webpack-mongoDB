import React from 'react';
//import TopNav from '../partials/topNavigation.js';
import TopNav from '../partials/TopNavigation.js';
import BottomNav from '../partials/botNavigation.js';
import Switch from "react-router-dom/es/Switch";
import Redirect from "react-router-dom/es/Redirect";
import Chat from "../mainComp/chat";


class Page extends React.Component {
    constructor (props) {

        super(props);
        this.state = {
            chatRedirect: this.props.chatRedirect
        }
    }
    componentWillReceiveProps(nextProps) {
    this.setState({
            chatRedirect: nextProps.chatRedirect
    })
}
    componentDidMount() {
        document.title = this.props.title;
    }

    render() {
console.log("CHAT", this.state.chatRedirect);
        //if(this.state.chatRedirect) {return <Redirect to='/chat'/>;};
        return (
            <div id="bodyContent">
                <header>
                    <TopNav
                        user={this.props.user}
                        title={this.props.title}
                        className="container"
                    />
                </header>
                <div className={`main-body ${this.state.chatRedirect ? "main-body-chat":""}`}>
                    {this.props.children}

                </div>

                <footer>
                    <BottomNav className="container"/>
                </footer>

            </div>
        );
    }
}
export default Page;

