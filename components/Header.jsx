import React from 'react'
import Link from 'next/link'

export default function Header() {
    return (
        <header className='z-50 flex items-center w-full py-3 bg-zinc-900 text-zinc-100 px-4 md:px-10 border-b'>
            <Link href="/" className='font-bold'>LOGO</Link>
        </header>
    )
}
