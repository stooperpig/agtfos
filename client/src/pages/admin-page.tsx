import React from 'react';
import { HeaderImage } from '../components/header/header-image';
import { TopMenu } from '../components/header/top-menu';

export default function AdminPage() {
    return (
        <div>
            <HeaderImage enableMask={true} />
            <TopMenu />
            <div>Admin</div>
        </div>
    )
}