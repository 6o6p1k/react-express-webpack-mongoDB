import React from 'react';

class OnContextMenu extends React.Component {


    render() {
        return (
            <ul className="userDropDown" onMouseLeave={this.props.rightClickMenuOnHide}>
                    <li className='dropDownBtn btn' >Move on top</li>
                    <li className='dropDownBtn btn' >View user data</li>
                    <li className='dropDownBtn btn' >Move to black list</li>
                    <li className='dropDownBtn btn' >Clear chat window</li>
                    <li className='dropDownBtn btn' >Delete completely</li>
            </ul>

        )
    }
}

export default OnContextMenu;