import './drop-down-menu.css';
import React from 'react';

interface MenuItem {
    handler?: () => void,
    title: string,
    subItems?: MenuItem[]
}

interface PropTypes {
    menuItem: MenuItem
};

export const Dropdown = (props: PropTypes) => {
    const renderMenuContent = (subItems: MenuItem[] | undefined) => {
        if (subItems === undefined) {
            return null;
        } else {
            return (
                <div className="dropdown-menu-content">
                    {subItems.map((item: MenuItem, index: number) => {
                        return (<span key={index} onClick={item.handler}>{item.title}</span>);
                    })}
                </div>
            );
        }
    }

    return (
        <div className="dropdown-menu">
            <div className="dropdown-menu-button" onClick={() => { if (props.menuItem.handler) props.menuItem.handler(); }}>{props.menuItem.title}</div>
            {renderMenuContent(props.menuItem.subItems)}
        </div>
    );
}

export default Dropdown;