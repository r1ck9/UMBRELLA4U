'use client'

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function normalizeOptions(options) {
  return options.map((option) => Array.isArray(option)
    ? { value: option[0], label: option[1] }
    : option)
}

export default function CustomSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  ariaLabel,
  className = '',
  menuClassName = '',
  align = 'start',
}) {
  const selectId = useId().replace(/:/g, '')
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const closeTimerRef = useRef(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuStyle, setMenuStyle] = useState({})
  const normalized = useMemo(() => normalizeOptions(options), [options])
  const selectedIndex = Math.max(0, normalized.findIndex((option) => String(option.value) === String(value)))
  const selected = normalized[selectedIndex] || normalized[0]

  useEffect(() => {
    setMounted(true)
    return () => window.clearTimeout(closeTimerRef.current)
  }, [])

  function placeMenu() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.max(rect.width, 168)
    const left = align === 'end' ? rect.right - width : rect.left
    setMenuStyle({
      left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
      top: Math.min(rect.bottom + 6, window.innerHeight - 18),
      width,
      maxHeight: Math.max(120, window.innerHeight - rect.bottom - 24),
    })
  }

  useLayoutEffect(() => {
    if (!open) return undefined
    placeMenu()
    const refresh = () => placeMenu()
    window.addEventListener('resize', refresh)
    window.addEventListener('scroll', refresh, true)
    return () => {
      window.removeEventListener('resize', refresh)
      window.removeEventListener('scroll', refresh, true)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) closeMenu()
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  function openMenu(direction = 0) {
    if (disabled || !normalized.length) return
    window.clearTimeout(closeTimerRef.current)
    setClosing(false)
    const nextIndex = direction > 0
      ? Math.min(selectedIndex + 1, normalized.length - 1)
      : direction < 0
        ? Math.max(selectedIndex - 1, 0)
        : selectedIndex
    setActiveIndex(nextIndex)
    setOpen(true)
    requestAnimationFrame(() => menuRef.current?.focus())
  }

  function closeMenu(refocus = false) {
    if (!open || closing) return
    setClosing(true)
    if (refocus) requestAnimationFrame(() => triggerRef.current?.focus())
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 120)
  }

  function choose(option) {
    if (!option || option.disabled) return
    onChange?.(option.value)
    closeMenu(true)
  }

  function handleTriggerKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open && !closing ? closeMenu() : openMenu()
    }
  }

  function handleMenuKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu(true)
      return
    }
    if (event.key === 'Tab') {
      closeMenu()
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : normalized.length - 1)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      let next = activeIndex
      do next = (next + step + normalized.length) % normalized.length
      while (normalized[next]?.disabled && next !== activeIndex)
      setActiveIndex(next)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(normalized[activeIndex])
      return
    }
    if (event.key.length === 1) {
      const query = event.key.toLocaleLowerCase()
      const match = normalized.findIndex((option) => !option.disabled && String(option.label).toLocaleLowerCase().startsWith(query))
      if (match >= 0) setActiveIndex(match)
    }
  }

  return (
    <div className={`custom-select ${open && !closing ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="custom-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open && !closing}
        aria-controls={`${selectId}-listbox`}
        disabled={disabled}
        onClick={() => open && !closing ? closeMenu() : openMenu()}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="custom-select-value">
          <span className="custom-select-value-long">{selected?.label || ''}</span>
          {selected?.shortLabel && <span className="custom-select-value-short">{selected.shortLabel}</span>}
        </span>
        <span className="custom-select-chevron" aria-hidden="true">⌄</span>
      </button>
      {mounted && open && createPortal(
        <div
          ref={menuRef}
          id={`${selectId}-listbox`}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={`${selectId}-option-${activeIndex}`}
          className={`custom-select-menu ${closing ? 'is-closing' : ''} ${menuClassName}`.trim()}
          style={menuStyle}
          onKeyDown={handleMenuKeyDown}
        >
          {normalized.map((option, index) => {
            const isSelected = String(option.value) === String(value)
            return (
              <button
                id={`${selectId}-option-${index}`}
                key={String(option.value)}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={isSelected}
                disabled={option.disabled}
                className={`custom-select-option ${isSelected ? 'is-selected' : ''} ${index === activeIndex ? 'is-active' : ''}`.trim()}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                <span className="custom-select-check" aria-hidden="true">✓</span>
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}
