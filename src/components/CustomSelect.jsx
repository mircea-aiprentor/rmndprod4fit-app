import { useEffect, useRef, useState } from 'react'
import './CustomSelect.css'

export default function CustomSelect({ options, value, onChange, placeholder = 'Alege', disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const selectedOption = options.find((o) => o.id === value)

  const handleSelect = (optionId) => {
    onChange(optionId)
    setIsOpen(false)
  }

  return (
    <div className={`custom-select ${disabled ? 'custom-select--disabled' : ''}`} ref={containerRef}>
      <button
        type="button"
        className={`custom-select__trigger ${isOpen ? 'custom-select__trigger--open' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
      >
        <span className={selectedOption ? 'custom-select__value' : 'custom-select__placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="custom-select__chevron" aria-hidden="true">
          <svg width="14" height="9" viewBox="0 0 14 9" fill="none">
            <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <ul className="custom-select__list" role="listbox">
          {options.map((option) => (
            <li
              key={option.id}
              className={`custom-select__option ${value === option.id ? 'custom-select__option--selected' : ''}`}
              onClick={() => handleSelect(option.id)}
              role="option"
              aria-selected={value === option.id}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
