/*
 * Packages the encrypted prototypes bundle imports from the main app instead
 * of bundling its own copy (one React instance, one router context).
 */
export const SHARED_MODULES = ['react', 'react/jsx-runtime', 'react-dom', 'react-router']
