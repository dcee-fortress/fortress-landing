import React from 'react'
import Link from 'next/link'
import { APP_BRAND } from '../lib/appBrand'

export default function Header() {
    return (
        <header className='z-50 flex items-center w-full py-3 px-4 md:px-10 border-b' style={{background: 'var(--brand-800)', color: 'white'}}>
            <Link href="/" className='font-bold text-lg' style={{color: 'var(--brand-50)'}}>{APP_BRAND}</Link>
        </header>
    )
}
