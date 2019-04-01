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
                <div className="frontTitle">
                    <p className="logo">Hello ≥︺‿︺≤</p>
                    <div class="main">
                        <span class="stand"></span>
                        <div class="cat">
                            <div class="body"></div>
                            <div class="head">
                                <div class="ear"></div>
                                <div class="ear"></div>
                            </div>
                            <div class="face">
                                <div class="nose"></div>
                                <div class="whisker-container">
                                    <div class="whisker"></div>
                                    <div class="whisker"></div>
                                </div>
                                <div class="whisker-container">
                                    <div class="whisker"></div>
                                    <div class="whisker"></div>
                                </div>
                            </div>
                            <div class="tail-container">
                                <div class="tail">
                                    <div class="tail">
                                        <div class="tail">
                                            <div class="tail">
                                                <div class="tail">
                                                    <div class="tail">
                                                        <div class="tail"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>



            </Page>
        );
    }
}
export default  FrontP
