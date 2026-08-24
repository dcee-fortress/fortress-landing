"use client";
import { useState, forwardRef, useId } from "react";

export const Input = forwardRef(function Input({
    label,
    leftIcon,
    rightIcon,
    errorMessage,
    successMessage = "Looks good",
    validate,
    validateOnBlur = true,
    validateOnChange = false,
    variant = "default",
    size = 'md',
    disabled = false,
    loading = false,
    className = "",
    id,
    ...props
}, ref) {
    const [state, setState] = useState('idle') // idle | success | error
    const [message, setMessage] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const generatedId = useId()
    const inputId = id || generatedId

    const runValidation = (value) => {
        if (!validate || disabled) return

        const error = validate(value)

        if (!value || !props.required) {
            setState('idle')
            setMessage('')
            return
        }

        if (error) {
            setState("error")
            setMessage(errorMessage || error)
        } else {
            setState('success')
            setMessage(successMessage)
        }
    }

    // Base wrapper
    let wrapperClass = "w-full "
    if (disabled) wrapperClass += "opacity-60 cursor-not-allowed "

    // Input base
    let inputClass = "w-full outline-none transition-all duration-200 "

    // Size
    const sizes = {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-3 text-sm",
        lg: "px-5 py-4 text-base"
    }
    inputClass += sizes[size] + ""

    // Variant + border
    if (variant === "filled") {
        inputClass += "bg-gray-50 border-2 border-transparent focus:bg-white "
    } else {
        inputClass += "bg-white border-2 border-gray-200 "
    }

    // state colors
    if (state === "error") {
        inputClass += "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 animate-shake "
    } else if (state === "success" && !isFocused) {
        inputClass += "border-green-500 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 "
    } else if (isFocused) {
        inputClass += "border-blue-500 focus:ring-4 focus:ring-blue-500/10 "
    }

    // Rounded + padding for icons
    inputClass += "rounded-xl "
    if (leftIcon) inputClass += "pl-11 "
    if (rightIcon || loading) inputClass += "pr-11 "

    // Diasbled
    if (disabled) inputClass += "bg-gray-100 cursor-not-allowed "

    inputClass += className

    const textClass = state === "error" ? "text-red-600" : state === "success" ? "text-green-600" : "text-gray-6000"
    const labelClass = `block text-sm font-semibold mb-2 ${disabled ? "text-gray-400" : "text-gray-700"}`
    const iconClass = `absolute top-1/2 -translate-y-1/2 ${disabled ? "text-gray-300" : "text-gray-400"}`

    return (
        <div className={wrapperClass}>
            {label && (
                <label htmlFor={inputId} className={labelClass}>
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                {leftIcon && (
                    <div className={`${iconClass} left-3`}>
                        {leftIcon}
                    </div>
                )}

                <input
                    id={inputId}
                    ref={ref}
                    className={inputClass}
                    disabled={disabled}
                    onBlur={(e) => {
                        setIsFocused(false)
                        validateOnBlur && runValidation(e.target.value)
                        props.onBlur?.(e)
                    }}
                    onChange={(e) => {
                        validateOnChange && runValidation(e.target.value)
                        props.onChange?.(e)
                    }}
                    onFocus={() => setIsFocused(true)}
                    {...props}
                />

                {(rightIcon || loading) && (
                    <div className={`${iconClass} right-3`}>
                        {loading ? (
                            <svg viewBox="0 0 24 24" className="animate-spin h-5 w-5 text-gray-400">
                                <circle className="opacity-25" cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.93813-2.647z" />
                            </svg>
                        ) : rightIcon}
                    </div>
                )}
            </div>

            {message && (
                <p className={`text-xs mt-2 ${textClass}`}>
                    {message}
                </p>
            )}

            <style>
                {
                    `
                    @keyframes shake {
                    0%, 100% {transform: translateX(0)}
                    25% {transform: translateX(-4px)}
                    75% {transform: translateX(4px)}
                    }
                    .animate-shake {
                    animation: shake 0.3s ease-in-out
                    }
                    `
                }
            </style>
        </div>
    )
})