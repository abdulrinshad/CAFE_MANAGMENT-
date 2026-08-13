/**
 * Safely extracts the category name string regardless of backend response shape:
 * - string: "Coffee"
 * - object: { id: 1, name: "Coffee" } or { id: 1, title: "Coffee" }
 * - null / undefined
 */
export const getCategoryName = (category) => {
  if (typeof category === 'string') {
    return category
  }
  if (category && typeof category === 'object') {
    return category.name || category.title || category.category_name || ''
  }
  return ''
}

export const getCategorySlug = (category) => {
  return getCategoryName(category).toLowerCase()
}
