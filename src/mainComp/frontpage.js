import React from 'react';
import Page from '../layout/page.js';


class FrontP extends React.Component {
    constructor (props) {
        var user = JSON.parse(sessionStorage.getItem('user'));
        super(props);
        this.state = {
            user: user
        };
    };

    render() {
        //var user = JSON.parse(sessionStorage.getItem('user'));
        //console.log('/FP user:',this.state.user);
        return (
            <Page user={this.state.user} title="Hello ≥︺‿︺≤">
                <p className="logo">Hello ≥︺‿︺≤</p>


            </Page>
        );
    }
}
export default  FrontP
