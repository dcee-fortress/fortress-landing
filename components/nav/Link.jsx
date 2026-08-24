import React from 'react'
import { default as RawLink } from 'next/link'

export default function Link({ children, href }) {
    return (
        <RawLink href={href} className="flex flex-col items-center">
            {children}
        </RawLink>
    )
}
