import React from 'react';

class OnContextMenu extends React.Component {


    render() {
        return (
            <ul className="userDropDown" onMouseLeave={this.props.rightClickMenuOnHide}>
                    <li className='dropDownBtn' >Move on top</li>
                    <li className='dropDownBtn' >View user data</li>
                    <li className='dropDownBtn' >Move to black list</li>
                    <li className='dropDownBtn' >Clear chat window</li>
                    <li className='dropDownBtn' >Delete completely</li>
            </ul>

        )
    }
}

export default OnContextMenu;