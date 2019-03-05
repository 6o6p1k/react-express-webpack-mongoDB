import React from 'react';

class ModalWindow extends React.Component {

    render() {
        //console.log('Modal props: ',this.props);
        const handleClose = this.props.handleClose;
        const show = this.props.show;
        const showHideClassName = show ? 'modal display-block' : 'modal display-none';

        return (
            <div className={showHideClassName}>
                <section className='modal-main'>
                    {(this.props.err.status)?(<h1>ERROR:  {this.props.err.status} </h1>):('')}
                    {(this.props.err.message)?(<p>MESSAGE: {this.props.err.message} </p>):('')}
                    {(this.props.message)?(<p>{this.props.message} </p>):('')}
                    {this.props.children}
                    <button className='modal-main-btnRight btn' onClick={handleClose}>CLOSE</button>
                </section>
            </div>

        )
    }
}

export default ModalWindow;