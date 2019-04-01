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
                    <div className='modal-main-btnRight' onClick={handleClose}>X</div>
                    {this.props.err.status ?
                        <h1 className="titleError">ERROR:  <span className="errorNumber">{this.props.err.status}</span> </h1>
                        :""
                    }
                    {this.props.err.message ?
                        <p className="errorDescription">{this.props.err.message} </p>
                        :""
                    }
                    {this.props.message ?
                        <p>{this.props.message} </p>
                        :""
                    }
                    {this.props.children}

                </section>
            </div>

        )
    }
}

export default ModalWindow;