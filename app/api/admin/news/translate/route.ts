import { NextResponse } from 'next/server'
export async function POST() { return NextResponse.json({error:'retired'},{status:410,headers:{'Cache-Control':'no-store'}}) }
