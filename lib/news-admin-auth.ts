import 'server-only'
// Retired with the website translation API. No administrator secret is read.
export function translationAdminAccess(_request:Request):'unauthorized' { return 'unauthorized' }
