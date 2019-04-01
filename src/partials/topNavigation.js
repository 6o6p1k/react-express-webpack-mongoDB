import React from 'react';
import { Link } from 'react-router-dom';

class TopNav extends React.Component {

    logOut =()=> {
        //console.log('logOut');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('error');
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/logout',true);
        xhr.send();
        return false;
    };
    render() {
        //console.log('topNav props:',this.props.title);
        return (
            <nav className="navbar-header">
                <ul className="nav-list">
                    {!this.props.user ?
                        <li><Link to="/">MAIN</Link></li>
                        : ""
                    }
                    {this.props.user ?
                    <li>
                        <Link to="/chat">CHAT</Link>
                        <Link to="/userPage">MY PROFILE</Link>
                    </li>
                     : ""
                    }
                    {this.props.user && this.props.user.username === 'Administrator' ?
                        <li><Link to="/users">ADMIN PAGE</Link></li>
                        : ""
                    }
                </ul>
                <ul className="nav-list">
                    {!this.props.user ?
                        this.props.title === "REGISTRATION PAGE"?
                            <li>
                                <Link to="/login">LOGIN</Link>
                            </li>
                        :
                            this.props.title === "LOGIN PAGE"?
                                <li>
                                    <Link to="/register">JOIN</Link>
                                </li>
                            :
                                    <li>
                                        <Link to="/register">JOIN</Link>
                                        <Link to="/login">LOGIN</Link>
                                    </li>


                     :
                        <li>
                            <Link to="/" onClick={this.logOut}>SIGN OUT</Link>
                        </li>
                    }
                </ul>
            </nav>
        )
    }
}
export default TopNav;