import React from 'react'
import Link from './Link'
import Icon from '../icon/icon'
import Text from './Text'
import Button from './Button'
import { DEFAULT_PROJECT_ID } from "@/lib/projectList"
import { getProjectHomeHref } from "@/lib/projectRoutes"

export default function NavigationPanel() {
    const projectHome = getProjectHomeHref(DEFAULT_PROJECT_ID)

    return (
        <nav className='flex items-center justify-center flex-col p-2 gap-5 h-screen bg-zinc-200 border-r border-zinc-400'>
            <Link href={projectHome}>
                <Icon name='house' />
                <Text>Home</Text>
            </Link>
            <Button href="/">
                <Icon name='plus' />
                <Text>New</Text>
            </Button>
            <Link href="/settings">
                <Icon name='settings' />
                <Text>Settings</Text>
            </Link>
            <Button href="/" className="text-red-500">
                <Icon name='log-out' />
                <Text>Logout</Text>
            </Button>
        </nav>
    )
}
