import React, { ReactNode, useRef } from 'react';
import './modal.css';
import Draggable from 'react-draggable';

interface PropTypes {
    title: string,
    showHideClassName: string,
    handleClose: () => void,
    children: ReactNode,
    positionOffset?: {x: string, y: string}
}

const Modal = (props: PropTypes) => {
    const nodeRef = useRef(null);
    const positionOffset = props.positionOffset ? props.positionOffset : { x: "-50%", y: "-50%" };

    return (
        // @ts-expect-error ignore issue with Draggable nodeRef type
        <Draggable nodeRef={nodeRef} positionOffset={positionOffset}>
            <div ref={nodeRef} className={props.showHideClassName}>
                <section className="modal-main">
                    <div className="modal-header">
                        <div className="modal-header-title">{props.title}</div>
                        <div className="modal-header-close" onClick={() => props.handleClose()}>X</div>
                    </div>
                    {props.children}
                </section>
            </div>
        </Draggable>
    );
}

export default Modal;