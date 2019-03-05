import React from 'react';

class PromptWindow extends React.Component {
    constructor (props) {
        super(props);
        this.state = {

        };
    };
    handleChange =(evt)=> {
        //console.log('handleChange name: ',evt.target.name,',','val: ',evt.target.value);
        this.setState({ [evt.target.name]: evt.target.value });

    };


    render() {
        //console.log('Modal props: ',this.props);
        const handle = this.props.promptHandler;
        const show = this.props.show;
        const showHideClassName = show ? 'modal display-block' : 'modal display-none';

        return (
            <div className={showHideClassName}>
                <section className='modal-main'>
                    {(this.props.message)?(<p>{this.props.message} </p>):('')}
                    <div className="form-group">
                        <label htmlFor="input-password" className="control-label">Password</label>
                        <input name="Password"  type="password" className="form-control" placeholder="Password" onChange={this.handleChange}/>
                    </div>
                    {(this.state.Password)?(<p><button className='modal-main-btnRight btn' onClick={()=>{
                        handle(this.state.Password);
                    }}>OK</button> </p>):('')}

                </section>
            </div>

        )
    }
}

export default PromptWindow;