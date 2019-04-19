import React from 'react';
import TopNav from '../partials/TopNavigation.js';
import BottomNav from '../partials/botNavigation.js';


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

