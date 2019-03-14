import React from 'react';

class ConfirmWindow extends React.Component {

    render() {
        console.log('Confirm props: ',this.props);
        const handle = this.props.confirmHandler;
        const show = this.props.show;
        const showHideClassName = show ? 'modal display-block' : 'modal display-none';

        return (
            <div className={showHideClassName}>
                <section className='modal-main'>
                    {(this.props.message)?(<p>{this.props.message} </p>):('')}
                    <button className='modal-main-btnRight btn' onClick={()=>handle(true)}>OK</button>
                    <button className='modal-main-btnLeft btn' onClick={()=>handle(false)}>CANCEL</button>
                </section>
            </div>

        )
    }
}

export default ConfirmWindow;