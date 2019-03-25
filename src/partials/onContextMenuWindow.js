import React from 'react';

class OnContextMenu extends React.Component {

    render() {
        //console.log('Modal props: ',this.props);
        const rightClickMenuOnHide = this.props.rightClickMenuOnHide;
        const show = this.props.show;
        const showHideClassName = show ? 'onContextMenu display-block' : 'OnContextMenu display-none';

        return (
            <div className={showHideClassName}>
                <section className='onContextMenu-menu' onMouseOut={()=>rightClickMenuOnHide()}>
                    <button className='btn' >Move to top</button>
                    <button className='btn' >View user data</button>
                    <button className='btn' >Move to black list</button>
                    <button className='btn' >Clear chat window</button>
                    <button className='btn' >Delete completely</button>
                </section>
            </div>

        )
    }
}

export default OnContextMenu;