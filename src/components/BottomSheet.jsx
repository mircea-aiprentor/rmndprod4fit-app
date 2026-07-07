import './BottomSheet.css'

export default function BottomSheet({ isOpen, title, onClose, children }) {
  return (
    <>
      <div className={`sheet-backdrop ${isOpen ? 'sheet-backdrop--open' : ''}`} onClick={onClose} />
      <div className={`sheet ${isOpen ? 'sheet--open' : ''}`}>
        <div className="sheet__handle" />
        <div className="sheet__title">{title}</div>
        <div className="sheet__body">{children}</div>
      </div>
    </>
  )
}
