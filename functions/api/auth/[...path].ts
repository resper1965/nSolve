// Pages Function for Auth API
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const path = pathname.replace('/api/auth/', '');
  
  const authUrl = `https://auth-service.ness.workers.dev/auth/${path}`;
  
  try {
    const response = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const path = pathname.replace('/api/auth/', '');
  
  const authUrl = `https://auth-service.ness.workers.dev/auth/${path}`;
  const body = await request.json();
  
  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
  }
}
