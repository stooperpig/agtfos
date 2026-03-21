import React, { useEffect, useState } from 'react';
import { ClientUser, getUser } from '../../utils/user-client';
import { postData } from '../../api/api-utils';
import './header-image.css';

const headerImageMap: { [key: string]: string } = {
    'player': '/logo.png',
    'home': '/logo.png',
    'default': '/logo.png'
}

interface PropTypes {
    pageId?: string
    banner?: string
    enableMask?: boolean
}

export const HeaderImage = (props: PropTypes) => {
    const [user, setUser] = useState<ClientUser | undefined>(undefined);

    useEffect(() => {
        setUser(getUser(document));
    }, []);

    const imagePath = headerImageMap[props.pageId || 'default'];

    const handleLogout = () => {
        postData('/logout', {});
        window.location.href = "/";
    }

    const handleLogin = () => {
        window.location.href = '/login?slip=derp';
    }

    const renderGreeting = () => {
        if (user) {
            return (
                <div className="header-image-common-signout-form">
                    <span className="header-image-common-signout-greeting">Hi {user ? user.name : "unknown"}</span>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            )
        } else {
            return (
                <div className="header-image-common-signout-form">
                    <button onClick={handleLogin}>Login</button>
                </div>
            );
        }
    }

    const renderBanner = () => {
        if (props.banner) {
            return (<div className="header-image-banner">{props.banner}</div>)
        } else {
            return null;
        }
    }

    const renderMask = () => {
        if (props.enableMask) {
            return (
                <div className="header-image-mask"></div>
            );
        } else {
            return null;
        }
    }

    return (
        <div className="header-image">
            <img src={imagePath} alt="" />
            {renderBanner()}
            <div className="header-image-common-greeting">
                {renderGreeting()}
            </div>
        </div>
    );
}