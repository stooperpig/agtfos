import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import './top-menu.css';
import { ClientUser, getUser } from '../../utils/user-client';

interface StyleProp {
    isActive: boolean
}

export const TopMenu = () => {
    const [user, setUser] = useState<ClientUser | undefined>(undefined);

    useEffect(() => {
        setUser(getUser(document));
    }, []);

    const getStyle = ({ isActive }: StyleProp) => {
        if (isActive === true) {
            return ({ backgroundColor: 'darkgreen' });
        } else {
            return ({ backgroudColor: 'black' });
        }
    }

    const renderAdminLink = () => {
        if (user && user.admin) {
            return (
                <NavLink className="top-menu-item" style={getStyle} to="/admin">Admin</NavLink>
            )
        } else {
            return null;
        }
    }

    return (
        <div className='top-menu-container'>
            <NavLink className="top-menu-item" style={getStyle} to="/">Home</NavLink>
            <NavLink className="top-menu-item" style={getStyle} to="/player">Your Games</NavLink>
            {renderAdminLink()}
        </div>
    );
}