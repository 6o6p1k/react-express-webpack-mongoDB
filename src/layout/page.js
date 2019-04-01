import React from 'react';
//import TopNav from '../partials/topNavigation.js';
import TopNav from '../partials/TopNavigation.js';
import BottomNav from '../partials/botNavigation.js';


class Page extends React.Component {
    componentDidMount() {
        document.title = this.props.title;
    }

    render() {

        return (
            <div id="bodyContent">
                <header>
                    <TopNav user={this.props.user} title={this.props.title} className="container"/>
                    {this.props.headers}
                </header>
                <div className="main-body">
                    {this.props.children}
                </div>

                <footer>
                    <BottomNav className="container"/>
                    {this.props.footer}
                </footer>
            </div>
        );
    }
}
export default Page;

