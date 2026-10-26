// Website-side translation has been retired. Translations are separate Notion
// pages managed and published in the source database.
export class TranslationError extends Error { constructor(public code = 'disabled') { super(code) } }
export async function translateNews(_id:string):Promise<never> { throw new TranslationError() }
