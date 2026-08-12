import { useState, useRef } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import Modal from '../components/Modal'
import './CategoriesPage.css'

/* ── Category Icons ── */
function CoffeeIcon()  { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> }
function TeaIcon()    { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M6 1s1 1 1 3"/><path d="M10 1s1 1 1 3"/></svg> }
function PastryIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> }
function DessertIcon(){ return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M12 14V7"/><path d="M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4H8z"/></svg> }
function ColdBevIcon(){ return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h10l-1.5 14.5a2 2 0 0 1-2 1.5h-3a2 2 0 0 1-2-1.5L7 3z"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="10" y1="3" x2="10" y2="1"/><line x1="14" y1="3" x2="14" y2="1"/></svg> }
function DefaultIcon(){ return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> }

const CATEGORY_ICONS = { coffee: <CoffeeIcon />, tea: <TeaIcon />, pastry: <PastryIcon />, dessert: <DessertIcon />, cold: <ColdBevIcon /> }
const getIcon = (key) => CATEGORY_ICONS[key] || <DefaultIcon />

/* ── Toggle Switch ── */
function ToggleSwitch({ active, onToggle, id }) {
  return (
    <button
      className={`toggle-switch${active ? ' toggle-switch--active' : ''}`}
      onClick={onToggle}
      id={id}
      role="switch"
      aria-checked={active}
    >
      <span className="toggle-switch__knob" />
      {active && (
        <span className="toggle-switch__check">
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 6 5 9 10 3"/>
          </svg>
        </span>
      )}
    </button>
  )
}

/* ── Drag Handle ── */
function DragHandleIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg>
}
function GripIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'5px'}}><circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/></svg>
}
function EditIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}

/* ── Category Card ── */
function CategoryCard({ cat, onToggle, onEdit, isDragging, isDragOver, onDragStart, onDragEnter, onDragEnd, onDrop }) {
  return (
    <div
      className={['cat-card', !cat.active ? 'cat-card--inactive' : '', isDragging ? 'cat-card--dragging' : '', isDragOver ? 'cat-card--drag-over' : ''].filter(Boolean).join(' ')}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      id={`cat-card-${cat.id}`}
    >
      <div className="cat-card__drag-handle"><DragHandleIcon /></div>
      <div className="cat-card__top">
        <div className="cat-card__icon-wrap">{getIcon(cat.icon)}</div>
        <ToggleSwitch active={cat.active} onToggle={() => onToggle(cat.id)} id={`toggle-cat-${cat.id}`} />
      </div>
      <div className="cat-card__info">
        <h3 className="cat-card__name">{cat.name}</h3>
        <p className="cat-card__count">{cat.itemCount} Items</p>
      </div>
      <hr className="cat-card__divider" />
      <div className="cat-card__footer">
        <label className="cat-card__order-label">
          Order:
          <input type="number" className="cat-card__order-input" value={cat.order} readOnly id={`order-cat-${cat.id}`} />
        </label>
        <button className="cat-card__edit-btn" id={`edit-cat-${cat.id}`} onClick={() => onEdit(cat)}>
          <EditIcon /> Edit
        </button>
      </div>
    </div>
  )
}

/* ── Categories Page ── */
export default function CategoriesPage() {
  const { categories, toggleCategory, reorderCategories, addCategory, updateCategory } = useApp()

  const [dragId,   setDragId]   = useState(null)
  const [overId,   setOverId]   = useState(null)
  const dragNode = useRef(null)

  // Add modal
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', icon: 'coffee', itemCount: 0 })

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editCat,  setEditCat]  = useState(null)
  const [editForm, setEditForm] = useState({})

  /* ── Drag handlers ── */
  const handleDragStart = (e, id) => {
    setDragId(id)
    dragNode.current = e.currentTarget
    setTimeout(() => dragNode.current?.classList.add('cat-card--dragging'), 0)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragEnter = (e, id) => { if (id !== dragId) setOverId(id) }
  const handleDragEnd   = ()      => { setDragId(null); setOverId(null); dragNode.current = null }
  const handleDrop      = (e, targetId) => {
    e.preventDefault()
    if (targetId === dragId) return
    const list  = [...categories]
    const fromI = list.findIndex((c) => c.id === dragId)
    const toI   = list.findIndex((c) => c.id === targetId)
    const [moved] = list.splice(fromI, 1)
    list.splice(toI, 0, moved)
    reorderCategories(list)
    setDragId(null); setOverId(null)
  }

  /* ── Add handlers ── */
  const handleOpenAdd = () => {
    setAddForm({ name: '', icon: 'coffee', itemCount: 0 })
    setAddOpen(true)
  }
  const handleAddSave = () => {
    if (!addForm.name.trim()) return
    addCategory({ ...addForm, active: true, order: categories.length + 1 })
    setAddOpen(false)
  }

  /* ── Edit handlers ── */
  const handleOpenEdit = (cat) => {
    setEditCat(cat)
    setEditForm({ name: cat.name, icon: cat.icon, itemCount: cat.itemCount })
    setEditOpen(true)
  }
  const handleEditSave = () => {
    if (!editCat || !editForm.name.trim()) return
    updateCategory(editCat.id, editForm)
    setEditOpen(false)
    setEditCat(null)
  }

  const ICON_OPTIONS = [
    { value: 'coffee', label: 'Coffee' },
    { value: 'tea',    label: 'Tea' },
    { value: 'pastry', label: 'Pastry' },
    { value: 'dessert',label: 'Dessert' },
    { value: 'cold',   label: 'Cold Bev' },
  ]

  return (
    <AdminLayout searchPlaceholder="Search categories, items...">
      <div className="categories-page">
        {/* Header */}
        <div className="categories-page__header">
          <div>
            <p className="categories-page__section-label">MENU MANAGEMENT</p>
            <h1 className="categories-page__title">Categories</h1>
          </div>
          <button className="btn-add-category" id="btn-add-category" onClick={handleOpenAdd}>
            + Add Category
          </button>
        </div>

        {/* Drag hint */}
        <p className="categories-page__drag-hint">
          <GripIcon /> Drag cards to reorder display order
        </p>

        {/* Grid */}
        <div className="categories-grid">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              onToggle={toggleCategory}
              onEdit={handleOpenEdit}
              isDragging={dragId === cat.id}
              isDragOver={overId === cat.id}
              onDragStart={(e) => handleDragStart(e, cat.id)}
              onDragEnter={(e) => handleDragEnter(e, cat.id)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, cat.id)}
            />
          ))}
        </div>
      </div>

      {/* Add Category Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Category"
        subtitle="Create a new menu category"
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAddSave} id="save-add-category">Create Category</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="add-cat-name">Category Name <span>*</span></label>
            <input
              id="add-cat-name"
              className="form-input"
              placeholder="e.g. Cold Beverages"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="add-cat-icon">Icon</label>
            <select
              id="add-cat-icon"
              className="form-select"
              value={addForm.icon}
              onChange={(e) => setAddForm((f) => ({ ...f, icon: e.target.value }))}
            >
              {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="add-cat-count">Item Count</label>
            <input
              id="add-cat-count"
              className="form-input"
              type="number"
              min={0}
              value={addForm.itemCount}
              onChange={(e) => setAddForm((f) => ({ ...f, itemCount: Number(e.target.value) }))}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditCat(null) }}
        title={`Edit — ${editCat?.name || ''}`}
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => { setEditOpen(false); setEditCat(null) }}>Cancel</button>
            <button className="btn-primary" onClick={handleEditSave} id="save-edit-category">Save Changes</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-cat-name">Category Name</label>
            <input
              id="edit-cat-name"
              className="form-input"
              value={editForm.name || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-cat-icon">Icon</label>
            <select
              id="edit-cat-icon"
              className="form-select"
              value={editForm.icon || 'coffee'}
              onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
            >
              {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-cat-count">Item Count</label>
            <input
              id="edit-cat-count"
              className="form-input"
              type="number"
              min={0}
              value={editForm.itemCount ?? 0}
              onChange={(e) => setEditForm((f) => ({ ...f, itemCount: Number(e.target.value) }))}
            />
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
